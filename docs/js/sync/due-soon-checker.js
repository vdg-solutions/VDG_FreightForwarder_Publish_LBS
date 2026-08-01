// due-soon-checker.js — "payment due soon" tier 3/4 main-thread handler (F-48-01).
// Runs on vdg:wasm-ready + every vdg:entity-changed(kind:'billing'): computes via the SAME
// compute_due_soon wasm export every tier calls (AC-05d — no per-tier date-window copy),
// updates the topbar bell ADDITIVELY (never overwrites notifications.js's manager-path
// count), fires a Notification per newly-due-soon row once permission is granted (tier 3 —
// skipped, not erroring, when it isn't: tier 4 floor, AC-04e), and relays a check request to
// a still-alive SW instance (tier 2(a)). 100% local — repo.list('billing') reads the synced
// IndexedDB cache, never Drive/access-token (AC-05c).

import { currentSalesRepId } from '../auth/auth-gate.js';
import { PAYMENT_DUE_WARN_DAYS } from '../util/payment-due-constants.js';

const NOTIF_TITLE = 'Sắp tới hạn thanh toán';

// One-shot per billing row this session — an entity-changed re-tick must not re-notify the
// same still-due-soon row every time.
const _notifiedIds = new Set();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Shared compute call — sales-me.js's list render and this module's badge/notify tick both
 * call this, never their own copy of the date-window logic. */
export async function computeDueSoonRows(salesId) {
  const wasm = window.__vdg_wasm;
  const repo = window.__vdg_repo;
  if (!wasm?.compute_due_soon || !repo || !salesId) return [];
  const billing = await repo.list('billing').catch(() => []);
  const grouped = wasm.compute_due_soon(JSON.stringify(billing), todayStr(), PAYMENT_DUE_WARN_DAYS);
  return grouped[salesId.toLowerCase()] || [];
}

async function _check() {
  const salesId = currentSalesRepId();
  if (!salesId) return; // manager-only session — no personal due-soon surface

  const rows = await computeDueSoonRows(salesId);
  window.dispatchEvent(new CustomEvent('vdg:due-soon-count', { detail: { count: rows.length } }));

  const permission = (typeof Notification !== 'undefined') ? Notification.permission : undefined;
  if (permission === 'granted') {
    for (const row of rows) {
      if (_notifiedIds.has(row.billingId)) continue;
      _notifiedIds.add(row.billingId);
      const body = `${row.customerId} — ${Number(row.amountVnd).toLocaleString('vi-VN')} VND (${row.daysUntilDue}d)`;
      new Notification(NOTIF_TITLE, { body, tag: `due-soon-${row.billingId}` }); // eslint-disable-line no-new
    }
  }

  // Tier 2(a): relay to a still-alive SW instance (message-relay — any browser with SW
  // support, no SyncManager/PBS permission needed).
  navigator.serviceWorker?.controller?.postMessage({ type: 'DUE_SOON_CHECK' });
}

export function initDueSoonChecker() {
  window.addEventListener('vdg:wasm-ready', _check);
  window.addEventListener('vdg:entity-changed', (e) => { if (e.detail?.kind === 'billing') _check(); });
}
