// IndexedDB L2 — CachedEntityRepo wrapper + openVdgDb

import { EntityRepo } from '../abstractions/entity-repo.js';
import { OUTBOX_INDEX_KIND_ID_OP, idbUpsertOutboxRecord, dedupeOutboxStore, purgeStaleFailedOutboxRows } from './outbox-dedupe.js';

const IDB_DB_NAME         = 'vdg-workspace';
const IDB_DB_VERSION      = 6;  // v6: ensure entities indexes exist
const STORE_NOTIFICATIONS = 'notifications';
const STORE_KIND_WMA      = 'kind_wma';
const FULL_PULL_VALID_MS = 30_000;
const STORE_ENTITIES     = 'entities';
const STORE_META         = 'meta';
const STORE_OUTBOX       = 'outbox';
const META_SYNC_KEY      = 'sync_state';

const DEFAULT_WIDGET_LAYOUT = [
  'kpi', 'leaderboard', 'exceptions', 'ar', 'bar',
  'donut', 'activity', 'timeline', 'pipeline', 'top-customers',
];

export class IdbUnavailableError extends Error {
  constructor(msg) { super(msg); this.name = 'IdbUnavailableError'; }
}

// ── DB open ───────────────────────────────────────────────────────────────────

export function openVdgDb() {
  return new Promise((resolve, reject) => {
    let req;
    try {
      req = indexedDB.open(IDB_DB_NAME, IDB_DB_VERSION);
    } catch (err) {
      reject(new IdbUnavailableError(err.message));
      return;
    }

    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;

      if (!db.objectStoreNames.contains(STORE_ENTITIES)) {
        const s = db.createObjectStore(STORE_ENTITIES, { keyPath: ['kind', 'id'] });
        s.createIndex('by_kind',             'kind',                         { unique: false });
        s.createIndex('by_kind_sales_rep',   ['kind', 'sales_rep'],          { unique: false });
        s.createIndex('by_kind_customer_id', ['kind', 'customer_id'],        { unique: false });
        s.createIndex('by_updated_at',       'updated_at',                   { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_META)) {
        const m = db.createObjectStore(STORE_META, { keyPath: 'key' });
        m.transaction.oncomplete = () => {
          const tx = db.transaction(STORE_META, 'readwrite');
          tx.objectStore(STORE_META).add({
            key: META_SYNC_KEY, last_change_token: null, last_full_pull_ms: 0, user_role: null,
          });
        };
      }

      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        db.createObjectStore(STORE_OUTBOX, { autoIncrement: true });
      }

      // v2: notifications store
      if (ev.oldVersion < 2 && !db.objectStoreNames.contains(STORE_NOTIFICATIONS)) {
        const n = db.createObjectStore(STORE_NOTIFICATIONS, { keyPath: 'id' });
        n.createIndex('by_read',    'read',       { unique: false });
        n.createIndex('by_type',    'type',       { unique: false });
        n.createIndex('by_created', 'created_at', { unique: false });
      }

      // v3: per-rep kind WMA store
      if (ev.oldVersion < 3 && !db.objectStoreNames.contains(STORE_KIND_WMA)) {
        db.createObjectStore(STORE_KIND_WMA, { keyPath: 'key' });
      }

      // v4: outbox dedupe index + one-time collapse of duplicate rows (F-24-12 snowball fix)
      if (ev.oldVersion < 4 && db.objectStoreNames.contains(STORE_OUTBOX)) {
        const outboxStore = ev.target.transaction.objectStore(STORE_OUTBOX);
        if (!outboxStore.indexNames.contains(OUTBOX_INDEX_KIND_ID_OP)) {
          outboxStore.createIndex(OUTBOX_INDEX_KIND_ID_OP, ['kind', 'id', 'op'], { unique: false });
        }
        dedupeOutboxStore(outboxStore);
      }

      // v5: purge outbox rows failed >7d ago — a stale row predates whatever
      // fix would have unstuck it (e.g. F-15-57 pnl_lines rename) and would
      // otherwise sit as a permanent poison record (F-24-17).
      if (ev.oldVersion < 5 && db.objectStoreNames.contains(STORE_OUTBOX)) {
        const outboxStore = ev.target.transaction.objectStore(STORE_OUTBOX);
        purgeStaleFailedOutboxRows(outboxStore);
      }

      // v6: ensure entities store indexes exist (fix missing by_kind index)
      if (ev.oldVersion < 6 && db.objectStoreNames.contains(STORE_ENTITIES)) {
        const s = ev.target.transaction.objectStore(STORE_ENTITIES);
        if (!s.indexNames.contains('by_kind')) {
          s.createIndex('by_kind',             'kind',                         { unique: false });
          s.createIndex('by_kind_sales_rep',   ['kind', 'sales_rep'],          { unique: false });
          s.createIndex('by_kind_customer_id', ['kind', 'customer_id'],        { unique: false });
          s.createIndex('by_updated_at',       'updated_at',                   { unique: false });
        }
      }

      // v2 migration: by_kind_etd index + preferences seed
      if (ev.oldVersion < 2 && db.objectStoreNames.contains(STORE_ENTITIES)) {
        const s = ev.target.transaction.objectStore(STORE_ENTITIES);
        if (!s.indexNames.contains('by_kind_etd')) {
          s.createIndex('by_kind_etd', ['kind', 'etd'], { unique: false });
        }
        ev.target.transaction.oncomplete = () => {
          const tx = db.transaction(STORE_META, 'readwrite');
          const ms = tx.objectStore(STORE_META);
          ms.get('preferences').onsuccess = (ge) => {
            if (!ge.target.result) {
              ms.add({
                key: 'preferences',
                widget_layout: DEFAULT_WIDGET_LAYOUT,
                locale: 'vi',
                theme: 'light',
                pipeline_view_mode: 'board',
                dismissed_credit_alerts: [],
              });
            }
          };
        };
      }
    };

    req.onsuccess = (ev) => resolve(ev.target.result);
    req.onerror   = () => reject(new IdbUnavailableError(req.error?.message || 'IDB open failed'));
    req.onblocked = () => reject(new IdbUnavailableError('IDB open blocked'));
  });
}

