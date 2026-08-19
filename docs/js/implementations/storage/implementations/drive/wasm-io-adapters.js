// wasm-io-adapters.js — the IO port the Rust wasm calls, with Google Drive as the storage
// authority: bundles and workspace files live in Drive folders reached through the Drive-shaped
// tree api (`driveApi`, the bound storage-api object the bootstrap hands in); the cache/event/
// identity/ledger half is SharedIoPort's. Where a kind or a path lives is the folder-resolve
// port's question; duplicate same-name bundles heal through the bundle-heal port.

import { SharedIoPort } from '../../core_abstractions/io-port-shared.js';
import { healDuplicateBundle } from '../../core_abstractions/bundle-heal.js';
import { resolveFolder, resolveFromManifest, ensureNestedFolder,
  resolveDir, resolveDirFromManifest } from '../../core_abstractions/folder-resolve.js';

export class WasmIoPort extends SharedIoPort {
  // `db` is the retired IDB handle — kept in the signature so every constructor site and test
  // stays byte-identical; storage lives in the local-store port (SQLite worker).
  constructor(db, driveApi, userEmail) {
    super(userEmail);
    this.db = db;
    this.driveApi = driveApi;
    this.folderIds = new Map();
    this.fileIndex = new Map();        // folderId -> Map(fileName -> fileId): folder listed once
    this._folderKind = new Map();      // folderId -> kind: reverse map for the wasm delta engine
    this._listingInflight = new Map(); // folderId -> in-flight listing promise (dedupe concurrency)
    this._pathSegment = new Map();     // `${parentId}/${name}` -> folderId: resolve each nested segment ONCE
    this._segInflight = new Map();     // same key -> in-flight getOrCreateFolder (dedupe concurrent boot migrators)
  }

