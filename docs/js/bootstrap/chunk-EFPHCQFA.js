import {
  t
} from "./chunk-NJFDQATX.js";

// output/web/js.tmp/implementations/ui/bootstrap/components/empty-state.js
var EMPTY_STATE_VARIANT = Object.freeze({ FILTERED: "filtered", FIRST_RUN: "first-run", LOAD_FAILED: "load-failed" });
var EMPTY_STATE_ACTION = Object.freeze({
  CLEAR_FILTER: "empty-state-clear-filter",
  CREATE: "empty-state-create",
  RETRY: "empty-state-retry"
});
var ICON_FUNNEL = `<svg class="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
</svg>`;
var ICON_BOX = `<svg class="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
</svg>`;
var ICON_WARNING = `<svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
</svg>`;
var ICON_SPARKLE = `<svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
</svg>`;
function createBtnHtml(createLabel, extraCls) {
  if (!createLabel) return "";
  return `<button type="button" data-action="${EMPTY_STATE_ACTION.CREATE}" class="${extraCls}">${createLabel}</button>`;
}
function filteredHtml({ entity, createLabel }) {
  const createBtn = createBtnHtml(
    createLabel,
    "px-4 py-2 text-xs font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200"
  );
  return `
    <div class="flex flex-col items-center justify-center gap-4 py-16" role="status" data-testid="empty-state-filtered">
      <div class="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">${ICON_FUNNEL}</div>
      <div class="text-center">
        <p class="text-sm font-semibold text-slate-700">${t("empty_state.filtered.title")}</p>
        <p class="text-xs text-slate-400 mt-1">${t("empty_state.filtered.body", { entity })}</p>
      </div>
      <div class="flex gap-2 mt-1">
        <button type="button" data-action="${EMPTY_STATE_ACTION.CLEAR_FILTER}"
          class="px-4 py-2 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors">
          ${t("empty_state.clear_filter")}
        </button>
        ${createBtn}
      </div>
    </div>`;
}
function firstRunHtml({ entity, createLabel, body }) {
  const createBtn = createBtnHtml(
    createLabel,
    "mt-1 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-md shadow-blue-200"
  );
  return `
    <div class="flex flex-col items-center justify-center gap-4 py-16" role="status" data-testid="empty-state-first-run"
         style="background:linear-gradient(180deg,#fff 0%,#f8fafc 100%)">
      <div class="relative">
        <div class="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-lg shadow-blue-100">${ICON_BOX}</div>
        <div class="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center shadow-sm">${ICON_SPARKLE}</div>
      </div>
      <div class="text-center">
        <p class="text-base font-semibold text-slate-800">${t("empty_state.first_run.title", { entity })}</p>
        <p class="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">${body || t("empty_state.first_run.body", { entity })}</p>
      </div>
      ${createBtn}
    </div>`;
}
function loadFailedHtml({ entity, skipped = 0 }) {
  const partialNote = skipped > 0 ? `<p class="text-xs text-amber-600 mt-1">${t("empty_state.load_failed.partial", { n: skipped })}</p>` : "";
  return `
    <div class="flex flex-col items-center justify-center gap-4 py-16" role="status" data-testid="empty-state-load-failed">
      <div class="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">${ICON_WARNING}</div>
      <div class="text-center">
        <p class="text-sm font-semibold text-slate-700">${t("empty_state.load_failed.title")}</p>
        <p class="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">${t("empty_state.load_failed.body", { entity })}</p>
        ${partialNote}
      </div>
      <button type="button" data-action="${EMPTY_STATE_ACTION.RETRY}"
        class="px-4 py-2 text-xs font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200">
        ${t("empty_state.load_failed.retry")}
      </button>
    </div>`;
}
function emptyStateHtml(opts) {
  if (opts.variant === EMPTY_STATE_VARIANT.LOAD_FAILED) return loadFailedHtml(opts);
  return opts.variant === EMPTY_STATE_VARIANT.FILTERED ? filteredHtml(opts) : firstRunHtml(opts);
}
var NO_LOAD_FAILURE = Object.freeze({ failed: false, skipped: 0 });
function bindEmptyStateActions(root, { onClearFilter, onCreate, onRetry } = {}) {
  if (root.dataset.emptyStateBound) return;
  root.dataset.emptyStateBound = "1";
  root.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    if (btn.dataset.action === EMPTY_STATE_ACTION.CLEAR_FILTER) onClearFilter?.();
    else if (btn.dataset.action === EMPTY_STATE_ACTION.CREATE) onCreate?.();
    else if (btn.dataset.action === EMPTY_STATE_ACTION.RETRY) onRetry?.();
  });
}
function wireGridFilterEmptyState({
  root,
  getApi,
  searchSelector,
  getTotal,
  entity,
  onCreate,
  getLoadOutcome,
  onRetry,
  filteredCreateLabel,
  firstRunCreateLabel,
  firstRunBody
}) {
  const getSearchInput = () => searchSelector ? root.querySelector(searchSelector) : null;
  const recompute = () => {
    const api = getApi();
    if (!api) return;
    const total = getTotal();
    const outcome = getLoadOutcome ? getLoadOutcome() : NO_LOAD_FAILURE;
    const variant = outcome.failed ? EMPTY_STATE_VARIANT.LOAD_FAILED : total === 0 ? EMPTY_STATE_VARIANT.FIRST_RUN : EMPTY_STATE_VARIANT.FILTERED;
    const createLabel = outcome.failed || !onCreate ? void 0 : variant === EMPTY_STATE_VARIANT.FIRST_RUN ? firstRunCreateLabel || t("empty_state.first_run.create", { entity }) : filteredCreateLabel || t("empty_state.filtered.create", { entity });
    const displayed = api.getDisplayedRowCount ? api.getDisplayedRowCount() : total;
    api.setGridOption(
      "overlayNoRowsTemplate",
      emptyStateHtml({ variant, entity, createLabel, body: firstRunBody, skipped: outcome.skipped })
    );
    if (displayed === 0) api.showNoRowsOverlay();
  };
  recompute();
  getSearchInput()?.addEventListener("input", (e) => {
    getApi()?.setGridOption("quickFilterText", e.target.value);
    recompute();
  });
  bindEmptyStateActions(root, {
    onRetry,
    onClearFilter: () => {
      const si = getSearchInput();
      if (si) si.value = "";
      getApi()?.setGridOption("quickFilterText", "");
      recompute();
    },
    onCreate
  });
}

export {
  EMPTY_STATE_VARIANT,
  emptyStateHtml,
  bindEmptyStateActions,
  wireGridFilterEmptyState
};