// ── IDB helpers ───────────────────────────────────────────────────────────────

export function idbGet(db, store, key) {
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key);
    req.onsuccess = () => res(req.result ?? null);
    req.onerror   = () => rej(req.error);
  });
}

// key is required for out-of-line-keyed stores (e.g. STORE_OUTBOX) when updating
// an existing row in place — omitting it makes the key generator mint a fresh
// key, silently leaving the old row behind (root cause of the F-24-12 snowball).
export function idbPut(db, store, value, key) {
  return new Promise((res, rej) => {
    const objectStore = db.transaction(store, 'readwrite').objectStore(store);
    const req = key === undefined ? objectStore.put(value) : objectStore.put(value, key);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

export function idbGetAll(db, store) {
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror   = () => rej(req.error);
  });
}

// cursor-based: attaches autoIncrement key as __key on each record
export function idbGetAllWithKeys(db, store) {
  return new Promise((res, rej) => {
    const tx  = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).openCursor();
    const out = [];
    req.onsuccess = (ev) => {
      const cursor = ev.target.result;
      if (cursor) { out.push({ ...cursor.value, __key: cursor.primaryKey }); cursor.continue(); }
      else res(out);
    };
    req.onerror = () => rej(req.error);
  });
}

export function idbGetAllByIndex(db, store, indexName, key) {
  return new Promise((res, rej) => {
    const tx  = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).index(indexName).getAll(key);
    req.onsuccess = () => res(req.result || []);
    req.onerror   = () => rej(req.error);
  });
}

export function idbDelete(db, store, key) {
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).delete(key);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
}

// D-3: IDB stores entity-type in 'kind' (keyPath); domain 'kind' is stashed as '_domain_kind'.
// Restore before returning to callers so they see the original domain field.
function _restoreDomainKind(r) {
  if (!r || r._domain_kind === undefined) return r;
  const { _domain_kind, ...rest } = r;
  return { ...rest, kind: _domain_kind };
}

