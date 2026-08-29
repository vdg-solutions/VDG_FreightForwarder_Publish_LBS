// empty-state.js — shared "no rows" card for grid views (Variant C, owner-picked).
//
// The grids used to collapse two different situations into one generic AG Grid
// "noRowsToShow" overlay: FILTERED (data exists, the current filter matches none of it)
// and FIRST_RUN (no records exist at all). A user who filtered too narrowly must not be
// told the workspace is empty — this renders a different message + actions for each.
//
// emptyStateHtml() returns a markup string (for AG Grid's overlayNoRowsTemplate, which
// only accepts a string, not a DOM node). bindEmptyStateActions() wires the buttons via
// one delegated listener on an ancestor, since AG Grid re-creates the overlay DOM node
// on every show and a per-render addEventListener would get lost.
import { t } from '../../../kernel/core_abstractions/i18n/index.js';

// LOAD_FAILED (F-??): a view whose read errored or whose backing kind is known-failed this
// session (window.__vdg_repo.sync_failed_kinds()) — never rendered as FIRST_RUN. Confusing "the
// load broke" with "there is genuinely nothing here yet" is the exact defect this variant exists
// to close: the two used to collapse into the same friendly onboarding copy.
export const EMPTY_STATE_VARIANT = Object.freeze({ FILTERED: 'filtered', FIRST_RUN: 'first-run', LOAD_FAILED: 'load-failed' });
export const EMPTY_STATE_ACTION  = Object.freeze({
  CLEAR_FILTER: 'empty-state-clear-filter',
  CREATE:       'empty-state-create',
  RETRY:        'empty-state-retry',
});

const ICON_FUNNEL = `<svg class="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
</svg>`;

const ICON_BOX = `<svg class="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
</svg>`;

const ICON_WARNING = `<svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
</svg>`;

const ICON_SPARKLE = `<svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
</svg>`;

function createBtnHtml(createLabel, extraCls) {
  if (!createLabel) return '';
  return `<button type="button" data-action="${EMPTY_STATE_ACTION.CREATE}" class="${extraCls}">${createLabel}</button>`;
}

function filteredHtml({ entity, createLabel }) {
  const createBtn = createBtnHtml(createLabel,
    'px-4 py-2 text-xs font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200');
  return `
    <div class="flex flex-col items-center justify-center gap-4 py-16" role="status" data-testid="empty-state-filtered">
      <div class="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">${ICON_FUNNEL}</div>
      <div class="text-center">
        <p class="text-sm font-semibold text-slate-700">${t('empty_state.filtered.title')}</p>
        <p class="text-xs text-slate-400 mt-1">${t('empty_state.filtered.body', { entity })}</p>
      </div>
      <div class="flex gap-2 mt-1">
        <button type="button" data-action="${EMPTY_STATE_ACTION.CLEAR_FILTER}"
          class="px-4 py-2 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors">
          ${t('empty_state.clear_filter')}
        </button>
        ${createBtn}
      </div>
    </div>`;
}

function firstRunHtml({ entity, createLabel, body }) {
  const createBtn = createBtnHtml(createLabel,
    'mt-1 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-md shadow-blue-200');
  return `
    <div class="flex flex-col items-center justify-center gap-4 py-16" role="status" data-testid="empty-state-first-run"
         style="background:linear-gradient(180deg,#fff 0%,#f8fafc 100%)">
      <div class="relative">
        <div class="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-lg shadow-blue-100">${ICON_BOX}</div>
        <div class="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center shadow-sm">${ICON_SPARKLE}</div>
      </div>
      <div class="text-center">
        <p class="text-base font-semibold text-slate-800">${t('empty_state.first_run.title', { entity })}</p>
        <p class="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">${body || t('empty_state.first_run.body', { entity })}</p>
      </div>
      ${createBtn}
    </div>`;
}

