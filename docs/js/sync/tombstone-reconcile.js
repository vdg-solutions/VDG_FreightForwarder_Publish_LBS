// Pull-reconcile predicate (F-19-80 AC-05) — mirrors Rust `sync_reconcile::should_keep_local`
// clause-for-clause (see sync_reconcile.rs and its parity fixture). Bias: never resurrect a
// delete when uncertain. Consulted by DeltaPoller._applyChange before every idbPut.

import { idbRun, STORE_OUTBOX } from '../cache/idb-cache.js';

// Should a pull skip overwriting the local record with the incoming remote one?
// Clause order matters — first match wins.
export function reconcileKeepLocal(local, incoming, hasPending) {
  if (hasPending) return true; // a queued op for this (kind,id) is authoritative

  if (!local) return false; // nothing local to protect — normal first-pull insert
  if (!local._deleted) return false; // no tombstone to protect — normal overwrite

  if (incoming?._deleted) return false; // both sides agree — no conflict

  // Local is a tombstone, incoming is live — keep UNLESS incoming carries a numerically
  // comparable timestamp strictly newer than the local tombstone's.
  const localTs    = typeof local._deleted_at === 'number' ? local._deleted_at : undefined;
  const incomingTs = typeof incoming?._rev_at === 'number' ? incoming._rev_at : undefined;
  if (localTs !== undefined && incomingTs !== undefined && incomingTs > localTs) return false;
  return true; // non-comparable or local newer/equal — safe default: keep
}

// Set of "${kind}:${id}" for every row currently queued in the outbox.
export async function pendingOutboxKeys(db) {
  const set = new Set();
  if (!db) return set;
  const rows = await idbRun(db, (h) => (res, rej) => {
    const req = h.transaction(STORE_OUTBOX, 'readonly').objectStore(STORE_OUTBOX).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror   = () => rej(req.error);
  });
  for (const rec of rows) set.add(`${rec.kind}:${rec.id}`);
  return set;
}
