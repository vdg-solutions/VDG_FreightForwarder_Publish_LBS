import '../components/detail-panel.js';
import { resolveShipmentState } from '../../../kernel/core_abstractions/util/shipment-state-resolver.js';
import { UNKNOWN_STATE } from '../../../kernel/core_abstractions/util/dashboard-distribution.js';
import { ensureShipmentStateAliases } from '../../core_abstractions/ports/flows/shipment-state-aliases.js';
import { safeAwait } from '../../../kernel/core_abstractions/util/safe-await.js';
import { shipmentLane } from '../../../kernel/core_abstractions/util/shipment-lane.js';
import { t } from '../../../kernel/core_abstractions/i18n/index.js';
import { mountAgGrid } from '../../../kernel/core_abstractions/i18n/ag-grid-locale.js';
import { can } from '../../core_abstractions/ports/governance/action-guard.js';
import { listShipments } from '../../core_abstractions/ports/data/shipment-repo.js';
import { navigate } from '../router.js';
import { statusRenderer, pnlRenderer, budgetLinkRenderer, createActionsRenderer } from './shipments/cell-renderers.js';
import { wireGridFilterEmptyState } from '../components/empty-state.js';

const PANEL_WIDTH_PX    = 480;
const SLIDE_DURATION_MS = 250;
const NAV_HEIGHT_REM    = 3.5;
const Z_PANEL           = 40;

const FSM_LEGEND_CODE  = 'FSM-01'; // status-machine badge prefix, not translatable prose — same
                                    // class as the linter's FINANCE_ABBREVS carve-out (MTD/YTD)

// field -> i18n key. Generic columns reuse existing top-level keys (customer, state); the rest
// are shipments-grid-specific, namespaced like sales_me.grid.* (AC-03).
const COLUMN_LABEL_KEY = {
  ref:      'shipments.grid.ref',
  customer: 'customer',
  lane:     'shipments.grid.lane',
  vessel:   'shipments.grid.vessel',
  etd:      'shipments.grid.etd',
  eta:      'shipments.grid.eta',
  teu:      'shipments.grid.teu',
  state:    'state',
  pnl:      'shipments.grid.pnl',
};

const ACTIONS_COL_WIDTH = 150; // room for Edit + Void/Delete side by side

// Grid column headers via t() — pure, no DOM/agGrid dep so it's unit-reachable (AC-01).
/**
 * F-37-06: the columns follow the DATA this reader could actually read, never their role.
 *
 * There is no `if (role === 'CS')` here on purpose - that would put the wall back in the UI,
 * where it enforces nothing (the bytes already reached the client). CS gets no Lãi/lỗ column
 * because CS's rows carry no sell side, which is the same reason a rep sees their own and not
 * anyone else's: the folder was never granted.
 */
export function buildColumnDefs(rows = null) {
  const cols = [
    { headerName: t(COLUMN_LABEL_KEY.ref), field: 'ref', pinned: 'left', width: 140, cellClass: 'font-mono text-xs' },
    { headerName: t(COLUMN_LABEL_KEY.customer), field: 'customer', width: 170 },
    { headerName: t(COLUMN_LABEL_KEY.lane), field: 'lane', width: 140, cellClass: 'font-mono text-xs',
      valueGetter: (p) => p.data.lane ?? '—' },
    { headerName: t(COLUMN_LABEL_KEY.vessel), field: 'vessel', width: 170,
      valueGetter: (p) => `${p.data.vessel || '—'} / ${p.data.voyage || '—'}` },
    { headerName: t(COLUMN_LABEL_KEY.etd), field: 'etd', width: 110, cellClass: 'font-mono text-xs text-slate-600' },
    { headerName: t(COLUMN_LABEL_KEY.eta), field: 'eta', width: 110, cellClass: 'font-mono text-xs text-slate-600' },
    { headerName: t(COLUMN_LABEL_KEY.teu), field: 'teu', width: 70, type: 'numericColumn', cellClass: 'font-mono text-xs text-right' },
    { headerName: t(COLUMN_LABEL_KEY.state), field: 'state', width: 150, cellRenderer: statusRenderer },
  ];
  // The evidence is the DATA, not a role and not a flag: a sell figure either came back or it
  // did not, whichever door it came through (the revenue record, or pnl_line entities). And
  // `rows === null` means the caller has no list yet - keep the column rather than decide on
  // no evidence at all.
  if (rows === null || rows.some((r) => r?.pnl != null)) {
    cols.push({ headerName: t(COLUMN_LABEL_KEY.pnl), field: 'pnl', width: 180, cellRenderer: pnlRenderer });
  }
  // F-41-05: the P&L statement is the process's endpoint — every reader gets the door; what the
  // sheet shows follows what their read returned (a CS row prints cost-only, same wall as here).
  cols.push({
    headerName: '', field: 'budget', width: 70, sortable: false, filter: false,
    cellRenderer: budgetLinkRenderer,
  });
  // AC-05: the column renders only for someone who may edit, void or delete a shipment at all;
  // createActionsRenderer itself re-checks each action before drawing its own button.
  if (can('shipment.edit') || can('shipment.void')) {
    cols.push({
      headerName: '', field: 'actions', width: ACTIONS_COL_WIDTH, sortable: false, filter: false,
      cellRenderer: createActionsRenderer(loadRealData),
    });
  }
  return cols;
}

