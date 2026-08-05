// IndexedDB L2 — CachedEntityRepo wrapper + openVdgDb

import { EntityRepo } from '../abstractions/entity-repo.js';
import { idbUpsertOutboxRecord } from './outbox-dedupe.js';
import { emitOutboxChanged } from './outbox-count.js';
import { runBackgroundPull } from './background-pull.js';
import {
  IDB_DB_NAME, IDB_DB_VERSION, META_SYNC_KEY,
  STORE_ENTITIES, STORE_META, STORE_OUTBOX, STORE_NOTIFICATIONS, STORE_KIND_WMA,
  applyUpgrade,
} from './idb-schema.js';

const FULL_PULL_VALID_MS = 30_000;

export class IdbUnavailableError extends Error {
  constructor(msg) { super(msg); this.name = 'IdbUnavailableError'; }
}

// ── DB open ───────────────────────────────────────────────────────────────────

// Single shared connection. 6 callers + the repo-init retry loop must NOT each open a fresh
// indexedDB connection: concurrent opens of the same DB jam each other (no success/error/blocked
// event fires), openVdgDb times out at 8s, repo-init retries and opens AGAIN -> worse jam ->
// "Khởi tạo workspace quá lâu". Memoize so exactly one open ever runs; reset on real failure so
// a later attempt can genuinely retry.
let _dbPromise = null;
// Drop the memoized (jammed) open so the next openVdgDb() re-opens — else the dead promise is
// replayed to every retry. Nulls the memo only: no timer/connection (that jamTimer closed handles).
export function resetVdgDbMemo() { _dbPromise = null; }
export function openVdgDb() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    let req;
    try {
      req = indexedDB.open(IDB_DB_NAME, IDB_DB_VERSION);
    } catch (err) {
      _dbPromise = null;
      reject(new IdbUnavailableError(err.message));
      return;
    }
    req.onupgradeneeded = applyUpgrade;
    req.onsuccess = (ev) => resolve(ev.target.result);
    req.onerror   = () => { _dbPromise = null; reject(new IdbUnavailableError(req.error?.message || 'IDB open failed')); };
    req.onblocked = () => { _dbPromise = null; reject(new IdbUnavailableError('IDB open blocked')); };
  });
  return _dbPromise;
}

// ── IDB helpers ───────────────────────────────────────────────────────────────

// Global IDB serialization + per-op backstop. Root cause of the origin-wide "connection wedged"
// freeze (proven live: even opening a brand-new UNRELATED db stops firing events): the boot storm
// — full Drive pull + seed/master-scope/priced-ref migrators + delta-poll + route-prefetch, each
// spawn_local'ing IDB futures through WASM — fired dozens of concurrent transactions that deadlock
// Chromium/Edge's per-origin IDB task runner. Funnel EVERY op through one chain so at most one
// transaction is ever in flight; the storm can't form, the runner never deadlocks. Each op keeps a
// 5s backstop so a genuinely wedged op fails fast, nulls the memo, and frees the chain — a stalled
// op can't block every queued op behind it. A LOCAL read/write is milliseconds, so past 5s the
// connection is dead: this is a dead-connection detector, not a network-latency guess.
const IDB_READ_TIMEOUT_MS = 5000;

let _idbChain = Promise.resolve();
function _serialize(op) {
  const run = _idbChain.then(op, op);
  _idbChain = run.then(() => {}, () => {}); // keep the chain alive; one op's outcome never poisons the next
  return run;
}

// Run a single bounded IDB op. executor gets (resolve, reject) and wires the request/tx events;
// the backstop rejects + drops the memo if nothing fires. WRITES serialize (serial=true) so the
// boot storm can't fire a concurrent write burst; READS run immediately (serial=false) — IDB
// handles concurrent reads fine, and a read must never queue behind a stalled write, or an open
// grid shows "Đang tải…" for 8s while a background seed/delta write retries. Reads stay bounded so
// a genuinely dead connection still fails fast.
function _boundedOp(executor, serial) {
  const make = () => new Promise((res, rej) => {
    let settled = false;
    const done = (fn, arg) => { if (!settled) { settled = true; clearTimeout(timer); fn(arg); } };
    const timer = setTimeout(() => { _dbPromise = null; done(rej, new IdbUnavailableError('IDB op timed out — connection wedged')); }, IDB_READ_TIMEOUT_MS);
    try { executor((v) => done(res, v), (e) => done(rej, e)); }
    catch (e) { done(rej, e); }
  });
  return serial ? _serialize(make) : make();
}

export async function idbGet(db, store, key) {
  return (await _boundedOp((res, rej) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  }, false)) ?? null;
}

