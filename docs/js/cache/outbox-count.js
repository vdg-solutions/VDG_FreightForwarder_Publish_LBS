// True outbox row count — the single source every vdg:outbox-changed dispatcher reads from
// (F-19-80 AC-08). Extracted out of idb-cache.js to keep it under the 350-line cap.

import { idbGetAll, STORE_OUTBOX } from './idb-cache.js';

export async function countOutboxRows(db) {
  if (!db) return 0;
  const rows = await idbGetAll(db, STORE_OUTBOX);
  return rows.length;
}

// Dispatched by every enqueue/drain write path — a bare-NULL-detail dispatch is the old lie
// the badge showed (green while 118 ops sat stuck).
export async function emitOutboxChanged(db, win = window) {
  const count = await countOutboxRows(db);
  win.dispatchEvent(new CustomEvent('vdg:outbox-changed', { detail: { count } }));
}
