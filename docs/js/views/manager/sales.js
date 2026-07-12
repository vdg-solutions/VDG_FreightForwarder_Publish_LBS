// Manager Sales Performance & Commission — F-14-06

import '../../components/sparkline.js';
import { isManager }           from '../../auth/auth-gate.js';
import { navigate }            from '../../router.js';
import {
  computeCommissions, computeSparkline, buildPeriodKey,
  SPARKLINE_MONTHS, KIND_SHIPMENT, KIND_PNL_LINE,
} from '../../operators/manager/commission-calculator.js';
import { compose as composeRules } from '../../operators/manager/commission-composer.js';

const DEFAULT_PERIOD_MODE    = 'month';
const KIND_COMMISSION_RULES  = 'commission_rules';
const CSV_COLS               = 'Sales Rep,Margin,TNDN 20%,Com KH/Line,Net,Sales %,Sales Share,LBS Share,Advances,Net Payable,Status';
const TOAST_AUTODISMISS_MS   = 5_000;

let _shipments  = [];
let _pnlLines   = [];
let _rules      = new Map();
let _periodMode = DEFAULT_PERIOD_MODE;
const _periodDate = new Date();
let _gridApi    = null;
let _drillId    = null;
let _onEntity;

function getRepo() { return window.__vdg_repo; }

function fmtNum(n) { return Number(n ?? 0).toLocaleString('vi-VN'); }

function currentPeriodKey() { return buildPeriodKey(_periodMode, _periodDate); }

function buildGridCols() {
  return [
    { field: 'sales',           headerName: 'Sales Rep',    flex: 1 },
    { field: 'shipments',       headerName: 'Shipments',    width: 90 },
    { field: 'margin',          headerName: 'Margin (VND)', width: 130,
      valueFormatter: ({ value }) => fmtNum(value) },
    { field: 'tndn',            headerName: 'TNDN 20%',     width: 110,
      valueFormatter: ({ value }) => fmtNum(value) },
    { field: 'salesSharePct',   headerName: 'Sales %',      width: 80,
      valueFormatter: ({ value }) => `${(value || 0).toFixed(0)}%` },
    { field: 'commission',      headerName: 'Sales Share',  width: 120,
      valueFormatter: ({ value }) => fmtNum(value) },
    { field: 'lbsShare',        headerName: 'LBS Share',    width: 110,
      valueFormatter: ({ value }) => fmtNum(value) },
    { field: 'netPayable',      headerName: 'Net Payable',  width: 120,
      valueFormatter: ({ value }) => fmtNum(value) },
    { field: 'sparkline',       headerName: 'Trend (6M)',   width: 110,
      cellRenderer: (p) => {
        const el = document.createElement('vdg-sparkline');
        el.values = p.value || [];
        return el;
      } },
    { headerName: '', width: 100, cellRenderer: (p) => {
        const btn = document.createElement('button');
        btn.className   = 'px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100';
        btn.textContent = 'Drill →';
        btn.onclick     = () => {
          _drillId = p.data.salesId;
          const url = new URL(location.href);
          url.searchParams.set('sales', _drillId);
          history.replaceState(null, '', url);
          renderDrillPanel(document.querySelector('[data-mgr-sales]'));
        };
        return btn;
      } },
  ];
}

function buildRows(commRows) {
  return commRows.map((r) => ({
    ...r,
    sales:    r.salesName || r.salesId,
    sparkline: computeSparkline(_shipments, _pnlLines, r.salesId, SPARKLINE_MONTHS),
  }));
}

function mountGrid(container, rows) {
  if (_gridApi) { try { _gridApi.destroy(); } catch { /* ignore */ } _gridApi = null; }
  container.innerHTML = '<div class="ag-theme-quartz" style="height:420px"></div>';
  if (!window.agGrid) return;
  const opts = {
    columnDefs:  buildGridCols(),
    rowData:     rows,
    defaultColDef: { sortable: true, resizable: true },
  };
  const grid = new agGrid.Grid(container.querySelector('.ag-theme-quartz'), opts);
  _gridApi = grid.gridOptions?.api || opts.api;
}

