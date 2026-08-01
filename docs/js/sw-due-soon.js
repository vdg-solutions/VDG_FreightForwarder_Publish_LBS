// sw-due-soon.js — "payment due soon" SW-side compute + notify (F-48-01 tiers 1/2).
// Dynamically imported by sw.js at call time (kept out of sw.js's own body — split
// precedent: js_bridge_fx.rs/js_bridge_commission.rs off js_bridge.rs, same 350-line cap
// reason). Runs entirely inside the SW realm: no window/document/localStorage anywhere in
// this file or its imports (idb-cache.js's openVdgDb/idbGet/idbPut/idbGetAllByIndex touch
// only indexedDB/db/Promise — AC-04c). No Drive fetch / access-token call (AC-05c) — pure
// read of the already-synced local `entities` IndexedDB store.

import { openVdgDb, idbGet, idbPut, idbGetAllByIndex } from './cache/idb-cache.js';
import { PAYMENT_DUE_WARN_DAYS } from './util/payment-due-constants.js';

const META_STORE       = 'meta';
const ENTITY_STORE     = 'entities';
const GUARD_KEY         = 'vdg.due_soon.last_check_date';
const NOTIF_TAG_PREFIX  = 'due-soon-';
// SW scope has no window/document, so the shared i18n/index.js loader (window.dispatchEvent
// on loadLocale) is not safely importable here — plain VN literals, same as every other
// piece of this file's SW-only text.
const NOTIF_TITLE = 'Sắp tới hạn thanh toán';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtVnd(n) {
  return Number(n ?? 0).toLocaleString('vi-VN');
}

// Real production loader — own wasm instance inside the SW realm (window.__vdg_wasm is not
// reachable here). Relative to the DEPLOYED layout (js/sw-due-soon.js sibling to pkg/ under
// the site root), not the source tree — see loadWasm's own doc comment for the test seam.
async function _loadWasm() {
  const mod = await import('../pkg/vdg_freight.js');
  await mod.default();
  return mod;
}

/**
 * The ONE shared SW-side due-soon check (AC-05d) — both tier 1's periodicsync handler and
 * tier 2's message-relay/one-off Background Sync handler call this exact function, never a
 * copy. `scope` is `self` in production. `injectedDb`/`loadWasm` are test-only DI seams (same
 * pattern master-scope-migrator.test.mjs uses for idb-cache.js-shaped fakes) — production
 * never passes them, so the real `openVdgDb()`/dynamic-import-of-the-deployed-pkg path is
 * unaffected.
 */
export async function runDueSoonCheck(scope, injectedDb, loadWasm = _loadWasm) {
  // Caller owns an injected connection (test/DI path) — only a self-opened
  // connection gets closed here, else the SW-held handle deadlocks the
  // page's next indexedDB.open (CHORE-25 D-1).
  const ownDb = !injectedDb;
  const db = injectedDb ?? await openVdgDb();

  try {
    const guard = await idbGet(db, META_STORE, GUARD_KEY);
    const today = todayStr();
    if (guard?.value === today) {
      return { skipped: true, reason: 'already-checked-today' };
    }

    const billing = await idbGetAllByIndex(db, ENTITY_STORE, 'by_kind', 'billing');

    const wasmMod = await loadWasm();
    const grouped = wasmMod.compute_due_soon(JSON.stringify(billing), today, PAYMENT_DUE_WARN_DAYS);

    let groupsNotified = 0;
    for (const [salesRep, rows] of Object.entries(grouped)) {
      if (!rows.length) continue;
      const body = rows
        .map((r) => `${r.customerId} — ${fmtVnd(r.amountVnd)} VND (${r.daysUntilDue}d)`)
        .join('\n');
      await scope.registration.showNotification(NOTIF_TITLE, { body, tag: `${NOTIF_TAG_PREFIX}${salesRep}` });
      groupsNotified += 1;
    }

    await idbPut(db, META_STORE, { key: GUARD_KEY, value: today });
    return { skipped: false, groupsNotified };
  } finally {
    if (ownDb) db.close();
  }
}
