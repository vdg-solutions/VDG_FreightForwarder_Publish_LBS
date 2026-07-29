// Manager Exception Command Center — F-14-09

import { isManager }        from '../../auth/auth-gate.js';
import { navigate }         from '../../router.js';
import {
  computeSortedExceptions, computeTrends, computeMttr, computePerSalesRate,
  computeEscalated, KIND_EXCEPTION, SEVERITY_BADGE_CLS,
} from '../../operators/manager/exception-composer.js';
import { bulkPut }            from '../../cache/bulk-orchestrator.js';
import { getActiveSalesReps } from '../../operators/sales-registry.js';
import { showConfirm }        from '../../helpers/show-confirm.js';
import { t }                  from '../../i18n/index.js';

const ANIMATE_OUT_MS   = 300;
const CHART_COLOR_SET  = ['#3b82f6','#f59e0b','#ef4444','#10b981','#8b5cf6','#64748b'];

let _exceptions   = [];
let _gridApi      = null;
let _selectedIds  = new Set();
let _trendChart   = null;
let _onEntity;

function getRepo()      { return window.__vdg_repo; }
function currentUser()  { return window.__vdg_auth?.getCurrentUser?.()?.email || 'manager'; }

function slaLabel(vm) {
  const ms = vm.slaRemainingMs;
  if (ms <= 0) return `<span class="text-red-600 font-medium">${t('exceptions.sla.overdue')}</span>`;
  const h  = Math.floor(ms / 3_600_000);
  const m  = Math.floor((ms % 3_600_000) / 60_000);
  const cls = vm.slaStatus === 'red' ? 'text-red-600 font-medium'
    : vm.slaStatus === 'amber' ? 'text-amber-600'
    : 'text-emerald-600';
  return `<span class="${cls}">${h}h ${m}m</span>`;
}

function buildGridCols() {
  return [
    { checkboxSelection: true, width: 40, suppressSizeToFit: true },
    { field: 'type',          headerName: t('exceptions.col.type'),     flex: 1 },
    { field: 'severity',      headerName: t('exceptions.col.severity'), width: 110,
      cellRenderer: (p) => {
        const cls = SEVERITY_BADGE_CLS[p.value] || 'bg-slate-100 text-slate-600';
        const div = document.createElement('span');
        div.className   = `px-2 py-0.5 rounded text-xs font-medium ${cls}`;
        div.textContent = p.value ? t(`exception.severity.${p.value}`) : '—';
        return div;
      } },
    { field: 'shipment_ref',  headerName: t('exceptions.col.shipment'), width: 130,
      cellRenderer: (p) => {
        if (!p.value) return '—';
        const a = document.createElement('a');
        a.className   = 'text-blue-600 underline cursor-pointer text-xs';
        a.textContent = p.value;
        a.onclick     = () => window.dispatchEvent(new CustomEvent('vdg:open-detail', { detail: { kind: 'shipment', id: p.data.id } }));
        return a;
      } },
    { headerName: t('exceptions.col.age'), width: 90,
      valueGetter: (p) => {
        const raised = p.data.raised_at || p.data.created_at;
        if (!raised) return 0;
        return Math.floor((Date.now() - new Date(raised).getTime()) / 86_400_000);
      } },
    { field: 'owner',         headerName: t('exceptions.col.owner'),    width: 110 },
    { headerName: 'SLA',      width: 120, // SLA — industry KPI abbreviation, kept per term policy
      cellRenderer: (p) => {
        const span = document.createElement('span');
        span.innerHTML = slaLabel(p.data);
        return span;
      } },
  ];
}

function mountGrid(container, rows) {
  if (_gridApi) { try { _gridApi.destroy(); } catch { /* ignore */ } _gridApi = null; }
  container.innerHTML = '<div class="ag-theme-quartz" style="height:420px"></div>';
  if (!window.agGrid) return;
  const opts = {
    columnDefs:  buildGridCols(),
    rowData:     rows,
    rowSelection: 'multiple',
    suppressRowClickSelection: true,
    defaultColDef: { sortable: true, resizable: true },
    onSelectionChanged: () => {
      const sel = _gridApi?.getSelectedRows() || [];
      _selectedIds = new Set(sel.map((r) => r.id));
      updateBulkToolbar(container.closest('[data-mgr-exc]'));
    },
  };
  const grid = new agGrid.Grid(container.querySelector('.ag-theme-quartz'), opts);
  _gridApi = grid.gridOptions?.api || opts.api;
}