function renderPreviewTable(container, rows, periodKey) {
  if (!rows.length) {
    container.innerHTML = '<div class="text-xs text-slate-400 p-4">No closed shipments in period.</div>';
    return;
  }
  const rowHtml = rows.map((r) => `
    <tr class="${r.status === 'Settled' ? 'opacity-60' : ''}">
      <td class="py-2 px-3 text-xs">${r.salesName}</td>
      <td class="py-2 px-3 text-xs text-right">${fmtNum(r.margin)}</td>
      <td class="py-2 px-3 text-xs text-right text-red-600">${fmtNum(r.tndn)}</td>
      <td class="py-2 px-3 text-xs text-right text-amber-700">${fmtNum(r.comDeductions)}</td>
      <td class="py-2 px-3 text-xs text-right font-medium">${fmtNum(r.netAfterDeductions)}</td>
      <td class="py-2 px-3 text-xs text-center">${(r.salesSharePct || 0).toFixed(0)}%</td>
      <td class="py-2 px-3 text-xs text-right text-green-700">${fmtNum(r.commission)}</td>
      <td class="py-2 px-3 text-xs text-right text-slate-500">${fmtNum(r.lbsShare)}</td>
      <td class="py-2 px-3 text-xs text-right">${fmtNum(r.netPayable)}</td>
      <td class="py-2 px-3"><span class="px-2 py-0.5 rounded text-xs bg-slate-100">${r.status}</span></td>
    </tr>`).join('');
  container.innerHTML = `
    <table class="w-full text-left border-collapse text-xs">
      <thead class="bg-slate-50">
        <tr>${['Sales','Margin','TNDN 20%','Com KH/Line','Net','Sales %','Sales Share','LBS Share','Net Payable','Status']
          .map((h) => `<th class="py-2 px-3 font-medium text-slate-600 whitespace-nowrap">${h}</th>`).join('')}</tr>
      </thead>
      <tbody>${rowHtml}</tbody>
    </table>`;
}

async function renderDrillPanel(root) {
  const panel = root?.querySelector('#drill-panel');
  if (!panel || !_drillId) return;
  const salesName = _drillId;
  const ships     = _shipments.filter((s) => (s.sales_rep || s.SalesRep) === _drillId);
  panel.innerHTML = `
    <div class="p-4 space-y-3">
      <div class="font-semibold text-slate-900">${salesName} · Period: ${currentPeriodKey()} · ${ships.length} shipments</div>
      <div class="flex gap-2 border-b border-slate-200">
        ${['Shipments','Pipeline','Top Customers','Commission History']
          .map((t, i) => `<button data-drill-tab="${i}"
            class="px-4 py-2 text-xs font-medium ${i === 0 ? 'text-blue-700 border-b-2 border-blue-600' : 'text-slate-500'}">${t}</button>`).join('')}
      </div>
      <div id="drill-tab-content"></div>
    </div>`;

  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-drill-tab]');
    if (!btn) return;
    const idx = Number(btn.dataset.drillTab);
    panel.querySelectorAll('[data-drill-tab]').forEach((b, i) => {
      b.className = `px-4 py-2 text-xs font-medium ${i === idx ? 'text-blue-700 border-b-2 border-blue-600' : 'text-slate-500'}`;
    });
    renderDrillTab(panel.querySelector('#drill-tab-content'), idx, ships);
  });

  renderDrillTab(panel.querySelector('#drill-tab-content'), 0, ships);
}

