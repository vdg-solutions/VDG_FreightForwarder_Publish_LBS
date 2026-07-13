import { idbGet, idbPut, idbGetAllByIndex, idbDelete, STORE_ENTITIES, STORE_META, STORE_OUTBOX } from '../cache/idb-cache.js';
import { getFile, uploadFile, getOrCreateFolder, findWorkspaceRoot } from '../auth/drive-api.js';
import { activeWorkspaceName } from '../operators/workspace-registry.js';

const MASTER_KINDS = ['customers', 'carriers', 'services', 'dunning_templates', 'user', 'airports', 'flights', 'airline-carriers', 'uld-types', 'air-rates', 'ocean-carriers', 'user_audit_log'];
const LOG_KINDS = ['error_log', 'audit_log'];
const MASTERS_PATH = 'shared/masters';
const USERS_PATH   = 'users';
const KIND_PATH_OVERRIDES = { 
  user: 'admin/users',
  user_audit_log: 'admin',
  error_log: '_shared/error-log',
  audit_log: '_shared/logs/audit-log'
};

// STORE_ENTITIES keyPath is ['kind','id']: the entity-type lives in `kind`. A record whose own
// domain `kind` (e.g. commission_entry's CommissionKind) is stashed as `_domain_kind` on write
// is restored here on read (mirrors the legacy CachedEntityRepo contract — shared store).
function _restoreDomainKind(r) {
  if (!r || r._domain_kind === undefined) return r;
  const { _domain_kind, ...rest } = r;
  return { ...rest, kind: _domain_kind };
}

export class WasmIoPort {
  constructor(db, driveApi, userEmail) {
    this.db = db;
    this.driveApi = driveApi;
    this.userEmail = userEmail;
    this.folderIds = new Map();
  }

  async idb_get(kind, id) {
    return _restoreDomainKind(await idbGet(this.db, STORE_ENTITIES, [kind, id]));
  }

  async idb_list(kind) {
    if (kind === 'outbox') {
      const tx = this.db.transaction(STORE_OUTBOX, 'readonly');
      const req = tx.objectStore(STORE_OUTBOX).getAll();
      return new Promise((res, rej) => {
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => rej(req.error);
      });
    }
    return (await idbGetAllByIndex(this.db, STORE_ENTITIES, 'by_kind', kind)).map(_restoreDomainKind);
  }

  async idb_put(kind, id, body) {
    if (kind === 'outbox') {
      // Put outbox with out-of-line string key
      return new Promise((res, rej) => {
        const tx = this.db.transaction(STORE_OUTBOX, 'readwrite');
        const req = tx.objectStore(STORE_OUTBOX).put(body, id);
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
      });
    }
    // STORE_ENTITIES keyPath is ['kind','id'] — inject both so IndexedDB can derive the key
    // (raw body lacks `kind` → "key path did not yield a value" DataError). Stash a colliding
    // domain `kind` as `_domain_kind`; _restoreDomainKind() puts it back on read.
    const domainKind = body?.kind;
    const record = { ...body, kind, id };
    if (domainKind !== undefined && domainKind !== kind) record._domain_kind = domainKind;
    return await idbPut(this.db, STORE_ENTITIES, record);
  }

  async idb_delete(kind, id) {
    if (kind === 'outbox') {
      return new Promise((res, rej) => {
        const tx = this.db.transaction(STORE_OUTBOX, 'readwrite');
        const req = tx.objectStore(STORE_OUTBOX).delete(id);
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
      });
    }
    return await idbDelete(this.db, STORE_ENTITIES, [kind, id]);
  }

  async idb_get_meta(key) {
    return await idbGet(this.db, STORE_META, key);
  }

  async idb_put_meta(key, body) {
    return await idbPut(this.db, STORE_META, { ...body, key });
  }

  async _resolveFolder(kind) {
    if (this.folderIds.has(kind)) return this.folderIds.get(kind);
    const rootId = await findWorkspaceRoot(activeWorkspaceName());
    if (!rootId) throw new Error('Workspace root not found');

    let folderId;
    if (MASTER_KINDS.includes(kind) || LOG_KINDS.includes(kind)) {
      const kindPath = KIND_PATH_OVERRIDES[kind] ?? `${MASTERS_PATH}/${kind}`;
      folderId = await this._ensureNestedFolder(rootId, kindPath);
    } else {
      const prefix = this.userEmail.split('@')[0].toLowerCase();
      folderId = await this._ensureNestedFolder(rootId, `${USERS_PATH}/${prefix}/${kind}`);
    }
    this.folderIds.set(kind, folderId);
    return folderId;
  }

  async _ensureNestedFolder(rootId, path) {
    const parts = path.split('/');
    let current = rootId;
    for (const part of parts) {
      const folder = await getOrCreateFolder(current, part);
      current = folder.id;
    }
    return current;
  }

  async drive_read_bundle(kind, period) {
    let fileName = MASTER_KINDS.includes(kind) ? 'all.jsonl' : `${period}.jsonl`;
    if (kind === 'user_audit_log') fileName = 'user-audit-log.jsonl';
    
    const folderId = await this._resolveFolder(kind);
    
    const q = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
    const res = await this.driveApi.driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`);
    const fileEntry = res.files?.[0] ?? null;

    if (!fileEntry) {
      return { etag: null, content: '', fileId: null, folderId, fileName };
    }

    const data = await this.driveApi.getFile(fileEntry.id);
    if (!data) return { etag: null, content: '', fileId: fileEntry.id, folderId, fileName };
    
    return { etag: data.etag, content: data.content, fileId: fileEntry.id, folderId, fileName };
  }

  async drive_write_bundle(kind, period, newContent, etag) {
    let fileName = MASTER_KINDS.includes(kind) ? 'all.jsonl' : `${period}.jsonl`;
    if (kind === 'user_audit_log') fileName = 'user-audit-log.jsonl';
    
    const folderId = await this._resolveFolder(kind);

    const q = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
    const res = await this.driveApi.driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`);
    const fileEntry = res.files?.[0] ?? null;

    const uploadId = fileEntry ? fileEntry.id : folderId;
    
    try {
      const result = await this.driveApi.uploadFile(uploadId, fileName, newContent, etag, { isUpdate: Boolean(fileEntry) });
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
