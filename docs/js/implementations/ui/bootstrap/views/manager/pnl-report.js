// Manager P&L Report — F-14-04 / F-16-07

import '../../components/pivot-table.js';
import { compose, composeBuySellBreakdown, dimsMatch, BASE_CURRENCY, PNL_DEFAULT_ROW_DIMS } from '../../../../freight_app/operators/manager/pnl-composer.js';
import { composeAir, AIR_DEFAULT_DIMS }     from '../../../../freight_app/operators/manager/air-pnl-composer.js';
import { hasRole } from '../../../../freight_app/core_abstractions/session-roles.js';
import { ROLE_MANAGER } from '../../../../freight_app/core_abstractions/roles.js';
import { navigate }                         from '../../router.js';
import { t }                                from '../../../../kernel/core_abstractions/i18n/index.js';
import { kindI18nLabel }                     from '../../../../kernel/core_abstractions/util/kind-i18n.js';
import { formatDrillDimDesc }                 from '../../../../kernel/core_abstractions/util/pnl-dim-i18n.js';
import { resolveSalesRepLabel }               from '../../../../kernel/core_abstractions/util/sales-rep-i18n.js';
import { drillLinesRowsHtml, drillLinesHeadHtml } from './pnl-drill-lines.js';
import { todayLocal } from '../../../../kernel/core_abstractions/util/today-local.js';

const PERIODS = ['MTD', 'QTD', 'YTD', 'Last12M'];
const SHEETJS_CDN = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js';

const MODE_ALL = 'All';
const MODE_SEA = 'Sea';
const MODE_AIR = 'Air';

let _period          = 'MTD';
let _mode            = MODE_ALL;
let _showComparison  = false;
let _pivotRows       = [];
let _grandTotals     = {};
let _allShipments    = [];
let _allPnlLines     = [];
// the exact shipment set the active composer grouped into _pivotRows — drill
// filters this, not the raw _allShipments, so it reconciles with the pivot cell
let _groupedShipments = [];
let _dims            = [...PNL_DEFAULT_ROW_DIMS];
let _airDims         = [...AIR_DEFAULT_DIMS];
let _sheetJsLoaded   = false;
let _onPivotClick;
let _onPivotDims;
let _onLocale;

function getRepo() { return window.__vdg_repo; }

function fmtNum(n) {
  if (!n && n !== 0) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return n.toLocaleString();
}

// Drill-grid column headers via t() — pure, no DOM/agGrid dep so it's unit-reachable.
export function buildDrillColumnDefs() {
  return [
    { field: 'shipment_ref', headerName: t('pnl.drill.col.ref'),   width: 120 },
    { field: 'customer',     headerName: t('customer'),            flex: 1    },
    { field: 'state',        headerName: t('state'),               width: 130 },
    { field: 'etd',          headerName: t('pnl.drill.col.etd'),   width: 100 },
    { field: 'margin_pct',   headerName: t('margin_pct'),          width: 90  },
    { field: 'sales_rep',    headerName: t('pnl.drill.col.sales'), width: 100 },
  ];
}

async function recompose() {
  if (_mode === MODE_AIR) {
    const { rows, grandTotals } = composeAir({
      shipments: _allShipments, pnlLines: _allPnlLines, dims: _airDims,
    });
    _pivotRows   = rows;
    _grandTotals = grandTotals;
    // air-mode drill parity is F-19-43 — composeAir doesn't report its grouped set
    // yet, keep the pre-fix (unbounded) source so air behavior is unchanged here
    _groupedShipments = _allShipments;
    return { rows, grandTotals };
  }

  // Sea or All: use existing sea composer
  const seaShipments = _mode === MODE_SEA
    ? _allShipments.filter((s) => s.mode !== 'air')
    : _allShipments;

  const activeDims = _mode === MODE_ALL
    ? ['mode', ..._dims]
    : _dims;

  const { rows, grandTotals, groupedShipments } = compose({
    shipments: seaShipments, pnlLines: _allPnlLines, period: _period, dims: activeDims,
  });

  // inject mode label for All view
  if (_mode === MODE_ALL) {
    for (const row of rows) {
      if (!row.dims.mode) row.dims.mode = '—';
    }
  }

  _pivotRows   = rows;
  _grandTotals = grandTotals;
  _groupedShipments = groupedShipments;
  return { rows, grandTotals };
}

