import '../components/detail-panel.js';
import { resolveShipmentState } from '../util/shipment-state-resolver.js';
import { UNKNOWN_STATE } from '../util/dashboard-distribution.js';
import { ensureShipmentStateAliases } from '../util/shipment-state-aliases.js';
import { safeAwait } from '../util/safe-await.js';
import { shipmentLane } from '../util/shipment-lane.js';
import { t, fmtNumber } from '../i18n/index.js';
import { agGridLocaleText } from '../i18n/ag-grid-locale.js';
import { isManager } from '../auth/auth-gate.js';
import { showConfirm } from '../helpers/show-confirm.js';
import { chooseShipmentAffordance, runShipmentAffordance } from '../operators/shipment-void-delete.js';

const PANEL_WIDTH_PX    = 480;
const SLIDE_DURATION_MS = 250;
const NAV_HEIGHT_REM    = 3.5;
const Z_PANEL           = 40;

const GOOGLE_DRIVE_URL = '/data/10k_shipments.json';
const FSM_LEGEND_CODE  = 'FSM-01'; // status-machine badge prefix, not translatable prose — same
                                    // class as the linter's FINANCE_ABBREVS carve-out (MTD/YTD)

function statusRenderer(params) {
  const el = document.createElement('status-badge');
  el.setAttribute('state', params.value);
  el.setAttribute('fsm', 'shipment');
  return el;
}

function pnlRenderer(params) {
  const v = params.value || 0;
  const positive = v >= 0;
  const div = document.createElement('div');
  div.className = 'flex items-center gap-2';
  const bar = document.createElement('div');
  bar.className = 'w-12 h-1.5 rounded-full overflow-hidden bg-slate-100';
  const fill = document.createElement('div');
  fill.style.width = `${Math.min(100, Math.abs(v) / 100)}%`;
  fill.className = positive ? 'h-full bg-emerald-500' : 'h-full bg-red-500';
  bar.appendChild(fill);
  const label = document.createElement('span');
  label.className = `font-mono text-xs ${positive ? 'text-emerald-700' : 'text-red-700'} font-semibold`;
  label.textContent = `${positive ? '+' : ''}${fmtNumber(v)}`;
  div.appendChild(bar);
  div.appendChild(label);
  return div;
}

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

const ACTIONS_COL_WIDTH = 90;

// F-19-77 AC-01/02/05 — manager-only Void/Delete row action. Decision keys ONLY on the stored
// row (publish_state/state) — orphans surface as state==='Unknown' in the grid (F-18-11
// resolver), so the selector routes them to 'delete' without a per-row WASM NOT_FOUND probe.
function actionsRenderer(params) {
  const affordance = chooseShipmentAffordance(params.data);
  if (affordance === 'none') return document.createElement('span');
  const btn = document.createElement('button');
  btn.className = affordance === 'delete'
    ? 'text-xs px-2 py-1 rounded-md font-medium text-red-700 hover:bg-red-50'
    : 'text-xs px-2 py-1 rounded-md font-medium text-amber-700 hover:bg-amber-50';
  btn.textContent = affordance === 'delete' ? t('common.action.delete') : t('shipments.action.void');
  btn.addEventListener('click', (e) => {
    e.stopPropagation(); // AC-01/02: row action must not also open the detail panel
    handleRowAffordance(params.data, params.api);
  });
  return btn;
}

// AC-06 — same confirm thunk shape consumed by detail-panel.js's void/delete control.
function confirmAffordance(affordance) {
  return showConfirm({
    destructive: true,
    title: t(affordance === 'delete' ? 'shipments.delete_confirm.title' : 'shipments.void_confirm.title'),
    body: affordance === 'void' ? t('shipments.void_confirm.body') : undefined,
    confirmLabel: t(affordance === 'delete' ? 'common.action.delete' : 'shipments.action.void'),
    cancelLabel: t('common.action.cancel'),
  });
}

async function handleRowAffordance(row, api) {
  const result = await runShipmentAffordance({
    repo: window.__vdg_repo,
    shipment: row,
    isManager: isManager(),
    confirm: confirmAffordance,
  });
  if (!result.mutated) return;
  // AC-04: re-list — a voided row re-renders Cancelled (still present), a deleted row is
  // filtered out by the tombstone list filter.
  const rows = await loadRealData();
  api?.setGridOption('rowData', rows);
}

