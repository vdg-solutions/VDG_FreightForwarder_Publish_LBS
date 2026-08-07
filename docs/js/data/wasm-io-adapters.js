import { getFile, uploadFile, getOrCreateFolder, findWorkspaceRoot } from '../auth/drive-api.js';
import { activeWorkspaceName } from '../operators/workspace-registry.js';
import { MASTER_REGISTRY } from './master-registry.js';

const LOG_KINDS = ['error_log', 'audit_log'];
const MASTERS_PATH = 'shared/masters';
const USERS_PATH   = 'users';
const KIND_PATH_OVERRIDES = { 
  user: 'admin/users',
  user_audit_log: 'admin',
  error_log: '_shared/error-log',
  audit_log: '_shared/logs/audit-log'
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
        .then((res) => {
          const map = new Map();
          for (const f of res?.files ?? []) map.set(f.name, f.id);
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

  // Storage methods (idb_get/idb_list/idb_put/idb_delete/idb_get_meta/idb_put_meta) live in the
  // SqliteIoPort subclass now — this base keeps only the Drive/event/ledger half the port shares.

  async _resolveFolder(kind) {
    if (this.folderIds.has(kind)) return this.folderIds.get(kind);
    const rootId = await findWorkspaceRoot(activeWorkspaceName());
    if (!rootId) throw new Error('Workspace root not found');

    let folderId;
    if (_isTeamMaster(kind) || LOG_KINDS.includes(kind)) {
      const kindPath = KIND_PATH_OVERRIDES[kind] ?? `${MASTERS_PATH}/${kind}`;
      folderId = await this._ensureNestedFolder(rootId, kindPath);
    } else {
      const prefix = this.userEmail.split('@')[0].toLowerCase();
      folderId = await this._ensureNestedFolder(rootId, `${USERS_PATH}/${prefix}/${kind}`);
    }
    this.folderIds.set(kind, folderId);
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