async function renderDrillPanel(container, rowDims) {
  const refFn = (s) => s.shipment_ref || s.ShipmentRef || s.id;

  // filter the exact set the pivot grouped this cell from, via the same dim
  // resolver buildRows used to bucket it — reconciles drill count with cell count
  const filtered = _groupedShipments.filter((s) => dimsMatch(s, rowDims));
  const refs     = filtered.map(refFn);
  const dimDesc  = formatDrillDimDesc(rowDims);

  // pnl_lines belonging to the filtered shipment set (match by shipment_ref — no shipment_id on the line)
  const refSet        = new Set(refs);
  const filteredLines = _allPnlLines.filter((l) => refSet.has(l.shipment_ref || l.ShipmentRef));

  const breakdown = composeBuySellBreakdown(_allPnlLines, refs);
  const bsTrs = breakdown.map((r) => `
    <tr class="border-t border-slate-100 text-xs">
      <td class="px-3 py-1.5">${kindI18nLabel(r.kind)}</td>
      <td class="px-3 py-1.5 text-right font-mono">${fmtNum(r.buy_vnd)}</td>
      <td class="px-3 py-1.5 text-right font-mono">${fmtNum(r.sell_vnd)}</td>
      <td class="px-3 py-1.5 text-right font-mono ${r.margin_vnd >= 0 ? 'text-emerald-600' : 'text-red-500'}">${fmtNum(r.margin_vnd)}</td>
      <td class="px-3 py-1.5 text-right">${r.margin_pct.toFixed(1)}%</td>
    </tr>`).join('');

  const lineTrs = drillLinesRowsHtml(filteredLines);

  const gridRows = filtered.map((s) => ({
    id:           s.id,
    shipment_ref: refFn(s),
    customer:     s.customer || s.Customer || '—',
    lane:         `${s.pol || '?'}→${s.pod || '?'}`,
    state:        s.state || s.State || '—',
    etd:          s.etd || '—',
    margin_pct:   s.margin_pct != null ? `${Number(s.margin_pct).toFixed(1)}%` : '—',
    sales_rep:    resolveSalesRepLabel(s.sales_rep || s.SalesRep || '', window.__vdg_current_user, t) || '—',
  }));

  container.innerHTML = `
    <div class="border border-slate-200 rounded-xl p-4 bg-white">
      <div class="text-sm font-semibold text-slate-800 mb-2">
        ${dimDesc} · ${filtered.length} ${t('shipments')}
      </div>
      <div id="drill-grid" class="ag-theme-quartz" style="height:280px"></div>
      <details class="mt-4">
        <summary class="text-xs font-medium text-slate-700 cursor-pointer select-none">
          ${t('pnl.drill.buy_sell_breakdown', { currency: BASE_CURRENCY })}
        </summary>
        <table class="w-full mt-2 text-xs">
          <thead class="bg-slate-50 text-[11px] text-slate-500 uppercase">
            <tr>
              <th class="px-3 py-1.5 text-left">${t('pnl.drill.kind')}</th>
              <th class="px-3 py-1.5 text-right">${t('pnl.drill.buy')}</th>
              <th class="px-3 py-1.5 text-right">${t('pnl.drill.sell')}</th>
              <th class="px-3 py-1.5 text-right">${t('margin')}</th>
              <th class="px-3 py-1.5 text-right">${t('margin_pct')}</th>
            </tr>
          </thead>
          <tbody>${bsTrs || `<tr><td colspan="5" class="px-3 py-2 text-slate-400">${t('pnl.drill.no_line_data')}</td></tr>`}</tbody>
        </table>
      </details>
      <details class="mt-4" id="drill-lines-detail">
        <summary class="text-xs font-medium text-slate-700 cursor-pointer select-none">
          ${t('pnl.drill.cost_lines', { n: filteredLines.length })}
        </summary>
        <table class="w-full mt-2 text-xs" id="drill-lines-table">
          ${drillLinesHeadHtml()}
          <tbody>${lineTrs || `<tr><td colspan="9" class="px-3 py-2 text-slate-400">${t('pnl.drill.no_lines')}</td></tr>`}</tbody>
        </table>
      </details>
    </div>`;

  if (window.agGrid) {
    new agGrid.Grid(container.querySelector('#drill-grid'), {
      columnDefs: buildDrillColumnDefs(),
      rowData: gridRows,
      rowHeight: 32,
      onRowClicked: (ev) => {
        window.dispatchEvent(new CustomEvent('vdg:open-detail', {
          detail: { kind: 'shipment', id: ev.data.id },
        }));
      },
    });
  }
}

async function loadSheetJs() {
  if (_sheetJsLoaded || window.XLSX) { _sheetJsLoaded = true; return; }
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = SHEETJS_CDN;
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
  _sheetJsLoaded = true;
}