function updateBulkToolbar(root) {
  if (!root) return;
  const bar = root.querySelector('#exc-bulk-toolbar');
  if (!bar) return;
  bar.classList.toggle('translate-y-full', _selectedIds.size === 0);
  root.querySelector('#exc-bulk-count').textContent = t('bulk_selected_count', { n: _selectedIds.size });
}

async function runBulkAction(root, action) {
  const repo    = getRepo();
  const now     = new Date().toISOString();
  const manager = currentUser();
  const selected = _exceptions.filter((e) => _selectedIds.has(e.id));
  if (!selected.length) return;

  if (action === 'assign') {
    const assignSelect = root.querySelector('#exc-assign-select');
    const owner = assignSelect?.value;
    if (!owner) return;
    const updated = selected.map((e) => ({ ...e, owner }));
    if (repo) await bulkPut(repo, KIND_EXCEPTION, updated);
    updated.forEach((u) => { const e = _exceptions.find((x) => x.id === u.id); if (e) e.owner = owner; });
    _gridApi?.refreshCells?.();
  } else if (action === 'acknowledge') {
    const updated = selected.map((e) => ({
      ...e, acknowledged_at: now, acknowledged_by: manager,
    }));
    if (repo) await bulkPut(repo, KIND_EXCEPTION, updated);
  } else if (action === 'escalate') {
    const updated = selected.map((e) => ({
      ...e, severity: computeEscalated(e.severity),
    }));
    if (repo) await bulkPut(repo, KIND_EXCEPTION, updated);
    updated.forEach((u) => { const e = _exceptions.find((x) => x.id === u.id); if (e) e.severity = u.severity; });
    _gridApi?.refreshCells?.();
  } else if (action === 'close') {
    const ok = await showConfirm({
      title: t('exceptions.confirm.close_title', { n: selected.length }),
      body:  t('dunning_tmpl.confirm.body'),
      confirmLabel: t('exceptions.action.close'),
      destructive:  true,
    });
    if (!ok) return;
    const updated = selected.map((e) => ({
      ...e, state: 'Closed', closed_at: now, closed_by: manager,
    }));
    if (repo) await bulkPut(repo, KIND_EXCEPTION, updated);
    // Animate out
    const grid = root.querySelector('.ag-theme-quartz');
    if (grid) {
      _gridApi?.forEachNode?.((node) => {
        if (_selectedIds.has(node.data?.id)) {
          node.data.__removing = true;
        }
      });
    }
    setTimeout(() => {
      _exceptions = _exceptions.filter((e) => !_selectedIds.has(e.id));
      _selectedIds.clear();
      const vms = computeSortedExceptions(_exceptions);
      mountGrid(root.querySelector('#exc-grid'), vms);
      updateBulkToolbar(root);
    }, ANIMATE_OUT_MS);
    return;
  }

  _selectedIds.clear();
  updateBulkToolbar(root);
}

function renderTrends(root, exceptions) {
  const trends   = computeTrends(exceptions);
  const mttr     = computeMttr(exceptions);
  const perSales = computePerSalesRate(exceptions);

  // Chart
  const ctx = root.querySelector('#exc-trend-chart');
  if (ctx && window.Chart) {
    if (_trendChart) { _trendChart.destroy(); _trendChart = null; }
    _trendChart = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: trends.weeks,
        datasets: trends.datasets.map((ds, i) => ({
          label: ds.label,
          data:  ds.data,
          borderColor: CHART_COLOR_SET[i % CHART_COLOR_SET.length],
          tension: 0.3,
          fill: false,
        })),
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } },
    });
  }

  // MTTR table
  const mttrEl = root.querySelector('#exc-mttr');
  if (mttrEl) {
    mttrEl.innerHTML = `<table class="w-full text-xs border-collapse"><thead class="bg-slate-50">
      <tr>${[t('exceptions.col.exception_type'), t('exceptions.col.avg_hours_to_close')].map((h) => `<th class="py-2 px-3 text-left text-slate-600 font-medium">${h}</th>`).join('')}</tr>
      </thead><tbody>${mttr.map((r) => `<tr><td class="py-1 px-3">${r.type}</td><td class="py-1 px-3">${r.avgHours}h</td></tr>`).join('') || `<tr><td colspan="2" class="p-3 text-slate-400">${t('exceptions.mttr.none')}</td></tr>`}</tbody></table>`;
  }

  // Per-sales table
  const psEl = root.querySelector('#exc-per-sales');
  if (psEl) {
    psEl.innerHTML = `<table class="w-full text-xs border-collapse"><thead class="bg-slate-50">
      <tr>${[t('sales_rep'), t('exceptions.col.open'), t('exceptions.col.closed_period'), t('exceptions.col.avg_resolution_h')].map((h) => `<th class="py-2 px-3 text-left text-slate-600 font-medium">${h}</th>`).join('')}</tr>
      </thead><tbody>${perSales.map((r) => `<tr><td class="py-1 px-3">${r.salesRep}</td><td class="py-1 px-3">${r.open}</td><td class="py-1 px-3">${r.closedThisPeriod}</td><td class="py-1 px-3">${r.avgResolutionHours}h</td></tr>`).join('') || `<tr><td colspan="4" class="p-3 text-slate-400">${t('no_data')}</td></tr>`}</tbody></table>`;
  }
}

