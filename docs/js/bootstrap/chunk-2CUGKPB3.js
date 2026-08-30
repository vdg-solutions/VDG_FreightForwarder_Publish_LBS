import {
  SAFE_AWAIT_DEFAULT_MS,
  safeAwait
} from "./chunk-JAZY43GR.js";

// output/web/js.tmp/implementations/kernel/core_abstractions/util/master-load.js
var RETRY_BTN_ID = "master-load-retry-btn";
async function safeMasterLoad(loadFn, tag, _ms = SAFE_AWAIT_DEFAULT_MS) {
  return safeAwait(loadFn(), _ms, null, tag);
}
function boundedList(repo, kind, tag, _ms = SAFE_AWAIT_DEFAULT_MS) {
  return safeMasterLoad(() => repo.list(kind, null), tag, _ms);
}
function foldSyncFailure(listRes, kind, repo) {
  if (!listRes.ok || listRes.value.length > 0) return listRes;
  const failedKinds = repo?.sync_failed_kinds?.() ?? [];
  if (!failedKinds.includes(kind)) return listRes;
  return { ok: false, error: new Error(`sync-failed:${kind}`) };
}
function renderMasterLoadRetryRow(tbody, colSpan, message, retryLabel, onRetry) {
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="${colSpan}" class="p-4 text-center text-xs">
    <div class="text-red-500 mb-2">${message}</div>
    <button id="${RETRY_BTN_ID}" class="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">${retryLabel}</button>
  </td></tr>`;
  tbody.querySelector(`#${RETRY_BTN_ID}`)?.addEventListener("click", onRetry);
}
function renderMasterLoadRetryStatus(statusEl, message, retryLabel, onRetry) {
  if (!statusEl) return;
  statusEl.innerHTML = `<span class="text-red-500">${message}</span>
    <button id="${RETRY_BTN_ID}" class="ml-2 text-blue-600 hover:underline">${retryLabel}</button>`;
  statusEl.querySelector(`#${RETRY_BTN_ID}`)?.addEventListener("click", onRetry);
}

export {
  safeMasterLoad,
  boundedList,
  foldSyncFailure,
  renderMasterLoadRetryRow,
  renderMasterLoadRetryStatus
};