async function exportExcel() {
  await loadSheetJs();
  if (!window.XLSX) return;
  const XLSX   = window.XLSX;
  const header = ['Dims', 'Revenue VND', 'Cost VND', 'Margin VND', 'Margin %', '# Shipments'];
  const wsData = [header, ..._pivotRows.map((r) => [
    Object.values(r.dims).join(' · '),
    r.revenue_vnd, r.cost_vnd, r.margin_vnd, r.margin_pct / 100, r.shipment_count,
  ])];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  // Bold header + number formats
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = { font: { bold: true } };
  }
  const fmtCols = [1, 2, 3]; // revenue, cost, margin
  for (let R = 1; R <= _pivotRows.length; R++) {
    for (const C of fmtCols) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (ws[addr]) ws[addr].z = '#,##0';
    }
    const pctAddr = XLSX.utils.encode_cell({ r: R, c: 4 });
    if (ws[pctAddr]) ws[pctAddr].z = '0.0%';
  }
  const wb   = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PnL Report');
  const date = todayLocal();
  XLSX.writeFile(wb, `vdg-pnl-${_period.toLowerCase()}-${date}.xlsx`);
}

export async function render(root) {
  if (!hasRole(ROLE_MANAGER)) { navigate('/dashboard'); return; }

  if (_onPivotClick) window.removeEventListener('vdg:pivot-cell-click', _onPivotClick);
  if (_onPivotDims)  window.removeEventListener('vdg:pivot-dims-changed', _onPivotDims);
  if (_onLocale)     window.removeEventListener('vdg:locale-changed', _onLocale);

  const repo = getRepo();
  if (repo) {
    [_allShipments, _allPnlLines] = await Promise.all([
      repo.list('shipment', null),
      repo.list('pnl_line', null),
    ]);
  }

  const periodBtns = PERIODS.map((p) =>
    `<button data-period="${p}"
      class="px-3 py-1.5 text-xs rounded-lg font-medium ${p === _period ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
    >${p}</button>`).join('');

  const modeOpts = [MODE_ALL, MODE_SEA, MODE_AIR].map((m) =>
    `<option value="${m}" ${m === _mode ? 'selected' : ''}>${t(`pnl.mode.${m.toLowerCase()}`)}</option>`
  ).join('');

  root.innerHTML = `
    <div class="p-6 space-y-4 max-w-[1600px] mx-auto">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <div class="flex gap-1">${periodBtns}</div>
          <div class="flex items-center gap-1.5">
            <span class="text-xs text-slate-500">${t('pnl.mode_filter')}</span>
            <select id="sel-mode"
              class="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400">
              ${modeOpts}
            </select>
          </div>
        </div>
        <div class="flex gap-2">
          <button id="btn-compare"
            class="px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">
            ${t(_showComparison ? 'comparing_check' : 'compare')}
          </button>
          <button id="btn-export-xl"
            class="px-3 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
            ${t('export_excel')}
          </button>
        </div>
      </div>

      <div id="pivot-container"></div>
      <div id="drill-container"></div>
    </div>`;

  const pivotContainer = root.querySelector('#pivot-container');
  const drillContainer = root.querySelector('#drill-container');

  async function refreshPivot() {
    await recompose();
    pivotContainer.innerHTML = '';
    const pt = document.createElement('vdg-pivot-table');
    pt.rows           = _pivotRows;
    pt.dims           = _dims;
    pt.showComparison = _showComparison;
    pivotContainer.appendChild(pt);
  }

  await refreshPivot();

  root.addEventListener('click', async (e) => {
    const pBtn = e.target.closest('[data-period]');
    if (pBtn) {
      _period = pBtn.dataset.period;
      root.querySelectorAll('[data-period]').forEach((b) =>
        b.className = b.className.replace('bg-blue-600 text-white', 'bg-slate-100 text-slate-600 hover:bg-slate-200'));
      pBtn.className = pBtn.className.replace('bg-slate-100 text-slate-600 hover:bg-slate-200', 'bg-blue-600 text-white');
      await refreshPivot();
    }
  });

  root.querySelector('#sel-mode').addEventListener('change', async (e) => {
    _mode = e.target.value;
    await refreshPivot();
  });

  root.querySelector('#btn-compare').addEventListener('click', async () => {
    _showComparison = !_showComparison;
    root.querySelector('#btn-compare').textContent = t(_showComparison ? 'comparing_check' : 'compare');
    await refreshPivot();
  });

  root.querySelector('#btn-export-xl').addEventListener('click', exportExcel);

  _onPivotClick = (e) => { renderDrillPanel(drillContainer, e.detail.rowDims); };
  _onPivotDims  = async (e) => {
    if (_mode === MODE_AIR) { _airDims = e.detail.dims; }
    else                    { _dims    = e.detail.dims; }
    await refreshPivot();
  };

  window.addEventListener('vdg:pivot-cell-click',    _onPivotClick);
  window.addEventListener('vdg:pivot-dims-changed',  _onPivotDims);

  // Re-resolve #view-root at fire time — freshViewRoot() (F-19-16) detaches the captured
  // `root` node on navigation, so re-rendering into it is a silent no-op.
  _onLocale = () => {
    const liveRoot = document.getElementById('view-root');
    if (liveRoot) render(liveRoot);
  };
  window.addEventListener('vdg:locale-changed', _onLocale);
}
