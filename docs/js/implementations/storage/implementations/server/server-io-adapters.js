// server-io-adapters.js — the IO port with vdg-server as the storage authority.
//
// Same contract as WasmIoPort/StoreIoPort (the wasm stores cannot tell), a different wire: paths
// resolve to server folder ids over /api/ws/dir, files read/write with the server's etag CAS, and
// the delta engine's change feed comes from the server's change log in Drive's page shape. What
// disappears is everything that existed because Drive was the store — folder-index memo, duplicate
// bundle heal, manifest walking, the folder-id pin. The server has ONE name per folder by
// constraint and answers a path in one round trip.

import { SharedIoPort } from '../../core_abstractions/io-port-shared.js';
import { KIND_PATH_OVERRIDES, USERS_PATH } from '../../core_abstractions/storage-layout.js';
import { apiFetch } from '../../core_abstractions/backend.js';
import { ApiError } from '../../core_abstractions/api-error.js';
import { DriveApiError } from '../../core_abstractions/drive-errors.js';
import { forkId } from '../../../kernel/core_abstractions/util/fork-id.js';

const HTTP_NOT_FOUND         = 404;
const HTTP_PRECONDITION      = 412;
const USER_AUDIT_LOG_KIND    = 'user_audit_log';
const USER_AUDIT_LOG_FILE    = 'user-audit-log.jsonl';
const BUNDLE_EXT             = '.jsonl';
const CAS_FAILED_MSG         = '412 Precondition Failed'; // the string the wasm stores' retry loops match

/// The Drive-era callers branch on `err.status` and `err.name === 'DriveApiError'`; keep both true.
function asDriveError(err) {
  if (err instanceof ApiError) {
    const e = new DriveApiError(err.status, err.message);
    return e;
  }
  return err;
}

export class ServerIoPort extends SharedIoPort {
  constructor(driveApi, userEmail, fork = null) {
    super(userEmail);
    this.driveApi = driveApi;
    this.folderIds = new Map();
    this._folderKind = new Map();      // folderId -> kind: reverse map for the wasm delta engine
    this._fork = fork || forkId(userEmail);
    this._dirIds = new Map();     // path -> folderId, resolved once per session
    this._folderPath = new Map(); // folderId -> path (the reverse, for id-addressed listings)
  }

  // ── where things live ─────────────────────────────────────────────────────

  _kindPath(kind) {
    return KIND_PATH_OVERRIDES[kind] ?? `${USERS_PATH}/${this._fork}/${kind}`;
  }

  /// A path's folder id. Reads never create: a listing of a folder that does not exist is an
  /// empty listing (Drive answered the same — an empty files array), and creating on read is
  /// how every legacy path a migrator merely LOOKS at came into being and was trashed again,
  /// once per boot. Writes create (mkdir -p), which is what ensureNestedFolder did against Drive.
  /// Returns null when absent and not creating.
  async _resolveDir(dirPath, { create = false } = {}) {
    const path = String(dirPath).replace(/^\/+|\/+$/g, '');
    const hit = this._dirIds.get(path);
    if (hit) return hit;
    let res;
    try {
      res = await apiFetch('GET', `/ws/dir?path=${encodeURIComponent(path)}${create ? '&create=true' : ''}`);
    } catch (err) {
      if (!create && err instanceof ApiError && err.status === HTTP_NOT_FOUND) return null;
      throw asDriveError(err);
    }
    if (!res.folderId) return null; // absent (a read never creates) — nothing to memo, the next write creates it
    this._dirIds.set(path, res.folderId);
    this._folderPath.set(res.folderId, path);
    return res.folderId;
  }

  /// A kind's folder is where the kind WRITES, so it is created on first touch (create=true).
  async _resolveFolder(kind) {
    if (this.folderIds.has(kind)) return this.folderIds.get(kind);
    const id = await this._resolveDir(this._kindPath(kind), { create: true });
    this.folderIds.set(kind, id);
    this._folderKind.set(id, kind);
    return id;
  }

  async _resolveFromManifest(kind) { return this._resolveFolder(kind); }
  async _resolveDirFromManifest(dirPath) { return this._resolveDir(dirPath, { create: true }); }
  async _ensureNestedFolder(rootId, path) {
    const base = this._folderPath.get(rootId);
    return this._resolveDir(base ? `${base}/${path}` : path, { create: true });
  }

  async _listDir(dirPath) {
    try {
      return await apiFetch('GET', `/ws/dir?path=${encodeURIComponent(dirPath)}`);
    } catch (err) { throw asDriveError(err); }
  }

  async _listFolderById(folderId) {
    if (folderId === null) return { folderId: null, files: [] };
    const path = this._folderPath.get(folderId);
    if (path === undefined) throw new DriveApiError(HTTP_NOT_FOUND, `unknown folder ${folderId}`);
    return this._listDir(path);
  }

  // ── bundles (period files) ────────────────────────────────────────────────

