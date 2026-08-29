import { SharedIoPort } from '../../core_abstractions/io-port-shared.js';
import { KIND_PATH_OVERRIDES } from '../../core_abstractions/storage-layout.js';
import { apiFetch } from '../../core_abstractions/backend.js';
import { ApiError } from '../../core_abstractions/api-error.js';

const HTTP_NOT_FOUND         = 404;
const HTTP_PRECONDITION      = 412;
const CAS_FAILED_MSG         = '412 Precondition Failed';

export class ServerIoPort extends SharedIoPort {
  // `fork` accepted for call-site compatibility (createIoPort passes one) but unused: it only
  // ever fed document_collection_kind's users/{fork}/{kind} prefix-strip, which had no caller
  // left once the change feed started reporting `collection` directly (CDB-CF-03) instead of a
  // folder id needing that reverse lookup.
  constructor(serverApi, userEmail, _fork = null) {
    super(userEmail);
    this.serverApi = serverApi;
  }

  // ── Native CharterDB API ──────────────────────────────────────────────────

  async record_read(collection, id) {
    try {
      const res = await apiFetch('GET', `/records/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`);
      if (!res?.id) return { found: false, content: '', etag: null, version: null, owner: null };
      // owner alongside etag/version: RecordDto (server) already carries it (CDB-DM-04) -- dropping
      // it here was the gap that made TransportPort::fetch_record unable to deliver the one thing
      // its own doc comment already promised ("the server-authoritative owner").
      return { found: true, content: res.content ?? '', etag: res.etag ?? null, version: res.version, owner: res.owner ?? null };
    } catch (err) {
      if (err instanceof ApiError && err.status === HTTP_NOT_FOUND) {
        return { found: false, content: '', etag: null, version: null, owner: null };
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

  // CDB-Q-02, param order matches TransportPort::list_records(collection, owner, cursor, limit)
  // 1:1 -- `ws_list_dir` below calls this with only `collection` (every default applies) so its
  // own single-page, unfiltered listing is unaffected by this order.
  async record_list(collection, owner = null, cursor = null, limit = 1000) {
    const path = this._normPath(collection);
    try {
      let url = `/records/${encodeURIComponent(path)}?limit=${limit}`;
      if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
      if (owner) url += `&owner=${encodeURIComponent(owner)}`;
      const res = await apiFetch('GET', url);
      // has_more alongside next_cursor: CDB-Q-12 states it explicitly (a filtered page can read
      // empty while more still exists) -- TransportPort::list_records needs it, not a caller
      // guessing "done" from records.length < limit the way the old ws_list_dir path did.
      return { records: res?.records ?? [], next_cursor: res?.next_cursor ?? null, has_more: res?.has_more ?? false };
    } catch (err) {
      if (err instanceof ApiError && err.status === HTTP_NOT_FOUND) {
        return { records: [], next_cursor: null, has_more: false };
      }
      throw err;
    }
  }

  async changes(since = '0', limit = null, includeContent = false) {
    let url = `/changes?since=${encodeURIComponent(since)}`;
    if (limit) url += `&limit=${limit}`;
    if (includeContent) url += '&include_content=true';
    const res = await apiFetch('GET', url);
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
    // CharterDB: flat collections — no user fork hierarchy
    return KIND_PATH_OVERRIDES[kind] ?? kind;
  }

  _normPath(path) {
    return String(path || '').replace(/^\/+|\/+$/g, '');
  }

  // document_read/document_write/document_list/document_read_file (the bundle grain's period-file
  // API, and the per-record fetch that briefly replaced it) are gone with
  // sync_bundle/pull_kind_by_listing and sync_delta.rs's move onto TransportPort (ws_read_file,
  // via fetch_record) on the Rust side — every registered kind is per-record now
  // (cache_policy::PER_RECORD_REGISTRY).

  _parseFileId(fileId) {
    const norm = String(fileId || '').replace(/\/+/g, '/');
    if (!norm.includes('/')) return { col: '', id: norm };
    const idx = norm.lastIndexOf('/');
    return { col: norm.slice(0, idx), id: norm.slice(idx + 1) };
  }

  // F-58-02: poll_health() used to fire here too — once per Changes page, roughly doubling the
  // delta engine's HTTP volume for a signal nobody needed at that cadence. The read routes
  // (RecordGet/RecordList/Changes) carry no x-replication-backlog header (only RecordCreate/
  // RecordUpdate stamp it — server/src/bootstrap/edge/dispatch.rs), so the read-only sync path
  // never saw it that way either. Health now polls on its own slow timer (sync-schedulers.js
  // startHealthPoll) instead of riding every page fetch.
  // CDB-CF-03/CF-15: CharterDB already reports collection/id/owner/version/event and (per
  // CDB-CF-15) whether the caller has caught up on every /changes page — passed straight through,
  // raw, so TransportPort::fetch_changes (charter_transport_bridge.rs) does the one real shaping
  // this deserves, not a JS-side re-derivation that used to collapse the event into a bare
  // `removed` boolean and drop `owner` entirely.
  async changes_feed(pageToken, limit, includeContent) {
    return this.changes(pageToken || '0', limit, includeContent);
  }

  async changes_cursor() {
    const cursor = await this.start_cursor();
    return { cursor };
  }

  // ── path-addressed workspace files ────────────────────────────────────────

  async ws_list_dir(dirPath) {
    const collection = this._normPath(dirPath);
    const res = await this.record_list(collection);
    return {
      files: res.records.map((r) => ({
        id: `${collection}/${r.id}`, name: r.id, version: String(r.version),
      })),
    };
  }

  async ws_read_file(dirPath, fileName) {
    const collection = this._normPath(dirPath);
    const r = await this.record_read(collection, fileName);
    if (!r.found) return { found: false, id: null, etag: null, version: null, owner: null, content: '' };
    // version/owner alongside etag: record_read already computes both (ws_list_dir already
    // surfaces version for the SAME underlying record) -- TransportPort::fetch_record needs
    // them to build a Record, and re-deriving either from a re-parse of `content` would be
    // exactly the "one fact, two derivations" collapse this session has been unpicking elsewhere.
    return { found: true, id: `${collection}/${fileName}`, etag: r.etag, version: r.version, owner: r.owner, content: r.content };
  }

  async ws_write_file(dirPath, fileName, content, fileId, etag) {
    const collection = this._normPath(dirPath);
    const r = await this.record_write(collection, fileName, content, etag);
    // version alongside etag -- same gap, same fix as ws_read_file just above: record_write
    // already computes it (CDB-CON-05's post-push confirmation), TransportPort::push_record
    // needs the real server-confirmed number, not a value this adapter would otherwise have to
    // fabricate.
    return { id: fileName, etag: r.etag, version: r.version };
  }

  async ws_delete_file(fileId) {
    const { col, id } = this._parseFileId(fileId);
    await this.record_delete(col, id);
    return null;
  }
}
