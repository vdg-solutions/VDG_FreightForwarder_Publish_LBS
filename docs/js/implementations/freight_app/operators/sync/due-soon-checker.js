// due-soon-checker.js — "payment due soon" main-thread handler (F-34-01, formerly F-48-01
// tiers 3/4). Now the SOLE compute path — the SW no longer loads wasm or opens IndexedDB
// (sw-due-soon.js is gone; sw.js only shows notifications from the payload built here, or
// relays DUE_SOON_WAKE to ask a live client to run this same _check()). Runs on
// vdg:wasm-ready + every vdg:entity-changed(kind:'billing'): computes via the SAME
// compute_due_soon wasm export (AC-05d — no per-tier date-window copy), updates the topbar
// bell ADDITIVELY (never overwrites notifications.js's manager-path count), and delivers
// AT MOST ONE grouped OS notification per calendar day (AC-02 once-per-day guard) — routed
// to the SW (registration.showNotification, survives the tab closing) when a controller is
// live, else a direct Notification (open-tab fallback). 100% local — repo.list('billing')
// reads the synced IndexedDB cache, never Drive/access-token (AC-05c).

import { currentSalesRepId } from '../../core_abstractions/session-roles.js';
import { PAYMENT_DUE_WARN_DAYS } from '../../../kernel/core_abstractions/util/payment-due-constants.js';
import { todayLocal } from '../../../kernel/core_abstractions/util/today-local.js';
import { hasCheckedToday, markCheckedToday } from '../../../kernel/core_abstractions/util/due-soon-guard.js';

const NOTIF_TITLE       = 'Sắp tới hạn thanh toán';
const NOTIF_TAG_PREFIX  = 'due-soon-';
const DUE_SOON_NOTIFY_MSG = 'DUE_SOON_NOTIFY';
const DUE_SOON_WAKE_MSG   = 'DUE_SOON_WAKE';

function todayStr() {
  return todayLocal();
}

function fmtVnd(n) {
  return Number(n ?? 0).toLocaleString('vi-VN');
}

// Same grouped-body shape sw-due-soon.js used to build SW-side — one notification per sales
// rep listing every due customer, not one notification per row (AC-02).
function _buildGroupBody(rows) {
  return rows
    .map((r) => `${r.customerId} — ${fmtVnd(r.amountVnd)} VND (${r.daysUntilDue}d)`)
    .join('\n');
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

  if (!rows.length) return; // nothing due-soon — badge already reflects that, no notify to route

  const today = todayStr();
  if (hasCheckedToday(today)) return; // once-per-day guard (AC-02) — already delivered today

  const tag  = `${NOTIF_TAG_PREFIX}${salesId.toLowerCase()}`;
  const body = _buildGroupBody(rows);

  // Route: a live SW controller shows the notification via registration.showNotification
  // (survives the tab closing); otherwise fall back to a direct Notification while the tab
  // is open. Never both — that was the double-fire this collapses.
  const controller = navigator.serviceWorker?.controller;
  if (controller) {
    controller.postMessage({ type: DUE_SOON_NOTIFY_MSG, title: NOTIF_TITLE, groups: [{ tag, body }] });
    markCheckedToday(today);
  } else {
    const permission = (typeof Notification !== 'undefined') ? Notification.permission : undefined;
    if (permission === 'granted') {
      new Notification(NOTIF_TITLE, { body, tag }); // eslint-disable-line no-new
      markCheckedToday(today);
    }
  }
}

export function initDueSoonChecker() {
  window.addEventListener('vdg:wasm-ready', _check);
  window.addEventListener('vdg:entity-changed', (e) => { if (e.detail?.kind === 'billing') _check(); });
  // F-34-01: a periodicsync/sync wakeup with a live client relays here instead of computing
  // in the SW (which has no wasm anymore) — this session recomputes and delivers itself.
  navigator.serviceWorker?.addEventListener('message', (ev) => {
    if (ev.data?.type === DUE_SOON_WAKE_MSG) _check();
  });
  // F-57-01: run once immediately. This module is imported from _deferredInit, which runs AFTER
  // repo-init-steps.js already dispatched vdg:wasm-ready on the critical path — so the listener
  // above was registered for an event that had fired several awaits earlier and tier 3 never ran
  // at boot. The badge only appeared once the user happened to write a billing entity, i.e. the
  // reminder reached someone already working on billing but never someone who just signed in.
  // WASM is guaranteed initialized by the time _deferredInit runs; _check() no-ops safely if not.
  _check();
}
