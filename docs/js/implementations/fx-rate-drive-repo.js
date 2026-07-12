// FxRateDriveRepo — Drive I/O + WASM push/get/append for FX rates.
// Pattern: JS→WASM push (JS fetches Drive files, pushes content into WASM cache).

import { parseJsonlBundle } from '../auth/drive-api.js';

const FX_RATE_BASE_PATH = '_shared/fx-rates';
const FX_PAIR_DEFAULT   = 'USD/VND';
const FALLBACK_MONTHS   = 2; // prior months JS pre-fetches for fallback

export class FxRateDriveRepo {
  constructor(driveApi, findWorkspaceRootFn) {
    this._api          = driveApi;
    this._findRoot     = findWorkspaceRootFn;
    this._loadedMonths = new Set();
    this._fxFolderId   = null;       // cached ID for _shared/fx-rates/
    this._fileIds      = new Map();  // ym → { id, etag }
  }

  /// Pre-fetch relevant months, push to WASM, call fx_rate_get.
  async getRate(dateStr, pair) {
    const wasm = window.__vdg_wasm;
    if (!wasm?.fx_rate_get) throw new Error('WASM not ready');
    await this._ensureMonthsLoaded(dateStr);
    try {
      return wasm.fx_rate_get(dateStr, pair);
    } catch (err) {
      throw new Error(`FxRateNotFound: ${err.message}`);
    }
  }

  /// Validate + queue write via WASM, then append each pending line to Drive.
  async appendRate(entryJson) {
    const wasm = window.__vdg_wasm;
    if (!wasm?.fx_rate_prepare_append) throw new Error('WASM not ready');
    const writes = wasm.fx_rate_prepare_append(entryJson);
    for (const { path, line } of writes) {
      await this._appendToDrive(path, line);
    }
    const date = JSON.parse(entryJson).date ?? '';
    const ym   = date.slice(0, 7);
    if (ym) this.invalidateMonth(ym);
  }

  /// Invalidate JS-side month cache (e.g. after external write).
  invalidateMonth(ym) {
    this._loadedMonths.delete(ym);
    this._fileIds.delete(ym);
  }

  /// Parse month JSONL from Drive; returns raw entry objects (no WASM).
  async listByMonth(ym) {
    const content = await this._readDriveMonth(ym);
    return parseJsonlBundle(content);
  }

  /// True if any entry matches dateStr + pair in the cached month file.
  async exists(dateStr, pair) {
    const ym      = dateStr.slice(0, 7);
    const entries = await this.listByMonth(ym);
    return entries.some((e) => e.date === dateStr && e.pair === pair);
  }

  /// Read month JSONL → filter out entry → rewrite full file via Drive API.
  /// Invalidates JS month cache after write.
  async deleteEntry(dateStr, pair) {
    const ym      = dateStr.slice(0, 7);
    const content = await this._readDriveMonth(ym);
    const lines   = content.split('\n').filter((l) => l.trim());
    const kept    = lines.filter((l) => {
      try { const e = JSON.parse(l); return !(e.date === dateStr && e.pair === pair); }
      catch { return true; /* corrupt JSONL line — keep it (conservative) */ }
    });
    await this._rewriteDriveMonth(ym, kept.length ? kept.join('\n') + '\n' : '');
    this.invalidateMonth(ym);
  }

  // ── private ──────────────────────────────────────────────────────────────────

  async _ensureMonthsLoaded(dateStr) {
    const [year, month] = dateStr.split('-').map(Number);
    for (let i = 0; i <= FALLBACK_MONTHS; i++) {
      let m = month - i;
      let y = year;
      while (m < 1) { m = m + 12; y = y - 1; }
      await this._ensureMonthLoaded(`${y}-${String(m).padStart(2, '0')}`);
    }
  }

  async _ensureMonthLoaded(ym) {
    if (this._loadedMonths.has(ym)) return;
    const wasm = window.__vdg_wasm;
    wasm.fx_rate_ingest_month(ym, await this._readDriveMonth(ym));
    this._loadedMonths.add(ym);
  }

  /// Returns file content string, '' on 404/missing.
  async _readDriveMonth(ym) {
    try {
      const fileInfo = await this._findMonthFile(ym);
      if (!fileInfo) return '';
      const data = await this._api.getFile(fileInfo.id);
      if (data?.etag) this._fileIds.set(ym, { id: fileInfo.id, etag: data.etag });
      return data?.content ?? '';
    } catch { return ''; /* file absent */ }
  }

  /// Append a single line to the month file (read + append + rewrite).
  async _appendToDrive(path, line) {
    // path = "_shared/fx-rates/YYYY-MM.jsonl"
    const ym = path.split('/').pop().slice(0, 7);
    await this._rewriteDriveMonth(ym, await this._readDriveMonth(ym) + line + '\n');
  }

  /// Overwrite JSONL file at _shared/fx-rates/<ym>.jsonl.
  async _rewriteDriveMonth(ym, content) {
    const folderId = await this._ensureFxRateFolder();
    const fileName = `${ym}.jsonl`;
    const cached   = this._fileIds.get(ym);
    const result   = cached?.id
      ? await this._api.uploadFile(cached.id, fileName, content, cached.etag, { isUpdate: true })
      : await this._api.uploadFile(folderId, fileName, content, null);
    this._fileIds.set(ym, { id: result.id, etag: result.etag });
  }

  /// Find/create _shared/fx-rates/ folder under workspace root.
  async _ensureFxRateFolder() {
    if (this._fxFolderId) return this._fxFolderId;
    const root = await this._findRoot();
    if (!root) throw new Error('Workspace root not found');
    const [sharedName, fxName] = FX_RATE_BASE_PATH.split('/');
    const shared = await this._api.getOrCreateFolder(root, sharedName);
    const fxDir  = await this._api.getOrCreateFolder(shared.id, fxName);
    this._fxFolderId = fxDir.id;
    return this._fxFolderId;
  }

  /// Find `<ym>.jsonl` file in fx-rate folder; returns { id, etag } or null.
  async _findMonthFile(ym) {
    if (this._fileIds.has(ym)) return this._fileIds.get(ym);
    const folderId = await this._ensureFxRateFolder();
    const q   = `name='${ym}.jsonl' and '${folderId}' in parents and trashed=false`;
    const res = await this._api.driveFetch(
      'GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`,
    );
    const entry = res?.files?.[0] ?? null;
    if (!entry) return null;
    const info = { id: entry.id, etag: null };
    this._fileIds.set(ym, info);
    return info;
  }
}
