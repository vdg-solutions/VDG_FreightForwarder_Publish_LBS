import {
  SAFE_AWAIT_DEFAULT_MS,
  safeAwait
} from "./chunk-JAZY43GR.js";
import {
  fetchText,
  nowMs
} from "./chunk-NPO6NGQC.js";

// output/web/js.tmp/implementations/kernel/core_abstractions/util/master-load.js
var RETRY_BTN_ID = "master-load-retry-btn";
async function safeMasterLoad(loadFn, tag, _ms = SAFE_AWAIT_DEFAULT_MS) {
  return safeAwait(loadFn(), _ms, null, tag);
}
function boundedList(repo, kind, tag, _ms = SAFE_AWAIT_DEFAULT_MS) {
  return safeMasterLoad(() => repo.list(kind, null), tag, _ms);
}
async function boundedSeedIfEmpty(repo, kind, seedUrl, items, genId, tag, _ms = SAFE_AWAIT_DEFAULT_MS) {
  if (items.length > 0) return items;
  const res = await safeMasterLoad(async () => {
    const text = await fetchText(seedUrl);
    if (text == null) return items;
    const lines = text.trim().split("\n").filter(Boolean);
    const seeded = [];
    const _deadline = nowMs() + _ms;
    for (const line of lines) {
      if (nowMs() >= _deadline) break;
      const entry = JSON.parse(line);
      if (!entry.id) entry.id = genId(entry);
      const putRes = await safeAwait(repo.put(kind, entry.id, entry), Math.max(0, _deadline - nowMs()), null, `${tag}:put`);
      if (!putRes.ok) continue;
      seeded.push(entry);
    }
    return seeded;
  }, tag, _ms);
  return res.ok ? res.value : items;
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
  boundedSeedIfEmpty,
  renderMasterLoadRetryRow,
  renderMasterLoadRetryStatus
};