const GRID_HEIGHT_PX = 560;

export function toolbar(total) {
  return `
    <div class="flex items-center justify-between mb-4">
      <div>
        <div class="text-xs text-slate-500">${FSM_LEGEND_CODE} · ${t('active_jobs')}</div>
        <div class="text-base font-semibold text-slate-900">${total.toLocaleString()} ${t('shipments')}</div>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative">
          <svg class="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input id="grid-search" placeholder="${t('shipments.toolbar.search_placeholder')}" class="text-sm pl-8 pr-3 py-1.5 border border-slate-200 rounded-md w-72 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
        </div>
        <button id="export-csv" class="text-xs px-3 py-1.5 border border-slate-200 rounded-md text-slate-700 bg-white hover:bg-slate-50">${t('shipments.toolbar.export_csv')}</button>
        <!-- F-37-03: creating a job starts here, where the jobs are. It used to live only under
             Sales, which said the job was a rep's before anyone had named one. -->
        <!-- F-63: Auditor reads this list but may not create a shipment — the button does not
             render here at all when the decision comes back false. -->
        ${can('shipment.create') ? `<button id="new-shipment" class="text-xs px-3 py-1.5 bg-slate-900 text-white rounded-md hover:bg-slate-800">${t('shipments.new')}</button>` : ''}
      </div>
    </div>
  `;
}

// F-40-01 AC-01/AC-04: the three sources have no dependency on each other's result — fire them
// concurrently, each shielded to its own fallback BEFORE combining, so Promise.all's fail-fast
// on first rejection can never actually see one (a slow/failing source degrades alone, the grid
// still mounts with the other two).
//
// `.catch(()=>[])` only guarded REJECTIONS — a SLOW source (a cold `pnl_line` that blocks on a
// Drive full-pull while the boot migrators rate-limit Drive) stayed pending and hung the whole
// Promise.all, so the render tripped view-render's 12s bound → "Không mở được màn hình" even though
// the shipments were already cached. Bound each source: past 2.5s it degrades to its fallback and
// the grid mounts from cache now, the slow source populating later. (Interim — the real scaling
// fix is a paginated query engine, not loading every row per mount.)
const VIEW_SOURCE_MS = 2500;
const _bounded = async (p, fallback) => {
  const r = await safeAwait(p, VIEW_SOURCE_MS, null, 'shipments:load');
  return r.ok ? r.value : fallback;
};

export async function loadRealData() {
  const repo = window.__vdg_repo;
  if (!repo) return [];
  const [allShipments, allLines, aliasRows] = await Promise.all([
    _bounded(listShipments(repo, null), []),
    _bounded(repo.list('pnl_line'), []),
    _bounded(ensureShipmentStateAliases(repo), []),
  ]);
  const linesByRef = {};
  for (const l of allLines) {
    const r = l.shipment_ref;
    if (!linesByRef[r]) linesByRef[r] = [];
    linesByRef[r].push(l);
  }
  for (const s of allShipments) {
    s.ref = s.shipment_ref || s.ref;
    // F-18-11 AC-08: resolve at the call site (source, not the presentation-only status-badge
    // component) — the grid always receives a canonical code or the literal 'Unknown', never
    // a raw unresolved value.
    s.state = resolveShipmentState(s.state || s.status, aliasRows) || UNKNOWN_STATE;
    // F-36-01: route is stored as pol+pod, never a `lane` field — derive it once here so the
    // grid AND the detail-panel (opened with this same row object) both get it.
    s.lane = shipmentLane(s);
    // pnl_line entities are the aggregation source. Fall back to the shipment's embedded
    // pnl_lines for manual P&Ls saved before they materialized entities, so existing shipments
    // show revenue without a re-save.
    const lines = (linesByRef[s.ref] && linesByRef[s.ref].length) ? linesByRef[s.ref] : (s.pnl_lines || []);
    // F-37-06: with no sell side this sum is cost-only, and reporting it as the margin tells the
    // reader every job lost money. Leave it UNDEFINED - the renderer shows a dash and the column
    // is not generated at all when nobody's revenue came back.
    // Decidable only when a sell figure actually came back: the read receipt says nothing was
    // hidden from us, AND some line carries one. A job the rep has costed but not yet priced
    // gets a dash too - reporting -800 there says it lost money, when it simply has no price.
    const sellSeen = lines.some(
      (l) => l.sell_amt != null || l.selling_vnd_collect != null || l.selling_amount != null);
    s.pnl = sellSeen
      ? lines.reduce((acc, l) =>
          acc + (Number(l.sell_amt || l.selling_vnd_collect || 0))
              - (Number(l.buy_amt  || l.buying_vnd_pay      || 0)), 0)
      : undefined;
  }
  return allShipments;
}