  // List a folder's files ONCE and cache name->id. A per-period bundle read used to fire a
  // `name='<period>.jsonl'` query per month per kind — on multi-year data that fanned out
  // hundreds of Drive list queries (Drive 503-rate-limits, browser ERR_INSUFFICIENT_RESOURCES).
  // Now N reads share ONE list per folder; concurrent readers await the same in-flight promise.
  async _folderIndex(folderId) {
    const cached = this.fileIndex.get(folderId);
    if (cached) return cached;
    let inflight = this._listingInflight.get(folderId);
    if (!inflight) {
      const q = `'${folderId}' in parents and trashed=false`;
      inflight = this.driveApi
        .driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive&pageSize=1000`)
        .then(async (res) => {
          // Same-name duplicates (two concurrent first-writers both POSTing the fileName)
          // used to collapse here as "last in list order wins" — nondeterministic across
          // sessions, so reads and writes raced between divergent copies. Every duplicate
          // now heals to the deterministic lowest-id winner with contents merged first.
          const byName = new Map();
          for (const f of res?.files ?? []) {
            if (!byName.has(f.name)) byName.set(f.name, []);
            byName.get(f.name).push(f.id);
          }
          const map = new Map();
          for (const [name, ids] of byName) {
            map.set(name, ids.length === 1 ? ids[0] : await healDuplicateBundle(this.driveApi, name, ids));
          }
          this.fileIndex.set(folderId, map);
          this._listingInflight.delete(folderId);
          return map;
        })
        .catch((err) => { this._listingInflight.delete(folderId); throw err; });
      this._listingInflight.set(folderId, inflight);
    }
    return inflight;
  }

  // Drop a folder's cached listing after a write so the next read re-resolves the current id
  // (a create adds a file; an id may rotate).
  _invalidateFolderIndex(folderId) {
    this.fileIndex.delete(folderId);
    this._listingInflight.delete(folderId);
  }

  // Where a kind or a path lives is its own question — the folder-resolve port answers it.
  // Kept as methods so ServerIoPort and the existing tests keep their handle on it.
  async _resolveFolder(kind) { return resolveFolder(this, kind); }

  async _resolveFromManifest(kind) { return resolveFromManifest(this, kind); }

  async _ensureNestedFolder(rootId, path) { return ensureNestedFolder(this, rootId, path); }

  async drive_read_bundle(kind, period) {
    let fileName = `${period}.jsonl`;
    if (kind === 'user_audit_log') fileName = 'user-audit-log.jsonl';
    
    const folderId = await this._resolveFolder(kind);
    const index    = await this._folderIndex(folderId);
    const fileId   = index.get(fileName) ?? null;

    if (!fileId) {
      return { etag: null, content: '', fileId: null, folderId, fileName };
    }

    const data = await this.driveApi.getFile(fileId);
    if (!data) return { etag: null, content: '', fileId, folderId, fileName };

    return { etag: data.etag, content: data.content, fileId, folderId, fileName };
  }

  async drive_write_bundle(kind, period, newContent, etag) {
    let fileName = `${period}.jsonl`;
    if (kind === 'user_audit_log') fileName = 'user-audit-log.jsonl';
    
    const folderId = await this._resolveFolder(kind);
    const index    = await this._folderIndex(folderId);
    const fileId   = index.get(fileName) ?? null;

    const uploadId = fileId ? fileId : folderId;

    try {
      const result = await this.driveApi.uploadFile(uploadId, fileName, newContent, etag, { isUpdate: Boolean(fileId) });
      this._invalidateFolderIndex(folderId); // a create adds a file / an update may rotate the id
      return { etag: result.etag };
    } catch (err) {
      if (err.status === 412) {
        throw new Error("412 Precondition Failed");
      }
      throw err;
    }
  }

  // ── Delta-engine adapters (delta-sync-model.md) — raw passthrough, kernel = ∅ ─────────
  // JS fetches, Rust decides. No filtering, no reconcile, no kind inference here.

  // One FRESH files.list of the kind's folder with the version axis included. Also refreshes
  // the name->id index the read/write paths use, so a bundle created by another client
  // becomes visible the moment the wasm engine re-lists.
  async drive_list_bundles(kind) {
    const folderId = await this._resolveFolder(kind);
    const q = `'${folderId}' in parents and trashed=false`;
    const res = await this.driveApi.driveFetch(
      'GET',
      `/files?q=${encodeURIComponent(q)}&fields=files(id,name,version,modifiedTime)&spaces=drive&pageSize=1000`,
    );
    const files = res?.files ?? [];
    // Same heal as _folderIndex — this listing used to build its own last-wins name→id map,
    // which both BYPASSED the heal and re-poisoned fileIndex behind it. Worse, the delta
    // engine walked every duplicate copy by id, so the cache ingested each divergent copy in
    // Drive's list order and the visible row set changed from boot to boot.
    const byName = new Map();
    for (const f of files) {
      if (!byName.has(f.name)) byName.set(f.name, []);
      byName.get(f.name).push(f);
    }
    const map = new Map();
    const healed = [];
    for (const [name, group] of byName) {
      if (group.length === 1) { map.set(name, group[0].id); healed.push(group[0]); continue; }
      const winnerId = await healDuplicateBundle(this.driveApi, name, group.map((g) => g.id));
      map.set(name, winnerId);
      // The winner's listed version predates the merge PATCH — handing back the stale version
      // makes the delta engine re-pull it, which is exactly right after a content union.
      healed.push(group.find((g) => g.id === winnerId));
    }
    this.fileIndex.set(folderId, map);
    this._listingInflight.delete(folderId);
    return { folderId, files: healed };
  }

  async drive_read_file(fileId) {
    const data = await this.driveApi.getFile(fileId);
    if (!data) return { found: false, content: '', etag: null };
    return { found: true, content: data.content, etag: data.etag };
  }

  async drive_changes(pageToken) {
    const fields = 'nextPageToken,newStartPageToken,changes(fileId,removed,file(id,name,version,parents))';
    return await this.driveApi.driveFetch(
      'GET',
      `/changes?pageToken=${encodeURIComponent(pageToken)}&fields=${encodeURIComponent(fields)}&spaces=drive`,
    );
  }

  async drive_start_page_token() {
    return await this.driveApi.driveFetch('GET', '/changes/startPageToken');
  }

  async drive_folder_kind(folderId) {
    return this._folderKind.get(folderId) ?? null;
  }

  // ── Generic workspace-file adapters (#11 _shared/{area} port) — raw passthrough,
  // kernel = ∅. Path knowledge lives in the Rust stores; this only resolves segments
  // (cached), lists, reads and writes. Empty fileId/etag = create / no CAS precondition.

  async _resolveDir(dirPath) { return resolveDir(this, dirPath); }

  async _resolveDirFromManifest(dirPath) { return resolveDirFromManifest(this, dirPath); }

  async ws_list_dir(dirPath) {
    const folderId = await this._resolveDir(dirPath);
    const q = `'${folderId}' in parents and trashed=false`;
    // version/mimeType ride along for the per-record delta engine (F-38-03): version is the
    // witness the version-compare needs, mimeType lets Rust tell partition folders from files.
    const res = await this.driveApi.driveFetch(
      'GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name,version,mimeType)&spaces=drive&pageSize=1000`,
    );
    return {
      folderId,
      files: (res?.files ?? []).map((f) => ({
        id: f.id, name: f.name, version: f.version ?? '', mimeType: f.mimeType ?? '',
      })),
    };
  }

  async ws_read_file(dirPath, fileName) {
    const folderId = await this._resolveDir(dirPath);
    const index    = await this._folderIndex(folderId);
    const fileId   = index.get(fileName) ?? null;
    if (!fileId) return { found: false, id: null, etag: null, content: '' };
    const data = await this.driveApi.getFile(fileId);
    if (!data) return { found: false, id: fileId, etag: null, content: '' };
    return { found: true, id: fileId, etag: data.etag ?? null, content: data.content ?? '' };
  }

  async ws_write_file(dirPath, fileName, content, fileId, etag) {
    const folderId = await this._resolveDir(dirPath);
    const uploadId = fileId ? fileId : folderId;
    const result   = await this.driveApi.uploadFile(uploadId, fileName, content, etag || null, { isUpdate: Boolean(fileId) });
    this._invalidateFolderIndex(folderId);
    return { id: result.id, etag: result.etag ?? null };
  }

  async ws_delete_file(fileId) {
    await this.driveApi.driveFetch('DELETE', `/files/${fileId}`);
    return null;
  }

}