// Grid column headers via t() — pure, no DOM/agGrid dep so it's unit-reachable (AC-01).
export function buildColumnDefs() {
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
    { headerName: t(COLUMN_LABEL_KEY.pnl), field: 'pnl', width: 180, cellRenderer: pnlRenderer },
  ];
  // AC-05: only a manager gets the row action column at all.
  if (isManager()) {
    cols.push({
      headerName: '', field: 'actions', width: ACTIONS_COL_WIDTH, sortable: false, filter: false,
      cellRenderer: actionsRenderer,
    });
  }
  return cols;
}

const GRID_HEIGHT_PX = 560;

export function toolbar(total, isLarge) {
  return `
    <div class="flex items-center justify-between mb-4">
      <div>
        <div class="text-xs text-slate-500">${FSM_LEGEND_CODE} · ${t('active_jobs')}</div>
        <div class="text-base font-semibold text-slate-900">${total.toLocaleString()} ${t('shipments')}${isLarge ? ` <span class="text-xs font-normal text-amber-600 ml-1">${t('shipments.toolbar.virtual_scroll_demo')}</span>` : ''}</div>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative">
          <svg class="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input id="grid-search" placeholder="${t('shipments.toolbar.search_placeholder')}" class="text-sm pl-8 pr-3 py-1.5 border border-slate-200 rounded-md w-72 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
        </div>
        <button id="toggle-large" class="text-xs px-3 py-1.5 border border-slate-200 rounded-md text-slate-700 bg-white hover:bg-slate-50" title="${t('shipments.toolbar.stress_test_title')}">
          ${isLarge ? t('shipments.toolbar.normal_view') : t('shipments.toolbar.large_demo')}
        </button>
        <button id="export-csv" class="text-xs px-3 py-1.5 bg-slate-900 text-white rounded-md hover:bg-slate-800">${t('shipments.toolbar.export_csv')}</button>
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
    _bounded(repo.list('shipment', null), []),
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
    const margin = lines.reduce((acc, l) =>
      acc + (Number(l.sell_amt || l.selling_vnd_collect || 0))
          - (Number(l.buy_amt  || l.buying_vnd_pay      || 0)), 0);
    s.pnl = margin;
  }
  return allShipments;
}

let _onLocale; // module-level, mirrors pnl-report.js's teardown-then-attach handle

export async function render(root) {
  if (_onLocale) window.removeEventListener('vdg:locale-changed', _onLocale);

  const isLarge = location.hash.includes('large=1');

  root.innerHTML = `
    <div class="p-6 max-w-[1400px] mx-auto">
      <div id="grid-header">
        <div class="text-sm text-slate-500 py-4">Đang tải dữ liệu...</div>
      </div>
      <div id="grid" class="ag-theme-quartz rounded-xl overflow-hidden border border-slate-200" style="height:${GRID_HEIGHT_PX}px;"></div>
    </div>
  `;

  let rowData = [];
  if (isLarge) {
    try {
      const res = await fetch(GOOGLE_DRIVE_URL);
      rowData = await res.json();
    } catch (e) {
      console.error('Failed to load 10K demo data', e); // DEV
      rowData = [];
    }
  } else {
    rowData = await loadRealData();
  }

  const gridDiv = document.getElementById('grid');
  let api = null;
  if (window.agGrid) {
    api = window.agGrid.createGrid(gridDiv, {
      columnDefs: buildColumnDefs(),
      rowData,
      defaultColDef: { sortable: true, resizable: true, filter: true },
      rowSelection: 'single',
      onRowClicked: (e) => { document.getElementById('detail-panel')?.open(e.data); },
      animateRows: !isLarge,
      rowHeight: 38,
      headerHeight: 36,
      localeText: agGridLocaleText(),
    });
  }

  const headerDiv = document.getElementById('grid-header');
  if (headerDiv) {
    headerDiv.innerHTML = toolbar(rowData.length, isLarge);

    document.getElementById('grid-search')?.addEventListener('input', (e) => {
      api?.setGridOption('quickFilterText', e.target.value);
    });

    document.getElementById('export-csv')?.addEventListener('click', () => {
      api?.exportDataAsCsv({ fileName: 'vdg_shipments.csv' });
    });

    document.getElementById('toggle-large')?.addEventListener('click', () => {
      const next = isLarge ? '/shipments' : '/shipments?large=1';
      window.dispatchEvent(new CustomEvent('vdg:navigate', { detail: { route: next } }));
      location.hash = next;
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
}