export async function render(root) {
  if (!isManager()) { navigate('/dashboard'); return; }
  if (_onEntity) window.removeEventListener('vdg:entity-changed', _onEntity);
  if (_trendChart) { _trendChart.destroy(); _trendChart = null; }
  _selectedIds.clear();

  const repo = getRepo();
  if (repo) _exceptions = await repo.list(KIND_EXCEPTION, null);

  const vms = computeSortedExceptions(_exceptions);

  const repsForAssign = await getActiveSalesReps(getRepo() || window.__vdg_repo).catch(() => []);
  const assignOpts    = repsForAssign.map((r) => `<option value="${r.prefix}">${r.name}</option>`).join('');

  root.setAttribute('data-mgr-exc', '1');
  root.innerHTML = `
    <div class="p-6 space-y-5 max-w-[1600px] mx-auto" data-mgr-exc="1">
      <div id="exc-grid"></div>

      <div class="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div class="text-sm font-semibold text-slate-900">${t('exceptions.chart.trends_title')}</div>
        <div class="h-52"><canvas id="exc-trend-chart"></canvas></div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><div class="text-xs font-medium text-slate-600 mb-2">${t('exceptions.mttr.title')}</div><div id="exc-mttr"></div></div>
          <div><div class="text-xs font-medium text-slate-600 mb-2">${t('exceptions.per_sales.title')}</div><div id="exc-per-sales"></div></div>
        </div>
      </div>

      <!-- Bulk toolbar -->
      <div id="exc-bulk-toolbar"
        class="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 text-white flex items-center gap-3 px-6 py-3
               transition-transform translate-y-full">
        <span id="exc-bulk-count" class="text-sm font-medium"></span>
        <select id="exc-assign-select"
          class="text-xs bg-slate-700 text-white border border-slate-600 rounded px-2 py-1">
          <option value="">${t('exceptions.assign.placeholder')}</option>${assignOpts}
        </select>
        <button data-exc-action="assign"      class="px-3 py-1.5 text-xs bg-blue-600 rounded hover:bg-blue-700">${t('exceptions.action.assign')}</button>
        <button data-exc-action="acknowledge" class="px-3 py-1.5 text-xs bg-slate-600 rounded hover:bg-slate-500">${t('exceptions.action.acknowledge')}</button>
        <button data-exc-action="escalate"    class="px-3 py-1.5 text-xs bg-amber-600 rounded hover:bg-amber-700">${t('exceptions.action.escalate')}</button>
        <button data-exc-action="close"       class="px-3 py-1.5 text-xs bg-red-600 rounded hover:bg-red-700">${t('exceptions.action.close')}</button>
        <button id="exc-bulk-clear"           class="ml-auto px-2 py-1.5 text-xs text-slate-400 hover:text-white">${t('bulk_clear')}</button>
      </div>
    </div>`;

  mountGrid(root.querySelector('#exc-grid'), vms);
  queueMicrotask(() => renderTrends(root, _exceptions));

  root.addEventListener('click', async (e) => {
    const actionBtn = e.target.closest('[data-exc-action]');
    if (actionBtn) { await runBulkAction(root, actionBtn.dataset.excAction); return; }
    if (e.target.id === 'exc-bulk-clear') {
      _selectedIds.clear();
      _gridApi?.deselectAll?.();
      updateBulkToolbar(root);
    }
  });

  _onEntity = async (e) => {
    if (e.detail?.kind !== KIND_EXCEPTION) return;
    if (repo) _exceptions = await repo.list(KIND_EXCEPTION, null);
    const vms2 = computeSortedExceptions(_exceptions);
    mountGrid(root.querySelector('#exc-grid'), vms2);
    renderTrends(root, _exceptions);
  };
  window.addEventListener('vdg:entity-changed', _onEntity);
}
