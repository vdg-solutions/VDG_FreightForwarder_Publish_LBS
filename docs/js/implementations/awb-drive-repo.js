// AwbDriveRepo — Drive JSONL I/O for AWB documents.
// Pattern: mirrors FxRateDriveRepo (JS fetches Drive files, parses JSONL directly).

import { parseJsonlBundle } from '../auth/drive-api.js';

const AWB_BASE_PATH = '_shared/awbs';

export class AwbDriveRepo {
  constructor(driveApi, findWorkspaceRootFn) {
    this._api      = driveApi;
    this._findRoot = findWorkspaceRootFn;
    this._folderId = null;
    this._fileIds  = new Map(); // ym → { id, etag }
  }

  async listByMonth(ym) {
    const content = await this._readDriveMonth(ym);
    return parseJsonlBundle(content);
  }

  async append(awb) {
    const ym   = (awb.created_at ?? new Date().toISOString()).slice(0, 7);
    const line = JSON.stringify(awb);
    await this._appendToDrive(ym, line);
    this._fileIds.delete(ym);
  }

  async deleteByAwbNo(awbNo, ym) {
    const content = await this._readDriveMonth(ym);
    const kept    = content.split('\n').filter((l) => {
      if (!l.trim()) return false;
      try { return JSON.parse(l).awb_no !== awbNo; }
      catch { return true; /* keep corrupt lines conservative */ }
    });
    await this._rewriteDriveMonth(ym, kept.length ? kept.join('\n') + '\n' : '');
    this._fileIds.delete(ym);
  }

  // ── private ───────────────────────────────────────────────────────────────

  async _readDriveMonth(ym) {
    try {
      const info = await this._findMonthFile(ym);
      if (!info) return '';
      const data = await this._api.getFile(info.id);
      if (data?.etag) this._fileIds.set(ym, { id: info.id, etag: data.etag });
      return data?.content ?? '';
    } catch { return ''; /* file absent */ }
  }

  async _appendToDrive(ym, line) {
    const existing = await this._readDriveMonth(ym);
    await this._rewriteDriveMonth(ym, existing + line + '\n');
  }

  async _rewriteDriveMonth(ym, content) {
    const folderId = await this._ensureAwbFolder();
    const fileName = `${ym}.jsonl`;
    const cached   = this._fileIds.get(ym);
    const result   = cached?.id
      ? await this._api.uploadFile(cached.id, fileName, content, cached.etag, { isUpdate: true })
      : await this._api.uploadFile(folderId, fileName, content, null);
    this._fileIds.set(ym, { id: result.id, etag: result.etag });
  }

  async _ensureAwbFolder() {
    if (this._folderId) return this._folderId;
    const root = await this._findRoot();
    if (!root) throw new Error('Workspace root not found');
    const [sharedName, awbName] = AWB_BASE_PATH.split('/');
    const shared = await this._api.getOrCreateFolder(root, sharedName);
    const awbDir = await this._api.getOrCreateFolder(shared.id, awbName);
    this._folderId = awbDir.id;
    return this._folderId;
  }

  async _findMonthFile(ym) {
    if (this._fileIds.has(ym)) return this._fileIds.get(ym);
    const folderId = await this._ensureAwbFolder();
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