/// LOAD_FAILED: the read errored, or the kind it reads is known-failed this session
/// (`window.__vdg_repo.sync_failed_kinds()`) — a warning card + retry, never the onboarding
/// "create your first {entity}" copy (that copy tells a real reader to start fresh work on top
/// of data that may already exist but simply did not load).
///
/// `skipped` widens this beyond a bare pass/fail: a sibling fix on the read side lets a
/// collection load PARTIALLY now — N good records, M skipped because one bad record used to
/// abort the whole read (`LoadOutcome` below). A caller that already collapsed its own read
/// result down to a boolean before reaching here has nowhere left to carry that count from.
function loadFailedHtml({ entity, skipped = 0 }) {
  const partialNote = skipped > 0
    ? `<p class="text-xs text-amber-600 mt-1">${t('empty_state.load_failed.partial', { n: skipped })}</p>`
    : '';
  return `
    <div class="flex flex-col items-center justify-center gap-4 py-16" role="status" data-testid="empty-state-load-failed">
      <div class="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">${ICON_WARNING}</div>
      <div class="text-center">
        <p class="text-sm font-semibold text-slate-700">${t('empty_state.load_failed.title')}</p>
        <p class="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">${t('empty_state.load_failed.body', { entity })}</p>
        ${partialNote}
      </div>
      <button type="button" data-action="${EMPTY_STATE_ACTION.RETRY}"
        class="px-4 py-2 text-xs font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200">
        ${t('empty_state.load_failed.retry')}
      </button>
    </div>`;
}

/**
 * @param {object} opts
 * @param {'filtered'|'first-run'|'load-failed'} opts.variant
 * @param {string} opts.entity - lowercase, localized entity noun (interpolated into the sentence)
 * @param {string} [opts.createLabel] - localized CTA label; omit to render without a create action
 * @param {string} [opts.body] - first-run only: override the generic body (e.g. the owner's
 *   literal shipments copy) instead of the generic "{entity} first record" template
 * @param {number} [opts.skipped] - load-failed only: records skipped this load (0 = none/unknown)
 */
export function emptyStateHtml(opts) {
  if (opts.variant === EMPTY_STATE_VARIANT.LOAD_FAILED) return loadFailedHtml(opts);
  return opts.variant === EMPTY_STATE_VARIANT.FILTERED ? filteredHtml(opts) : firstRunHtml(opts);
}

/**
 * The load-outcome type a view's read produces, widened beyond pass/fail (owner: a sibling read-
 * side fix lets a collection load land as "N good, M skipped" instead of aborting the whole
 * collection on one bad record — this type is where that count has to live, not collapsed to a
 * boolean at the point a view first learns it). `failed` alone still gates the LOAD_FAILED card;
 * `skipped` rides along so the card can say how much was lost even on an otherwise-successful load.
 * @typedef {{ failed: boolean, skipped: number }} LoadOutcome
 */
export const NO_LOAD_FAILURE = Object.freeze({ failed: false, skipped: 0 });

/**
 * Delegated click handler for the buttons above. Bind once on an ancestor that stays mounted
 * across re-renders (the view root, not the grid div — AG Grid replaces the overlay node on
 * every show/hide, so a listener attached to the overlay itself would never fire twice). Some
 * views (masters-carriers/customers/services) re-render their toolbar header — and call this
 * wiring again — on every add/reload against the same root; the dataset flag keeps that from
 * stacking duplicate listeners that would fire the actions N times.
 */
export function bindEmptyStateActions(root, { onClearFilter, onCreate, onRetry } = {}) {
  if (root.dataset.emptyStateBound) return;
  root.dataset.emptyStateBound = '1';
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === EMPTY_STATE_ACTION.CLEAR_FILTER) onClearFilter?.();
    else if (btn.dataset.action === EMPTY_STATE_ACTION.CREATE) onCreate?.();
    else if (btn.dataset.action === EMPTY_STATE_ACTION.RETRY) onRetry?.();
  });
}

