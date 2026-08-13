import { getFile, uploadFile, getOrCreateFolder, findWorkspaceRoot } from '../auth/drive-api.js';
import { activeWorkspaceName } from '../operators/workspace-registry.js';
import { MASTER_REGISTRY } from './master-registry.js';
import { healDuplicateBundle } from './bundle-file-heal.js';

// F-37-02: the revenue audit trail is deliberately NOT here. A log inherits the ACL of the thing
// it describes, and revenue history describes a record CS was never granted — listing it as a
// shared log would move `selling_amount: 1000 -> 1200` into the folder CS reads, undoing the split
// without touching the split. It falls through to the per-user fork below, which IS the wall.
// A residue guard in tests/unit/f-37-02-shipment-audit.test.mjs fails the build if it appears here.
const LOG_KINDS = ['error_log', 'audit_log'];
const MASTERS_PATH = 'shared/masters';
const USERS_PATH   = 'users';
// E-37: `shipment` left the per-user fallback. CS and the sales rep both write the job file,
// so no single fork can hold it — the envelope is a protected ref (`_shared/shipments`) whose
// reader set is what keeps Accounting out of a draft. Its revenue half stays per-user under
// `shipment_revenue`, which needs no entry here precisely BECAUSE the fork fallback IS the
// ACL that hides it from CS.
const KIND_PATH_OVERRIDES = {
  user: 'admin/users',
  user_audit_log: 'admin',
  error_log: '_shared/error-log',
  audit_log: '_shared/logs/audit-log',
  shipment: '_shared/shipments'
};

// Registry lookup replaces the old MASTER_KINDS membership check. A kind absent from the
// registry is not necessarily a bug — most entity kinds (shipments, quotes, pnl, commission
// entries, outbox…) are per-user by default and were never master-declared; they keep
// today's per-user fallback below. Only a registered `team` entry routes to shared/masters.
function _isTeamMaster(kind) {
  const entry = MASTER_REGISTRY[kind];
  return Boolean(entry) && entry.audience === 'team';
}

export class WasmIoPort {
  constructor(db, driveApi, userEmail) {
    this.db = db;
    this.driveApi = driveApi;
    this.userEmail = userEmail;
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

  // Storage methods (cache_get/cache_list/cache_put/cache_delete/cache_get_meta/cache_put_meta) live in the
  // StoreIoPort subclass now — this base keeps only the Drive/event/ledger half the port shares.

  async _resolveFolder(kind) {
    if (this.folderIds.has(kind)) return this.folderIds.get(kind);
    const rootId = await findWorkspaceRoot(activeWorkspaceName());
    if (!rootId) throw new Error('Workspace root not found');

    let folderId;
    // An explicit override wins outright: it is the only way to say "this kind does NOT live
    // in the signed-in user's fork", and the shipment envelope depends on that being
    // unconditional rather than a side effect of also being a master or a log.
    if (KIND_PATH_OVERRIDES[kind] || _isTeamMaster(kind) || LOG_KINDS.includes(kind)) {
      const kindPath = KIND_PATH_OVERRIDES[kind] ?? `${MASTERS_PATH}/${kind}`;
      folderId = await this._ensureNestedFolder(rootId, kindPath);
    } else {
      const prefix = this.userEmail.split('@')[0].toLowerCase();
      folderId = await this._ensureNestedFolder(rootId, `${USERS_PATH}/${prefix}/${kind}`);
    }
    this.folderIds.set(kind, folderId);
    this._folderKind.set(folderId, kind);
    return folderId;
  }

  // Resolve each path segment ONCE per session. The boot migrators (seed/master-scope/priced-ref)
  // all resolve masters/<kind>, re-doing getOrCreateFolder for the shared 'masters' segment every
  // time — dozens of sequential Drive round-trips that blew their 8s bounds on a cold cache. Cache
  // per (parentId,name), and dedupe concurrent resolves of the same segment onto one in-flight call.
  async _ensureNestedFolder(rootId, path) {
    let current = rootId;
    for (const part of path.split('/')) {
      const key = `${current}/${part}`;
      let id = this._pathSegment.get(key);
      if (!id) {
        let inflight = this._segInflight.get(key);
        if (!inflight) {
          inflight = getOrCreateFolder(current, part).then((f) => f.id).finally(() => this._segInflight.delete(key));
          this._segInflight.set(key, inflight);
        }
        id = await inflight;
        this._pathSegment.set(key, id);
      }
      current = id;
    }
    return current;
  }

  async drive_read_bundle(kind, period) {
    let fileName = _isTeamMaster(kind) ? 'all.jsonl' : `${period}.jsonl`;
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
    let fileName = _isTeamMaster(kind) ? 'all.jsonl' : `${period}.jsonl`;
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

  async _resolveDir(dirPath) {
    const rootId = await findWorkspaceRoot(activeWorkspaceName());
    if (!rootId) throw new Error('Workspace root not found');
    return this._ensureNestedFolder(rootId, dirPath);
  }

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

  async dispatch_event(eventName, detail) {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  // Author identity for _rev_by provenance (F-28-06) — reads the live signed-in user,
  // falls back to the boot-time email this port was constructed with.
  async current_user_email() {
    return window.__vdg_auth?.getCurrentUser?.()?.email || this.userEmail || 'unknown';
  }

  // ── Ledger Operations ────────────────────────────────────────────────────────
  async ledger_get_chart() {
    if (!window.__vdg_ledger_repo) throw new Error("Ledger Repo not initialized");
    return await window.__vdg_ledger_repo.chartOfAccounts();
  }

  async ledger_get_rules() {
    if (!window.__vdg_ledger_repo) throw new Error("Ledger Repo not initialized");
    return await window.__vdg_ledger_repo.postingRules();
  }

  async ledger_is_posted(posted_index) {
    if (!window.__vdg_ledger_repo) throw new Error("Ledger Repo not initialized");
    return await window.__vdg_ledger_repo.isAlreadyPosted(posted_index);
  }

  async ledger_append_leg(year, account_code, leg) {
    if (!window.__vdg_ledger_repo) throw new Error("Ledger Repo not initialized");
    return await window.__vdg_ledger_repo.appendLeg(year, account_code, leg);
  }

  async ledger_record_posted(posted_index, entry_ids) {
    if (!window.__vdg_ledger_repo) throw new Error("Ledger Repo not initialized");
    return await window.__vdg_ledger_repo.recordPosted(posted_index, entry_ids);
  }
}
