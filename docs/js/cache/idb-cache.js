// IndexedDB L2 — CachedEntityRepo wrapper + store helpers
// Connection lifecycle, wedge recovery and the concurrency gate live in idb-conn.js.

import { EntityRepo } from '../abstractions/entity-repo.js';
import { idbUpsertOutboxRecord } from './outbox-dedupe.js';
import { emitOutboxChanged } from './outbox-count.js';
import { runBackgroundPull } from './background-pull.js';
import { boundedOp } from './idb-conn.js';
import {
  META_SYNC_KEY,
  STORE_ENTITIES, STORE_META, STORE_OUTBOX, STORE_NOTIFICATIONS, STORE_KIND_WMA,
} from './idb-schema.js';

export { openVdgDb, resetVdgDbMemo, IdbUnavailableError, __resetIdbGuards } from './idb-conn.js';

const FULL_PULL_VALID_MS = 30_000;

// ── IDB helpers ───────────────────────────────────────────────────────────────
//
// Every op funnels through boundedOp: bounded (a wedged connection errors instead of hanging),
// gated (the boot storm can't fire dozens of concurrent transactions), and self-healing (a wedge
// closes + reopens the connection and retries once on the fresh handle). Executors take the db as
// a parameter rather than closing over it — recovery swaps the handle between the two attempts.

// Global IDB serialization + per-op backstop. Root cause of the origin-wide "connection wedged"
export async function idbGet(db, store, key) {
  return (await boundedOp((h) => (res, rej) => {
    const req = h.transaction(store, 'readonly').objectStore(store).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  }, { db })) ?? null;
}

// key is required for out-of-line-keyed stores (e.g. STORE_OUTBOX) when updating
// an existing row in place — omitting it makes the key generator mint a fresh
// key, silently leaving the old row behind (root cause of the F-24-12 snowball).
export function idbPut(db, store, value, key) {
  return boundedOp((h) => (res, rej) => {
    const objectStore = h.transaction(store, 'readwrite').objectStore(store);
    const req = key === undefined ? objectStore.put(value) : objectStore.put(value, key);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  }, { db, write: true });
}

export function idbGetAll(db, store) {
  return boundedOp((h) => (res, rej) => {
    const req = h.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror   = () => rej(req.error);
  }, { db });
}

// cursor-based: attaches autoIncrement key as __key on each record
export function idbGetAllWithKeys(db, store) {
  return boundedOp((h) => (res, rej) => {
    const req = h.transaction(store, 'readonly').objectStore(store).openCursor();
    const out = [];
    req.onsuccess = (ev) => {
      const cursor = ev.target.result;
      if (cursor) { out.push({ ...cursor.value, __key: cursor.primaryKey }); cursor.continue(); }
      else res(out);
    };
    req.onerror = () => rej(req.error);
  }, { db });
}

export async function idbGetAllByIndex(db, store, indexName, key) {
  return (await boundedOp((h) => (res, rej) => {
    const req = h.transaction(store, 'readonly').objectStore(store).index(indexName).getAll(key);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  }, { db })) || [];
}

export function idbDelete(db, store, key) {
  return boundedOp((h) => (res, rej) => {
    const req = h.transaction(store, 'readwrite').objectStore(store).delete(key);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  }, { db, write: true });
}

// Run a caller-supplied transaction through the same gate. For the sites that hand-roll a
// transaction (notifications, tombstone-reconcile, bulk import, the auth-gate row count): raw
// db.transaction() calls are unbounded AND ungated, so they hang forever on a wedge and add
// uncounted concurrency to the very storm the gate exists to prevent.
export function idbRun(db, executor, { write = false } = {}) {
  return boundedOp(executor, { db, write });
}

// D-3: IDB stores entity-type in 'kind' (keyPath); domain 'kind' is stashed as '_domain_kind'.
// Restore before returning to callers so they see the original domain field.
function _restoreDomainKind(r) {
  if (!r || r._domain_kind === undefined) return r;
  const { _domain_kind, ...rest } = r;
  return { ...rest, kind: _domain_kind };
}

// Atomic entity + outbox write in one transaction (serial lane — a write)
export function idbPutWithOutbox(db, entityRecord, outboxRecord) {
  return boundedOp((h) => (res, rej) => {
    const tx       = h.transaction([STORE_ENTITIES, STORE_OUTBOX], 'readwrite');
    const entities = tx.objectStore(STORE_ENTITIES);
    const outbox   = tx.objectStore(STORE_OUTBOX);
    entities.put(entityRecord);
    idbUpsertOutboxRecord(outbox, outboxRecord);
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  }, { db, write: true });
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

export { META_SYNC_KEY, STORE_ENTITIES, STORE_META, STORE_OUTBOX, STORE_NOTIFICATIONS, STORE_KIND_WMA };
export { IDB_DB_NAME, IDB_DB_VERSION } from './idb-schema.js';