const ENTITY_CHANGED_EVENT = 'vdg:entity-changed';
const KIND_SHIPMENT        = 'shipment';

let _onLocale;        // module-level, mirrors pnl-report.js's teardown-then-attach handle
let _onEntityChanged; // #27 — same teardown-then-attach discipline, or renders stack up per visit

export async function render(root) {
  if (_onLocale) window.removeEventListener('vdg:locale-changed', _onLocale);
  if (_onEntityChanged) window.removeEventListener(ENTITY_CHANGED_EVENT, _onEntityChanged);

  root.innerHTML = `
    <div class="p-6 max-w-[1600px] mx-auto">
      <div id="grid-header">
        <div class="text-sm text-slate-500 py-4">Đang tải dữ liệu...</div>
      </div>
      <div id="grid" class="ag-theme-quartz rounded-xl overflow-hidden border border-slate-200" style="height:${GRID_HEIGHT_PX}px;"></div>
    </div>
  `;

  const rowData = await loadRealData();
  // Rust's own session registry (sync_health.rs) — a bootstrap failure on either source kind
  // never touches loadRealData's own Promise.all (each source degrades to [] independently,
  // see _bounded's own doc comment above), so an empty grid here can mean "genuinely no
  // shipments yet" OR "the read failed and returned zero rows" with no other signal to tell
  // them apart. Checked fresh on every render, not cached — see wireGridFilterEmptyState below.
  // A LoadOutcome (empty-state.js), not a bare boolean: `skipped` is 0 here because
  // sync_failed_kinds() only knows whole-kind bootstrap failure, not a per-record skip count —
  // the type has room for that count once the read-side partial-load fix lands.
  const loadOutcome = {
    failed: (window.__vdg_repo?.sync_failed_kinds?.() ?? []).some((k) => k === KIND_SHIPMENT || k === 'pnl_line'),
    skipped: 0,
  };

  const gridDiv = document.getElementById('grid');
  let api = null;
  if (window.agGrid) {
    api = mountAgGrid(gridDiv, {
      columnDefs: buildColumnDefs(rowData),
      rowData,
      defaultColDef: { sortable: true, resizable: true, filter: true },
      rowSelection: 'single',
      onRowClicked: (e) => { document.getElementById('detail-panel')?.open(e.data); },
      rowHeight: 38,
      headerHeight: 36,
    });
  }

  const headerDiv = document.getElementById('grid-header');
  if (headerDiv) {
    headerDiv.innerHTML = toolbar(rowData.length);

    wireGridFilterEmptyState({
      root,
      getApi: () => api,
      searchSelector: '#grid-search',
      getTotal: () => rowData.length,
      getLoadOutcome: () => loadOutcome,
      onRetry: () => render(root),
      entity: t('shipments.empty.entity'),
      // F-63: omit entirely when the session may not create a shipment.
      onCreate: can('shipment.create') ? () => navigate('/shipments/new') : undefined,
      filteredCreateLabel: t('shipments.empty.create_action'),
      firstRunCreateLabel: t('shipments.empty.first_run_action'),
      firstRunBody: t('shipments.empty.first_run_body'),
    });

    document.getElementById('export-csv')?.addEventListener('click', () => {
      api?.exportDataAsCsv({ fileName: 'vdg_shipments.csv' });
    });

    document.getElementById('new-shipment')?.addEventListener('click', () => {
      navigate('/shipments/new');
    });
  }

  if (!document.getElementById('detail-panel')) {
    const panel = document.createElement('vdg-detail-panel');
    panel.id = 'detail-panel';
    panel.setAttribute('hidden', '');
    panel.className = 'fixed right-0 bg-white shadow-xl flex flex-col translate-x-full';
    panel.style.cssText = `top:${NAV_HEIGHT_REM}rem;height:calc(100vh - ${NAV_HEIGHT_REM}rem);z-index:${Z_PANEL};width:${PANEL_WIDTH_PX}px;max-width:100%;transition:transform ${SLIDE_DURATION_MS}ms ease-out`;
    document.body.appendChild(panel);
  }

  // Re-resolve #view-root at fire time — freshViewRoot() (F-19-16) detaches the captured
  // `root` node on navigation, so re-rendering into it is a silent no-op.
  _onLocale = () => {
    const liveRoot = document.getElementById('view-root');
    if (liveRoot) render(liveRoot);
  };
  window.addEventListener('vdg:locale-changed', _onLocale);

  // #27: a status transition (closing a file) writes through the repo and announces
  // vdg:entity-changed. Without this the list kept the old status until a manual reload.
  _onEntityChanged = (e) => {
    if (e?.detail?.kind && e.detail.kind !== KIND_SHIPMENT) return;
    const liveRoot = document.getElementById('view-root');
    if (liveRoot) render(liveRoot);
  };
  window.addEventListener(ENTITY_CHANGED_EVENT, _onEntityChanged);
}
