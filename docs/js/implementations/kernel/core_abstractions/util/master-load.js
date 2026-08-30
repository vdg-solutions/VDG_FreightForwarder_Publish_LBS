// master-load.js — bounded master-data load + actionable retry fallback (F-20-01).
// Shared by every master view (seed-migrated or auto-seeded) so a stalled Drive
// read/write on a freshly provisioned workspace can never leave the page stuck
// at "Đang tải…"/"Loading...". No page-specific logic lives here.

import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from './safe-await.js';

const RETRY_BTN_ID = 'master-load-retry-btn';

// Bound an arbitrary load sequence (seed migrations + repo.list, or repo.list alone).
// loadFn: () => Promise<T>. Returns { ok, value } — never throws, never hangs past _ms.
// _ms — injectable timeout (unit-test seam, mirrors util/view-loader.js::loadView).
export async function safeMasterLoad(loadFn, tag, _ms = SAFE_AWAIT_DEFAULT_MS) {
  return safeAwait(loadFn(), _ms, null, tag);
}

// Bounded repo.list — for callers that just need the settled result.
export function boundedList(repo, kind, tag, _ms = SAFE_AWAIT_DEFAULT_MS) {
  return safeMasterLoad(() => repo.list(kind, null), tag, _ms);
}

// F-?? (masters outage collapse): repo.list() always answers from the local cache, so an outage
// with nothing cached yet still resolves { ok: true, value: [] } — indistinguishable from a
// genuinely empty master table. `sync_health` (Rust) already knows the difference: any kind whose
// bootstrap/push failed this session and has not since recovered shows up in
// `repo.sync_failed_kinds()`, the same synchronous registry shipments.js/pnl-report.js already
// read for their own load-outcome checks. Fold that fact into `listRes` here — ONE place, so
// every master view's existing `if (!listRes.ok)` retry branch fires on an outage it would
// otherwise render as "nothing here yet, create your first record."
//
// Never overrides a NON-empty result: stale cached rows during an outage must still render (the
// stale-while-revalidate contract `wasm_repo.rs::list` already promises) — this only closes the
// gap where an empty cache and a real failure would otherwise collapse into each other.
export function foldSyncFailure(listRes, kind, repo) {
  if (!listRes.ok || listRes.value.length > 0) return listRes;
  const failedKinds = repo?.sync_failed_kinds?.() ?? [];
  if (!failedKinds.includes(kind)) return listRes;
  return { ok: false, error: new Error(`sync-failed:${kind}`) };
}

// Actionable retry row — replaces a colspan "Đang tải…" placeholder inside a <tbody>.
export function renderMasterLoadRetryRow(tbody, colSpan, message, retryLabel, onRetry) {
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="${colSpan}" class="p-4 text-center text-xs">
    <div class="text-red-500 mb-2">${message}</div>
    <button id="${RETRY_BTN_ID}" class="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">${retryLabel}</button>
  </td></tr>`;
  tbody.querySelector(`#${RETRY_BTN_ID}`)?.addEventListener('click', onRetry);
}

// Actionable retry status line — replaces a "Loading..." status text used by the
// CRUD-grid master views (airports, airline-carriers, flights, uld-types, air-rates).
export function renderMasterLoadRetryStatus(statusEl, message, retryLabel, onRetry) {
  if (!statusEl) return;
  statusEl.innerHTML = `<span class="text-red-500">${message}</span>
    <button id="${RETRY_BTN_ID}" class="ml-2 text-blue-600 hover:underline">${retryLabel}</button>`;
  statusEl.querySelector(`#${RETRY_BTN_ID}`)?.addEventListener('click', onRetry);
}