function renderDrillTab(container, idx, ships) {
  if (!container) return;
  if (idx === 0) {
    const rows = ships.map((s) => `<tr>
      <td class="py-1 px-2 text-xs">${s.shipment_ref || s.id}</td>
      <td class="py-1 px-2 text-xs">${(s.pol || '?')}→${(s.pod || '?')}</td>
      <td class="py-1 px-2 text-xs">${s.etd || '—'}</td>
      <td class="py-1 px-2 text-xs">${s.state || '—'}</td>
    </tr>`).join('');
    container.innerHTML = `<table class="w-full text-xs border-collapse"><thead class="bg-slate-50">
      <tr>${['Ref','Lane','ETD','State'].map((h) => `<th class="py-1 px-2 text-left text-slate-600">${h}</th>`).join('')}</tr>
      </thead><tbody>${rows || '<tr><td colspan="4" class="p-3 text-slate-400">No shipments.</td></tr>'}</tbody></table>`;
  } else if (idx === 1) {
    const stages = ['Lead','Quote','Won','Closed'];
    const counts = stages.map((st) => ships.filter((s) => (s.state || s.State || '') === st).length);
    const maxC   = Math.max(...counts, 1);
    container.innerHTML = `<div class="space-y-2 p-2">${stages.map((st, i) => `
      <div class="flex items-center gap-2 text-xs">
        <span class="w-20 text-slate-500">${st}</span>
        <div class="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
          <div class="h-4 bg-blue-500 rounded-full" style="width:${(counts[i]/maxC*100).toFixed(0)}%"></div>
        </div>
        <span class="w-6 text-right">${counts[i]}</span>
      </div>`).join('')}</div>`;
  } else if (idx === 2) {
    const custMap = {};
    for (const s of ships) {
      const c = s.customer || s.Customer || '—';
      custMap[c] = (custMap[c] || 0) + Number(s.selling_vnd ?? 0);
    }
    const top5 = Object.entries(custMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    container.innerHTML = `<table class="w-full text-xs border-collapse"><thead class="bg-slate-50">
      <tr><th class="py-1 px-2 text-left text-slate-600">Customer</th><th class="py-1 px-2 text-right text-slate-600">Revenue (VND)</th></tr>
      </thead><tbody>${top5.map(([c, v]) => `<tr><td class="py-1 px-2">${c}</td><td class="py-1 px-2 text-right">${fmtNum(v)}</td></tr>`).join('')}</tbody></table>`;
  } else {
    container.innerHTML = '<div class="text-xs text-slate-400 p-3">No commission history available.</div>';
  }
}

function exportCsv(rows, periodKey) {
  const date = new Date().toISOString().slice(0, 10);
  const lines = [CSV_COLS,
    ...rows.map((r) => [
      r.salesName, r.margin, r.tndn, r.comDeductions,
      r.netAfterDeductions, r.salesSharePct?.toFixed(0),
      r.commission, r.lbsShare, r.advances, r.netPayable, r.status,
    ].join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a    = Object.assign(document.createElement('a'), {
    href:     URL.createObjectURL(blob),
    download: `vdg-sales-commission-${periodKey}-${date}.csv`,
  });
  a.click();
}

export async function render(root) {
  if (!isManager()) { navigate('/dashboard'); return; }
  if (_onEntity) window.removeEventListener('vdg:entity-changed', _onEntity);

  root.setAttribute('data-mgr-sales', '1');

  const repo = getRepo();
  if (repo) {
    [_shipments, _pnlLines] = await Promise.all([
      repo.list(KIND_SHIPMENT, null),
      repo.list(KIND_PNL_LINE, null),
    ]);
    const composed = await composeRules(repo);
    _rules = composed.rules;
  }

  root.innerHTML = `
    <div class="p-6 space-y-5 max-w-[1600px] mx-auto" data-mgr-sales="1">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex gap-2">
          ${['month','quarter','year'].map((m) => `
            <button data-period-mode="${m}"
              class="px-3 py-1.5 text-xs rounded-lg ${m === _periodMode ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">${m.charAt(0).toUpperCase()+m.slice(1)}</button>`).join('')}
        </div>
        <button id="btn-export" class="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Export CSV</button>
      </div>

      <div id="leaderboard-grid"></div>

      <div id="commission-preview" class="bg-white rounded-xl border border-slate-200">
        <div class="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div class="text-sm font-semibold text-slate-900">Commission Preview — ${currentPeriodKey()}</div>
          <button id="btn-calc" class="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Calculate</button>
        </div>
        <div id="preview-table" class="p-4"></div>
        <div class="px-5 pb-4">
          <button id="btn-settle-link" disabled
            class="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40">
            Approve &amp; Settle →
          </button>
        </div>
      </div>

      <div id="drill-panel" class="bg-white rounded-xl border border-slate-200 hidden"></div>
    </div>`;

  function refreshLeaderboard() {
    const commRows = computeCommissions(_shipments, _pnlLines, _rules, [], currentPeriodKey());
    mountGrid(root.querySelector('#leaderboard-grid'), buildRows(commRows));
  }

  refreshLeaderboard();

  root.addEventListener('click', async (e) => {
    const modeBtn = e.target.closest('[data-period-mode]');
    if (modeBtn) {
      _periodMode = modeBtn.dataset.periodMode;
      root.querySelectorAll('[data-period-mode]').forEach((b) => {
        const active = b.dataset.periodMode === _periodMode;
        b.className = `px-3 py-1.5 text-xs rounded-lg ${active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`;
      });
      refreshLeaderboard();
    }
  });

  root.querySelector('#btn-calc').addEventListener('click', () => {
    const rows = computeCommissions(_shipments, _pnlLines, _rules, [], currentPeriodKey());
    renderPreviewTable(root.querySelector('#preview-table'), rows, currentPeriodKey());
    const hasPending = rows.some((r) => r.status === 'Pending');
    root.querySelector('#btn-settle-link').disabled = !hasPending;
  });

  root.querySelector('#btn-settle-link').addEventListener('click', () => {
    navigate(`/manager/finance/commissions?period=${currentPeriodKey()}`);
  });

  root.querySelector('#btn-export').addEventListener('click', () => {
    const rows = computeCommissions(_shipments, _pnlLines, _rules, [], currentPeriodKey());
    exportCsv(rows, currentPeriodKey());
  });

  // Drill panel from URL
  const urlSales = new URLSearchParams(location.search).get('sales');
  if (urlSales) {
    _drillId = urlSales;
    root.querySelector('#drill-panel')?.classList.remove('hidden');
    renderDrillPanel(root);
  }

  _onEntity = async (e) => {
    // View navigated away → drop the leaked window listener instead of touching a stale root.
    if (!root.isConnected) { window.removeEventListener('vdg:entity-changed', _onEntity); return; }
    const kind = e.detail?.kind;
    if (kind !== KIND_SHIPMENT && kind !== KIND_COMMISSION_RULES) return;
    if (repo) {
      [_shipments, _pnlLines] = await Promise.all([repo.list(KIND_SHIPMENT, null), repo.list(KIND_PNL_LINE, null)]);
      const composed = await composeRules(repo);
      _rules = composed.rules;
    }
    refreshLeaderboard();
  };
  window.addEventListener('vdg:entity-changed', _onEntity);
}