// Atomic entity + outbox write in one transaction
export function idbPutWithOutbox(db, entityRecord, outboxRecord) {
  return new Promise((res, rej) => {
    const tx       = db.transaction([STORE_ENTITIES, STORE_OUTBOX], 'readwrite');
    const entities = tx.objectStore(STORE_ENTITIES);
    const outbox   = tx.objectStore(STORE_OUTBOX);
    entities.put(entityRecord);
    idbUpsertOutboxRecord(outbox, outboxRecord);
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}

// ── CachedEntityRepo ─────────────────────────────────────────────────────────

export class CachedEntityRepo extends EntityRepo {
  constructor(driveRepo, lruCache, db) {
    super();
    this._drive   = driveRepo;
    this._lru     = lruCache;
    this._db      = db;
    this._auditLog = null; // injected lazily via setAuditLog()
    this._inflightPulls = new Map();
  }

  setAuditLog(log) { this._auditLog = log; }

  async list(kind, filter) {
    if (this._db) {
      const meta = await idbGet(this._db, STORE_META, META_SYNC_KEY);
      const lastPull = meta?.[`last_full_pull_ms_${kind}`] || 0;
      const age  = Date.now() - lastPull;

      const readFromIdb = async () => {
        const rows = await idbGetAllByIndex(this._db, STORE_ENTITIES, 'by_kind', kind);
        const live = rows.filter((r) => !r._deleted).map(_restoreDomainKind);
        return filter ? live.filter(filter) : live;
      };

      if (age <= FULL_PULL_VALID_MS) {
        return await readFromIdb();
      } else {
        const idbRows = await readFromIdb();
        if (idbRows.length > 0) {
          this._backgroundPull(kind).catch((err) => console.warn('[VDG] Background pull failed:', err)); // DEV
          return idbRows;
        }
        await this._backgroundPull(kind);
        return await readFromIdb();
      }
    }
    const driveRows = await this._drive.list(kind, filter);
    return driveRows.map(_restoreDomainKind);
  }

  async _backgroundPull(kind) {
    if (this._inflightPulls.has(kind)) return this._inflightPulls.get(kind);
    const promise = (async () => {
      try {
        const driveRows = await this._drive.list(kind, null);
        if (!this._db) return;
        for (const r of driveRows) {
          const domainKind = r.kind;
          const idbRec = { ...r, kind };
          if (domainKind !== undefined && domainKind !== kind) idbRec._domain_kind = domainKind;
          await idbPut(this._db, STORE_ENTITIES, idbRec);
        }
        const meta = await idbGet(this._db, STORE_META, META_SYNC_KEY) || { key: META_SYNC_KEY };
        await idbPut(this._db, STORE_META, { ...meta, [`last_full_pull_ms_${kind}`]: Date.now() });
        window.dispatchEvent(new CustomEvent('vdg:entity-changed', { detail: { kind } }));
      } finally {
        this._inflightPulls.delete(kind);
      }
    })();
    this._inflightPulls.set(kind, promise);
    return promise;
  }

  async get(kind, id) {
    // L1 → L2 → L3
    const l1 = this._lru?.get(kind, id);
    if (l1 !== undefined) return l1;

    if (this._db) {
      const l2 = await idbGet(this._db, STORE_ENTITIES, [kind, id]);
      if (l2 && !l2._deleted) {
        const restored = _restoreDomainKind(l2);
        this._lru?.put(kind, id, restored);
        return restored;
      }
    }

    const l3 = await this._drive.get(kind, id);
    if (l3) {
      if (this._db) await idbPut(this._db, STORE_ENTITIES, { ...l3, kind });
      const restored = _restoreDomainKind(l3);
      this._lru?.put(kind, id, restored);
      return restored;
    }
    return l3;
  }

  async put(entityKind, id, body) {
    // D-3: body.kind may be a domain field (e.g. CommissionKind='CustomerRebate');
    // IDB keyPath 'kind' must hold the entity-type — stash domain kind to restore on reads.
    const domainKind = body.kind;
    const record = { ...body, kind: entityKind, id };
    if (domainKind !== undefined && domainKind !== entityKind) {
      record._domain_kind = domainKind;
    }
    this._lru?.put(entityKind, id, _restoreDomainKind(record));
    const outboxRec = { kind: entityKind, id, op: 'put', body: record, queued_at: Date.now() };

    if (this._db) {
      await idbPutWithOutbox(this._db, record, outboxRec);
      // D-1: mark IDB as locally fresh — list() must read from IDB, not Drive, after a put
      const meta = await idbGet(this._db, STORE_META, META_SYNC_KEY) || { key: META_SYNC_KEY };
      await idbPut(this._db, STORE_META, { ...meta, [`last_full_pull_ms_${entityKind}`]: Date.now() });
      window.dispatchEvent(new CustomEvent('vdg:entity-changed', { detail: { kind: entityKind, id } }));
      window.dispatchEvent(new CustomEvent('vdg:outbox-changed'));
    } else {
      await this._drive.put(entityKind, id, body);
    }
    this._auditLog?.append(entityKind, id, 'put', body); // fire-and-forget
  }

  async delete(kind, id) {
    this._lru?.evict(kind, id);
    const soft      = { kind, id, _deleted: true, _deleted_at: new Date().toISOString() };
    const outboxRec = { kind, id, op: 'delete', body: soft, queued_at: Date.now() };

    if (this._db) {
      await idbPutWithOutbox(this._db, soft, outboxRec);
      window.dispatchEvent(new CustomEvent('vdg:entity-changed', { detail: { kind, id } }));
      window.dispatchEvent(new CustomEvent('vdg:outbox-changed'));
    } else {
      await this._drive.delete(kind, id);
    }
    this._auditLog?.append(kind, id, 'delete', soft); // fire-and-forget
  }
}

export { IDB_DB_NAME, IDB_DB_VERSION, META_SYNC_KEY, STORE_ENTITIES, STORE_META, STORE_OUTBOX, STORE_NOTIFICATIONS, STORE_KIND_WMA };
