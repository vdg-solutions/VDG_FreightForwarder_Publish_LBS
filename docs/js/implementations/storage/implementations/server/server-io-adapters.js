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
const CAS_FAILED_MSG         = '412 Precondition Failed';

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
    this._fork = fork || forkId(userEmail);
  }

  // ── Native CharterDB API ──────────────────────────────────────────────────

  async record_read(collection, id) {
    try {
      const res = await apiFetch('GET', `/records/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`);
      if (!res?.id) return { found: false, content: '', etag: null, version: null };
      return { found: true, content: res.content ?? '', etag: res.etag ?? null, version: res.version };
    } catch (err) {
      if (err instanceof ApiError && err.status === HTTP_NOT_FOUND) {
        return { found: false, content: '', etag: null, version: null };
      }
      throw err;
    }
  }

  async record_write(collection, id, content, etag = null) {
    const owner = this.userEmail;
    try {
      if (etag) {
        const res = await apiFetch(
          'PUT',
          `/records/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`,
          { content },
          { 'If-Match': etag }
        );
        return { id: res.id, etag: res.etag, version: res.version };
      }
      try {
        const res = await apiFetch(
          'POST',
          `/records/${encodeURIComponent(collection)}`,
          { id, content, owner }
        );
        return { id: res.id, etag: res.etag, version: res.version };
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          const res = await apiFetch(
            'PUT',
            `/records/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`,
            { content }
          );
          return { id: res.id, etag: res.etag, version: res.version };
        }
        throw err;
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === HTTP_PRECONDITION) throw new Error(CAS_FAILED_MSG);
      throw err;
    }
  }

  async record_delete(collection, id) {
    try {
      await apiFetch('DELETE', `/records/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === HTTP_NOT_FOUND) return false;
      throw err;
    }
  }

  async record_list(collection, limit = 1000, cursor = null) {
    try {
      let url = `/records/${encodeURIComponent(collection)}?limit=${limit}`;
      if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
      const res = await apiFetch('GET', url);
      return { records: res?.records ?? [], next_cursor: res?.next_cursor };
    } catch (err) {
      if (err instanceof ApiError && err.status === HTTP_NOT_FOUND) {
        return { records: [], next_cursor: null };
      }
      throw err;
    }
  }

  async changes(since = '0') {
    const res = await apiFetch('GET', `/changes?since=${encodeURIComponent(since)}`);
    return res;
  }

  async start_cursor() {
    const res = await apiFetch('GET', '/changes/start');
    return res?.next_cursor || '0';
  }

  async poll_health() {
    try {
      const res = await apiFetch('GET', '/health');
      if (res && typeof window !== 'undefined') {
        const backlog_depth = res.mirror?.backlog_depth ?? res.replication_backlog ?? 0;
        const oldest_pending_age_ms = res.mirror?.oldest_pending_age_ms ?? null;
        const provider = res.mirror?.provider ?? res.secondary_provider ?? 'Google Drive';
        window.dispatchEvent(new CustomEvent('vdg:server-health', {
          detail: {
            backlog_depth,
            oldest_pending_age_ms,
            provider,
          },
        }));
      }
      return res;
    } catch {
      return null;
    }
  }

  // ── where things live ─────────────────────────────────────────────────────

  _kindPath(kind) {
    return KIND_PATH_OVERRIDES[kind] ?? `${USERS_PATH}/${this._fork}/${kind}`;
  }

  _normPath(path) {
    return String(path || '').replace(/^\/+|\/+$/g, '');
  }

  // ── documents (period files) ────────────────────────────────────────────────
  
  _bundleName(kind, period) {
    return kind === USER_AUDIT_LOG_KIND ? USER_AUDIT_LOG_FILE : `${period}${BUNDLE_EXT}`;
  }

  async document_read(kind, period) {
    const fileName = this._bundleName(kind, period);
    const collection = this._kindPath(kind);
    try {
      const r = await this.record_read(collection, fileName);
      if (!r.found) return { etag: null, content: '', fileId: null, folderId: collection, fileName };
      return { etag: r.etag, content: r.content, fileId: `${collection}/${fileName}`, folderId: collection, fileName };
    } catch (err) {
      throw asDriveError(err);
    }
  }

  async document_write(kind, period, newContent, etag) {
    const fileName = this._bundleName(kind, period);
    const collection = this._kindPath(kind);
    try {
      const r = await this.record_write(collection, fileName, newContent, etag);
      return { etag: r.etag };
    } catch (err) {
      throw asDriveError(err);
    }
  }

  async document_list(kind) {
    const collection = this._kindPath(kind);
    try {
      const res = await this.record_list(collection);
      const files = res.records.map((r) => ({ id: `${collection}/${r.id}`, name: r.id, version: String(r.version), modifiedTime: '' }));
      return { folderId: collection, files };
    } catch (err) {
      throw asDriveError(err);
    }
  }

  _parseFileId(fileId) {
    const norm = String(fileId || '').replace(/\/+/g, '/');
    if (!norm.includes('/')) return { col: '', id: norm };
    const idx = norm.lastIndexOf('/');
    return { col: norm.slice(0, idx), id: norm.slice(idx + 1) };
  }

  async document_read_file(fileId) {
    const { col, id } = this._parseFileId(fileId);
    try {
      const r = await this.record_read(col, id);
      return { found: r.found, content: r.content, etag: r.etag };
    } catch (err) {
      throw asDriveError(err);
    }
  }

  async changes_feed(pageToken) {
    try {
      this.poll_health().catch(() => {});
      const res = await this.changes(pageToken || '0');
      const changes = (res?.results ?? []).map((c) => ({
        file: {
          id: `${c.collection}/${c.id}`,
          name: c.id,
          version: String(c.version),
          parents: [c.collection],
        },
        removed: c.event === 'removed',
        fileId: `${c.collection}/${c.id}`,
        changeType: 'file',
        time: '',
      }));
      return { newStartPageToken: res?.next_cursor || pageToken || '0', changes };
    } catch (err) {
      throw asDriveError(err);
    }
  }

  async changes_cursor() {
    try {
      const token = await this.start_cursor();
      return { startPageToken: token };
    } catch (err) {
      throw asDriveError(err);
    }
  }

  async document_collection_kind(folderId) {
    // If the folderId matches a known path override, return that
    for (const [k, p] of Object.entries(KIND_PATH_OVERRIDES)) {
      if (p === folderId) return k;
    }
    // Otherwise it's users/fork/kind
    const prefix = `${USERS_PATH}/${this._fork}/`;
    if (folderId.startsWith(prefix)) return folderId.slice(prefix.length);
    return null;
  }

  async document_target(kind, period) {
    return { folderId: this._kindPath(kind), fileName: this._bundleName(kind, period) };
  }

  // ── path-addressed workspace files ────────────────────────────────────────

  async ws_list_dir(dirPath) {
    const collection = this._normPath(dirPath);
    try {
      const res = await this.record_list(collection);
      return {
        folderId: collection,
        files: res.records.map((r) => ({
          id: `${collection}/${r.id}`, name: r.id, version: String(r.version), mimeType: '',
        })),
      };
    } catch (err) {
      throw asDriveError(err);
    }
  }

  async ws_read_file(dirPath, fileName) {
    const collection = this._normPath(dirPath);
    try {
      const r = await this.record_read(collection, fileName);
      if (!r.found) return { found: false, id: null, etag: null, content: '' };
      return { found: true, id: `${collection}/${fileName}`, etag: r.etag, content: r.content };
    } catch (err) {
      throw asDriveError(err);
    }
  }

  async ws_write_file(dirPath, fileName, content, fileId, etag) {
    const collection = this._normPath(dirPath);
    try {
      const r = await this.record_write(collection, fileName, content, etag);
      return { id: fileName, etag: r.etag };
    } catch (err) {
      throw asDriveError(err);
    }
  }

  async ws_delete_file(fileId) {
    const { col, id } = this._parseFileId(fileId);
    try {
      await this.record_delete(col, id);
      return null;
    } catch (err) {
      throw asDriveError(err);
    }
  }
}