  _bundleName(kind, period) {
    return kind === USER_AUDIT_LOG_KIND ? USER_AUDIT_LOG_FILE : `${period}${BUNDLE_EXT}`;
  }

  async drive_read_bundle(kind, period) {
    const fileName = this._bundleName(kind, period);
    const folderId = await this._resolveFolder(kind);
    const listing  = await this._listFolderById(folderId);
    const file     = (listing.files ?? []).find((f) => f.name === fileName && f.kind === 'file');
    if (!file) return { etag: null, content: '', fileId: null, folderId, fileName };
    const data = await this._read(file.id);
    return { etag: data.etag, content: data.content, fileId: file.id, folderId, fileName };
  }

  async drive_write_bundle(kind, period, newContent, etag) {
    const fileName = this._bundleName(kind, period);
    const folderId = await this._resolveFolder(kind);
    const listing  = await this._listFolderById(folderId);
    const file     = (listing.files ?? []).find((f) => f.name === fileName && f.kind === 'file');
    const result   = await this._write(folderId, fileName, newContent, file?.id ?? null, etag);
    return { etag: result.etag };
  }

  async drive_list_bundles(kind) {
    const folderId = await this._resolveFolder(kind);
    const listing  = await this._listFolderById(folderId);
    const files = (listing.files ?? []).filter((f) => f.kind === 'file')
      .map((f) => ({ id: f.id, name: f.name, version: String(f.version), modifiedTime: '' }));
    return { folderId, files };
  }

  async drive_read_file(fileId) {
    try {
      const data = await this._read(fileId);
      return { found: true, content: data.content, etag: data.etag };
    } catch (err) {
      if (err?.status === HTTP_NOT_FOUND) return { found: false, content: '', etag: null };
      throw err;
    }
  }

  async drive_changes(pageToken) {
    try { return await apiFetch('GET', `/ws/changes?pageToken=${encodeURIComponent(pageToken)}`); }
    catch (err) { throw asDriveError(err); }
  }

  async drive_start_page_token() {
    try { return await apiFetch('GET', '/ws/changes/start'); }
    catch (err) { throw asDriveError(err); }
  }

  /// F-46-01: the wasm delta engine's reverse lookup — never implemented for this backend, so
  /// every Changes-feed event fell into apply_change's "unknown parent" branch, kind-addressed
  /// folders included. `_folderKind` is filled by `_resolveFolder` the same way it always was;
  /// this was the missing read side.
  async drive_folder_kind(folderId) {
    return this._folderKind.get(folderId) ?? null;
  }

  // ── path-addressed workspace files ────────────────────────────────────────

  async ws_list_dir(dirPath) {
    const folderId = await this._resolveDir(dirPath);
    const listing  = await this._listFolderById(folderId);
    // Absent = null folder, empty files. Under Drive a listing CREATED the folder; here nothing
    // exists until something is written, and the migrators' folder-retire paths skip a null.
    return {
      folderId,
      files: (listing.files ?? []).map((f) => ({
        id: f.id, name: f.name, version: String(f.version), mimeType: f.mimeType ?? '',
      })),
    };
  }

  async ws_read_file(dirPath, fileName) {
    const folderId = await this._resolveDir(dirPath);
    const listing  = await this._listFolderById(folderId);
    const file     = (listing.files ?? []).find((f) => f.name === fileName && f.kind === 'file');
    if (!file) return { found: false, id: null, etag: null, content: '' };
    const data = await this._read(file.id);
    return { found: true, id: file.id, etag: data.etag ?? null, content: data.content ?? '' };
  }

  async ws_write_file(dirPath, fileName, content, fileId, etag) {
    const folderId = await this._resolveDir(dirPath, { create: true });
    const result   = await this._write(folderId, fileName, content, fileId || null, etag || '');
    return { id: result.id, etag: result.etag ?? null };
  }

  async ws_delete_file(fileId) {
    try { await apiFetch('DELETE', `/ws/nodes/${encodeURIComponent(fileId)}`); }
    catch (err) { throw asDriveError(err); }
    return null;
  }

  // ── wire ──────────────────────────────────────────────────────────────────

  async _read(fileId) {
    try { return await apiFetch('GET', `/ws/nodes/${encodeURIComponent(fileId)}`); }
    catch (err) { throw asDriveError(err); }
  }

  /// Create when there is no id, CAS-update when there is. A stale etag surfaces as the exact
  /// "412 Precondition Failed" the wasm stores retry on.
  async _write(folderId, name, content, fileId, etag) {
    try {
      if (fileId) {
        return await apiFetch('PUT', `/ws/nodes/${encodeURIComponent(fileId)}/content`, { content, etag: etag || '' });
      }
      return await apiFetch('POST', '/ws/nodes', { parentId: folderId, name, content });
    } catch (err) {
      if (err instanceof ApiError && err.status === HTTP_PRECONDITION) throw new Error(CAS_FAILED_MSG);
      throw asDriveError(err);
    }
  }
}
