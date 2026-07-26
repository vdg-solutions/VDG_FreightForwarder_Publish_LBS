// FxRateDriveRepo — Drive I/O + WASM push/get/append for FX rates.
// Pattern: JS→WASM push (JS fetches Drive files, pushes content into WASM cache).
// F-29-11: full-history-per-pair prefetch so the resolver sees every range for
// gap-fallback (AC-03), honest not-found (AC-04) and the overlap check (AC-05).

import { parseJsonlBundle } from '../auth/drive-api.js';

const FX_RATE_BASE_PATH = '_shared/fx-rates';

export class FxRateDriveRepo {
  constructor(driveApi, findWorkspaceRootFn) {
    this._api               = driveApi;
    this._findRoot          = findWorkspaceRootFn;
    this._loadedMonths      = new Set();
    this._fullHistoryLoaded = false;   // set once all months listed+ingested this session
    this._fxFolderId        = null;    // cached ID for _shared/fx-rates/
    this._fileIds           = new Map();  // ym → { id, etag }
  }

  /// Load full history for the pair, push to WASM, call fx_rate_get.
  async getRate(dateStr, pair) {
    const wasm = window.__vdg_wasm;
    if (!wasm?.fx_rate_get) throw new Error('WASM not ready');
    await this._ensureAllMonthsLoaded(pair);
    try {
      return wasm.fx_rate_get(dateStr, pair);
    } catch (err) {
      throw new Error(`FxRateNotFound: ${err.message}`);
    }
  }

  /// Validate + write-gate + queue via WASM, then append each pending line to Drive.
  async appendRate(entryJson, role) {
    const wasm = window.__vdg_wasm;
    if (!wasm?.fx_rate_prepare_append) throw new Error('WASM not ready');
    const pair = JSON.parse(entryJson).pair ?? '';
    // wasm overlap check must see the whole set
    if (pair) await this._ensureAllMonthsLoaded(pair);
    const writes = wasm.fx_rate_prepare_append(entryJson, role);
    for (const { path, line } of writes) {
      await this._appendToDrive(path, line);
    }
    const ym = (JSON.parse(entryJson).valid_from ?? '').slice(0, 7);
    if (ym) this.invalidateMonth(ym);
  }

  /// Invalidate JS-side month cache (e.g. after external write).
  invalidateMonth(ym) {
    this._loadedMonths.delete(ym);
    this._fileIds.delete(ym);
    this._fullHistoryLoaded = false;
  }

  /// Parse month JSONL from Drive; returns raw entry objects (no WASM).
  async listByMonth(ym) {
    const content = await this._readDriveMonth(ym);
    return parseJsonlBundle(content);
  }

  /// Parse every month JSONL under the fx-rates folder; returns all entries.
  async listAll() {
    const out = [];
    for (const ym of await this._listMonthKeys()) {
      out.push(...await this.listByMonth(ym));
    }
    return out;
  }

  /// Read month JSONL → filter out entry by full range key → rewrite full file.
  async deleteEntry(validFrom, validTo, pair) {
    const ym      = validFrom.slice(0, 7);
    const content = await this._readDriveMonth(ym);
    const lines   = content.split('\n').filter((l) => l.trim());
    const kept    = lines.filter((l) => {
      try {
        const e = JSON.parse(l);
        return !(e.valid_from === validFrom && e.valid_to === validTo && e.pair === pair);
      } catch { return true; /* corrupt JSONL line — keep it (conservative) */ }
    });
    await this._rewriteDriveMonth(ym, kept.length ? kept.join('\n') + '\n' : '');
    this.invalidateMonth(ym);
  }

  // ── private ──────────────────────────────────────────────────────────────────

  async _ensureAllMonthsLoaded(_pair) {
    if (this._fullHistoryLoaded) return;
    for (const ym of await this._listMonthKeys()) {
      await this._ensureMonthLoaded(ym);
    }
    this._fullHistoryLoaded = true;
  }

  async _ensureMonthLoaded(ym) {
    if (this._loadedMonths.has(ym)) return;
    const wasm = window.__vdg_wasm;
    wasm.fx_rate_ingest_month(ym, await this._readDriveMonth(ym));
    this._loadedMonths.add(ym);
  }

  /// List every `YYYY-MM` month file present under the fx-rates folder.
  async _listMonthKeys() {
    const folderId = await this._ensureFxRateFolder();
    const q   = `'${folderId}' in parents and trashed=false`;
    const res = await this._api.driveFetch(
      'GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`,
    );
    const keys = [];
    for (const f of res?.files ?? []) {
      const m = /^(\d{4}-\d{2})\.jsonl$/.exec(f.name);
      if (m) { keys.push(m[1]); this._fileIds.set(m[1], { id: f.id, etag: null }); }
    }
    return keys;
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
