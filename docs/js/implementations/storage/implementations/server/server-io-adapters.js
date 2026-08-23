// server-io-adapters.js — the IO port with CharterDB as the storage authority.
//
// Same contract as WasmIoPort/StoreIoPort (the wasm stores cannot tell), backed by CharterDB:
// - Collection is the folder / kind path (e.g. users/NV01/shipments, _shared/error-log)
// - Record id is the file / period name (e.g. 2026-08.jsonl, settings.json)
// - Content is stored with CharterDB's etag CAS and resumable sequence change feed.

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
const CAS_FAILED_MSG         = '412 Precondition Failed'; // string the wasm stores' retry loops match

function asDriveError(err) {
  if (err instanceof ApiError) {
    return new DriveApiError(err.status, err.message);
  }
  return err;
}

export class ServerIoPort extends SharedIoPort {
  constructor(driveApi, userEmail, fork = null) {
    super(userEmail);
    this.driveApi = driveApi;
    this.folderIds = new Map();
    this._folderKind = new Map();
    this._fork = fork || forkId(userEmail);
    this._dirIds = new Map();
    this._folderPath = new Map();
  }

  // ── where things live ─────────────────────────────────────────────────────

  _kindPath(kind) {
    return KIND_PATH_OVERRIDES[kind] ?? `${USERS_PATH}/${this._fork}/${kind}`;
  }

  _normPath(path) {
    return String(path || '').replace(/^\/+|\/+$/g, '') || 'root';
  }

  async _resolveDir(dirPath) {
    const path = this._normPath(dirPath);
    this._dirIds.set(path, path);
    this._folderPath.set(path, path);
    return path;
  }

  async _resolveFolder(kind) {
    if (this.folderIds.has(kind)) return this.folderIds.get(kind);
    const id = this._normPath(this._kindPath(kind));
    this.folderIds.set(kind, id);
    this._folderKind.set(id, kind);
    return id;
  }

  async _resolveFromManifest(kind) { return this._resolveFolder(kind); }
  async _resolveDirFromManifest(dirPath) { return this._resolveDir(dirPath); }
  async _ensureNestedFolder(rootId, path) {
    const base = this._folderPath.get(rootId);
    return this._resolveDir(base ? `${base}/${path}` : path);
  }

  // ── bundles (period files) ────────────────────────────────────────────────

  _bundleName(kind, period) {
    return kind === USER_AUDIT_LOG_KIND ? USER_AUDIT_LOG_FILE : `${period}${BUNDLE_EXT}`;
  }

  async drive_read_bundle(kind, period) {
    const fileName = this._bundleName(kind, period);
    const folderId = await this._resolveFolder(kind);
    try {
      const res = await apiFetch('GET', `/records/${encodeURIComponent(folderId)}/${encodeURIComponent(fileName)}`);
      const r = res;
      if (!r?.id) return { etag: null, content: '', fileId: null, folderId, fileName };
      return { etag: r.etag, content: r.content, fileId: r.id, folderId, fileName };
    } catch (err) {
      if (err instanceof ApiError && err.status === HTTP_NOT_FOUND) {
        return { etag: null, content: '', fileId: null, folderId, fileName };
      }
      throw asDriveError(err);
    }
  }

  async drive_write_bundle(kind, period, newContent, etag) {
    const fileName = this._bundleName(kind, period);
    const folderId = await this._resolveFolder(kind);
    const result = await this._write(folderId, fileName, newContent, null, etag);
    return { etag: result.etag };
  }

  async drive_list_bundles(kind) {
    const folderId = await this._resolveFolder(kind);
    try {
      const res = await apiFetch('GET', `/records/${encodeURIComponent(folderId)}`);
      const records = res?.records ?? [];
      const files = records.map((r) => ({ id: r.id, name: r.id, version: String(r.version), modifiedTime: '' }));
      return { folderId, files };
    } catch (err) {
      if (err instanceof ApiError && err.status === HTTP_NOT_FOUND) {
        return { folderId, files: [] };
      }
      throw asDriveError(err);
    }
  }

