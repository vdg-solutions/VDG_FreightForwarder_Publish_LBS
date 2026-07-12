// Cache utility — bulk IDB patch + legacy bulkPut + BulkOrchestrator

import { idbUpsertOutboxRecord } from './outbox-dedupe.js';

const BULK_CHUNK_SIZE       = 50;
const STORE_ENTITIES        = 'entities';
const STORE_OUTBOX          = 'outbox';
const COALESCE_WINDOW_MS    = 200;
const IMPORT_BATCH_PER_KIND = 50;

/**
 * Writes entities one-by-one via repo.put but batches outbox dispatch.
 */
export async function bulkPut(repo, kind, entities) {
  if (!repo || !entities.length) return;
  for (const entity of entities) {
    await repo.put(kind, entity.id, entity);
  }
  window.dispatchEvent(new CustomEvent('vdg:outbox-changed', {
    detail: { kind, count: entities.length },
  }));
}

async function _patchChunk(db, kind, ids, patchFn) {
  return new Promise((resolve, reject) => {
    const tx       = db.transaction([STORE_ENTITIES, STORE_OUTBOX], 'readwrite');
    const entities = tx.objectStore(STORE_ENTITIES);
    const outbox   = tx.objectStore(STORE_OUTBOX);

    let pending = ids.length;
    if (pending === 0) { resolve(); return; }

    for (const id of ids) {
      const req = entities.get([kind, id]);
      req.onsuccess = () => {
        const existing = req.result;
        if (!existing) { pending--; if (pending === 0) tx.commit?.(); return; }
        const patched   = patchFn({ ...existing });
        const outboxRec = { kind, id, op: 'put', body: patched, queued_at: Date.now() };
        entities.put(patched);
        idbUpsertOutboxRecord(outbox, outboxRec);
        pending--;
        if (pending === 0) tx.commit?.();
      };
      req.onerror = () => reject(req.error);
    }

    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/**
 * Batch-patch entities in IDB by kind+ids — single readwrite tx per chunk.
 * @param {IDBDatabase} db
 * @param {string} kind
 * @param {string[]} ids
 * @param {(entity: object) => object} patchFn
 */
export async function bulkPatch(db, kind, ids, patchFn) {
  for (let i = 0; i < ids.length; i += BULK_CHUNK_SIZE) {
    await _patchChunk(db, kind, ids.slice(i, i + BULK_CHUNK_SIZE), patchFn);
  }
}

// BulkOrchestrator — debounced queue + progress events (AC-14-18-4)
export class BulkOrchestrator {
  constructor(db) {
    this._db     = db;
    this._queues = new Map(); // kind → { records[], timer, total }
  }

  // Enqueue records for a given kind; debounces flush
  queue(kind, records) {
    if (!Array.isArray(records) || records.length === 0) return;
    let entry = this._queues.get(kind);
    if (!entry) {
      entry = { records: [], timer: null, total: 0 };
      this._queues.set(kind, entry);
    }
    entry.records.push(...records);
    entry.total = entry.records.length;
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => this._flush(kind), COALESCE_WINDOW_MS);
    this._emitProgress(kind, entry.records.length, entry.records.length);
  }

  async _flush(kind) {
    const entry = this._queues.get(kind);
    if (!entry) return;
    this._queues.delete(kind);
    const { records, total } = entry;
    if (!this._db || records.length === 0) return;
    let written = 0;
    for (let i = 0; i < records.length; i += IMPORT_BATCH_PER_KIND) {
      const batch = records.slice(i, i + IMPORT_BATCH_PER_KIND);
      await this._writeBatch(kind, batch);
      written += batch.length;
      this._emitProgress(kind, written, total);
    }
    window.dispatchEvent(new CustomEvent('vdg:entity-changed', { detail: { kind } }));
    this._emitProgress(kind, total, total, true);
  }

  async _writeBatch(kind, records) {
    return new Promise((resolve, reject) => {
      const tx    = this._db.transaction(STORE_ENTITIES, 'readwrite');
      const store = tx.objectStore(STORE_ENTITIES);
      for (const r of records) store.put({ ...r, kind });
      tx.oncomplete = resolve;
      tx.onerror    = () => reject(tx.error);
    });
  }

  _emitProgress(kind, n, total, done = false) {
    window.dispatchEvent(new CustomEvent('vdg:import-progress', {
      detail: { kind, n, total, done },
    }));
  }
}