/**
 * Wires an AG Grid quick-filter search box to the two-state overlay in one call — every
 * grid view here follows the same shape (an unfiltered row count + a search input), so the
 * FILTERED vs FIRST_RUN decision and the clear/create actions live here once instead of being
 * re-derived per view.
 *
 * `searchSelector` (not a live element) because a few views replace the toolbar header —
 * and the search input along with it — on every reload; re-querying by selector each time
 * this fires means clear-filter always reaches the CURRENT input, never a detached one.
 *
 * The filtered and first-run CTAs are DIFFERENT strings on purpose — "+ Thêm {entity} mới"
 * (add) vs "Tạo {entity} đầu tiên" (create your first) is onboarding language, not a relabeled
 * add button. Each defaults to the generic, entity-interpolated template; a view whose own
 * verb convention doesn't fit the generic form (shipments/sales_me use "Tạo", not "Thêm";
 * quote_list's toolbar carries no verb at all) passes its own literal override instead — same
 * escape hatch as `firstRunBody`.
 *
 * @param {object} opts
 * @param {HTMLElement} opts.root - ancestor to query the search input from + delegate clicks on
 * @param {() => object} opts.getApi - returns the current AG Grid api (created after the grid mounts)
 * @param {string} [opts.searchSelector] - CSS selector for the quick-filter text input, if any
 * @param {() => number} opts.getTotal - unfiltered row count (not the displayed/filtered count)
 * @param {string} opts.entity - localized, lowercase entity noun
 * @param {() => void} [opts.onCreate] - omit entirely to render the overlay without a create action
 * @param {string} [opts.filteredCreateLabel] - override for the filtered-state CTA (default: `empty_state.filtered.create`)
 * @param {string} [opts.firstRunCreateLabel] - override for the first-run CTA (default: `empty_state.first_run.create`)
 * @param {string} [opts.firstRunBody] - override the generic first-run body (owner's literal copy)
 * @param {() => LoadOutcome} [opts.getLoadOutcome] - the read's own outcome (see `LoadOutcome`
 *   above), not a bare boolean: `failed` forces the LOAD_FAILED variant regardless of `total` — a
 *   failed load returning zero rows must never be read as "genuinely empty" (the exact defect
 *   this param exists to close) — and `skipped` carries a partial-load count through to the card
 *   even when `failed` is false. Omit entirely for a source that cannot fail (a pure client-side
 *   computation) — treated the same as `NO_LOAD_FAILURE`.
 * @param {() => void} [opts.onRetry] - LOAD_FAILED's action; omit to render the card with no button
 */
export function wireGridFilterEmptyState({
  root, getApi, searchSelector, getTotal, entity, onCreate, getLoadOutcome, onRetry,
  filteredCreateLabel, firstRunCreateLabel, firstRunBody,
}) {
  const getSearchInput = () => (searchSelector ? root.querySelector(searchSelector) : null);

  const recompute = () => {
    const api = getApi();
    if (!api) return;
    const total   = getTotal();
    const outcome = getLoadOutcome ? getLoadOutcome() : NO_LOAD_FAILURE;
    const variant     = outcome.failed ? EMPTY_STATE_VARIANT.LOAD_FAILED
      : total === 0 ? EMPTY_STATE_VARIANT.FIRST_RUN : EMPTY_STATE_VARIANT.FILTERED;
    const createLabel = outcome.failed || !onCreate ? undefined
      : variant === EMPTY_STATE_VARIANT.FIRST_RUN
        ? (firstRunCreateLabel || t('empty_state.first_run.create', { entity }))
        : (filteredCreateLabel || t('empty_state.filtered.create', { entity }));
    const displayed = api.getDisplayedRowCount ? api.getDisplayedRowCount() : total;
    api.setGridOption('overlayNoRowsTemplate',
      emptyStateHtml({ variant, entity, createLabel, body: firstRunBody, skipped: outcome.skipped }));
    if (displayed === 0) api.showNoRowsOverlay();
  };

  recompute();
  getSearchInput()?.addEventListener('input', (e) => {
    getApi()?.setGridOption('quickFilterText', e.target.value);
    recompute();
  });
  bindEmptyStateActions(root, {
    onRetry,
    onClearFilter: () => {
      const si = getSearchInput();
      if (si) si.value = '';
      getApi()?.setGridOption('quickFilterText', '');
      recompute();
    },
    onCreate,
  });
}