// key is required for out-of-line-keyed stores (e.g. STORE_OUTBOX) when updating
// an existing row in place — omitting it makes the key generator mint a fresh
// key, silently leaving the old row behind (root cause of the F-24-12 snowball).
export function idbPut(db, store, value, key) {
  return _boundedOp((res, rej) => {
    const objectStore = db.transaction(store, 'readwrite').objectStore(store);
    const req = key === undefined ? objectStore.put(value) : objectStore.put(value, key);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  }, true);
}

export function idbGetAll(db, store) {
  return _boundedOp((res, rej) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror   = () => rej(req.error);
  }, false);
}

// cursor-based: attaches autoIncrement key as __key on each record
export function idbGetAllWithKeys(db, store) {
  return _boundedOp((res, rej) => {
    const req = db.transaction(store, 'readonly').objectStore(store).openCursor();
    const out = [];
    req.onsuccess = (ev) => {
      const cursor = ev.target.result;
      if (cursor) { out.push({ ...cursor.value, __key: cursor.primaryKey }); cursor.continue(); }
      else res(out);
    };
    req.onerror = () => rej(req.error);
  }, false);
}

export async function idbGetAllByIndex(db, store, indexName, key) {
  return (await _boundedOp((res, rej) => {
    const req = db.transaction(store, 'readonly').objectStore(store).index(indexName).getAll(key);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  }, false)) || [];
}

export function idbDelete(db, store, key) {
  return _boundedOp((res, rej) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).delete(key);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  }, true);
}

// D-3: IDB stores entity-type in 'kind' (keyPath); domain 'kind' is stashed as '_domain_kind'.
// Restore before returning to callers so they see the original domain field.
function _restoreDomainKind(r) {
  if (!r || r._domain_kind === undefined) return r;
  const { _domain_kind, ...rest } = r;
  return { ...rest, kind: _domain_kind };
}

// Atomic entity + outbox write in one transaction (serialized — a write)
export function idbPutWithOutbox(db, entityRecord, outboxRecord) {
  return _boundedOp((res, rej) => {
    const tx       = db.transaction([STORE_ENTITIES, STORE_OUTBOX], 'readwrite');
    const entities = tx.objectStore(STORE_ENTITIES);
    const outbox   = tx.objectStore(STORE_OUTBOX);
    entities.put(entityRecord);
    idbUpsertOutboxRecord(outbox, outboxRecord);
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  }, true);
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
    const promise = runBackgroundPull(kind, {
      driveList: (k) => this._drive.list(k, null),
      readCached: async (k) => {
        if (!this._db) return new Map();
        return new Map((await idbGetAllByIndex(this._db, STORE_ENTITIES, 'by_kind', k)).map((r) => [r.id, _restoreDomainKind(r)]));
      },
      writeCached: async (k, r) => {
        if (!this._db) return;
        await idbPut(this._db, STORE_ENTITIES, { ...r, kind: k, ...(r.kind !== undefined && r.kind !== k ? { _domain_kind: r.kind } : {}) });
      },
      writeMeta: async (k) => {
        if (!this._db) return;
        const meta = await idbGet(this._db, STORE_META, META_SYNC_KEY) || { key: META_SYNC_KEY };
        await idbPut(this._db, STORE_META, { ...meta, [`last_full_pull_ms_${k}`]: Date.now() });
      },
      dispatchChanged: (k) => window.dispatchEvent(new CustomEvent('vdg:entity-changed', { detail: { kind: k } })),
    }).finally(() => this._inflightPulls.delete(kind));
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
      await emitOutboxChanged(this._db);
    } else {
      await this._drive.put(entityKind, id, body);
    }
    this._auditLog?.append(entityKind, id, 'put', body); // fire-and-forget
  }

  async delete(kind, id) {
    this._lru?.evict(kind, id);
    // F-19-80 unifyDeletedAt: epoch-ms number, matching the Rust delete path (sync_engine.rs/
    // wasm_repo.rs) — an ISO string here made the reconcile timestamp compare non-comparable.
    const soft      = { kind, id, _deleted: true, _deleted_at: Date.now() };
    const outboxRec = { kind, id, op: 'delete', body: soft, queued_at: Date.now() };

    if (this._db) {
      await idbPutWithOutbox(this._db, soft, outboxRec);
      window.dispatchEvent(new CustomEvent('vdg:entity-changed', { detail: { kind, id } }));
      await emitOutboxChanged(this._db);
    } else {
      await this._drive.delete(kind, id);
    }
    this._auditLog?.append(kind, id, 'delete', soft); // fire-and-forget
  }
}

export { IDB_DB_NAME, IDB_DB_VERSION, META_SYNC_KEY, STORE_ENTITIES, STORE_META, STORE_OUTBOX, STORE_NOTIFICATIONS, STORE_KIND_WMA };