  async drive_read_file(fileId) {
    let col = 'root', id = fileId;
    if (fileId.includes('/')) {
      const idx = fileId.lastIndexOf('/');
      col = fileId.slice(0, idx);
      id = fileId.slice(idx + 1);
    }
    try {
      const res = await apiFetch('GET', `/records/${encodeURIComponent(col)}/${encodeURIComponent(id)}`);
      const r = res;
      if (!r?.id) return { found: false, content: '', etag: null };
      return { found: true, content: r.content, etag: r.etag };
    } catch (err) {
      if (err instanceof ApiError && err.status === HTTP_NOT_FOUND) {
        return { found: false, content: '', etag: null };
      }
      throw asDriveError(err);
    }
  }

  async drive_changes(pageToken) {
    try {
      const since = pageToken || '0';
      const res = await apiFetch('GET', `/changes?since=${encodeURIComponent(since)}`);
      const changes = (res?.results ?? []).map((c) => ({
        file: {
          id: c.id,
          name: c.id,
          version: String(c.version),
          parents: [c.collection],
        },
        removed: c.event === 'removed',
        fileId: c.id,
        changeType: 'file',
        time: '',
      }));
      return { newStartPageToken: res?.next_cursor || since, changes };
    } catch (err) {
      throw asDriveError(err);
    }
  }

  async drive_start_page_token() {
    try {
      const res = await apiFetch('GET', '/changes/start');
      return { startPageToken: res?.next_cursor || '0' };
    } catch (err) {
      throw asDriveError(err);
    }
  }

  async drive_folder_kind(folderId) {
    return this._folderKind.get(folderId) ?? null;
  }

  // ── path-addressed workspace files ────────────────────────────────────────

  async ws_list_dir(dirPath) {
    const folderId = await this._resolveDir(dirPath);
    try {
      const res = await apiFetch('GET', `/records/${encodeURIComponent(folderId)}`);
      const records = res?.records ?? [];
      return {
        folderId,
        files: records.map((r) => ({
          id: r.id, name: r.id, version: String(r.version), mimeType: '',
        })),
      };
    } catch (err) {
      if (err instanceof ApiError && err.status === HTTP_NOT_FOUND) {
        return { folderId, files: [] };
      }
      throw asDriveError(err);
    }
  }

  async ws_read_file(dirPath, fileName) {
    const folderId = await this._resolveDir(dirPath);
    try {
      const res = await apiFetch('GET', `/records/${encodeURIComponent(folderId)}/${encodeURIComponent(fileName)}`);
      const r = res?.record;
      if (!r) return { found: false, id: null, etag: null, content: '' };
      return { found: true, id: r.id, etag: r.etag ?? null, content: r.content ?? '' };
    } catch (err) {
      if (err instanceof ApiError && err.status === HTTP_NOT_FOUND) {
        return { found: false, id: null, etag: null, content: '' };
      }
      throw asDriveError(err);
    }
  }

  async ws_write_file(dirPath, fileName, content, fileId, etag) {
    const folderId = await this._resolveDir(dirPath);
    const result = await this._write(folderId, fileName, content, fileId || null, etag || '');
    return { id: fileName, etag: result.etag ?? null };
  }

  async ws_delete_file(fileId) {
    let col = 'root', id = fileId;
    if (fileId.includes('/')) {
      const idx = fileId.lastIndexOf('/');
      col = fileId.slice(0, idx);
      id = fileId.slice(idx + 1);
    }
    try {
      await apiFetch('DELETE', `/records/${encodeURIComponent(col)}/${encodeURIComponent(id)}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === HTTP_NOT_FOUND) return null;
      throw asDriveError(err);
    }
    return null;
  }

  // ── wire ──────────────────────────────────────────────────────────────────

  async _read(fileId) {
    return this.drive_read_file(fileId);
  }

  async _write(folderId, name, content, fileId, etag) {
    const owner = this.userEmail;
    try {
      if (etag) {
        const res = await apiFetch(
          'PUT',
          `/records/${encodeURIComponent(folderId)}/${encodeURIComponent(name)}`,
          { content },
          { 'If-Match': etag }
        );
        return { id: name, etag: res?.etag };
      }
      try {
        const res = await apiFetch(
          'POST',
          `/records/${encodeURIComponent(folderId)}`,
          { id: name, content, owner }
        );
        return { id: name, etag: res?.etag };
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          const res = await apiFetch(
            'PUT',
            `/records/${encodeURIComponent(folderId)}/${encodeURIComponent(name)}`,
            { content }
          );
          return { id: name, etag: res?.etag };
        }
        throw err;
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === HTTP_PRECONDITION) throw new Error(CAS_FAILED_MSG);
      throw asDriveError(err);
    }
  }
}
