// Manager Dashboard — F-14-01

import { compose, LAYOUT_DEBOUNCE_MS, ACTIVITY_FEED_MAX, TOP_CUSTOMERS_MAX } from '../../operators/manager/dashboard-composer.js';
import { isManager } from '../../auth/auth-gate.js';
import { navigate } from '../../router.js';
import { idbGet, idbPut } from '../../cache/idb-cache.js';
import { getActiveSalesReps } from '../../operators/sales-registry.js';
import { readMode, DEFAULT_MODE } from '../../components/topbar-mode-toggle.js';

const DEFAULT_WIDGET_LAYOUT = [
  { id: 'revenue-chart',  span: 2 }, { id: 'carrier-donut', span: 1 },
  { id: 'top-customers',  span: 1 }, { id: 'leaderboard',   span: 2 },
  { id: 'heatmap',        span: 2 }, { id: 'exceptions',    span: 1 },
  { id: 'cutoffs',        span: 1 }, { id: 'ar-buckets',    span: 1 },
  { id: 'cash-forecast',  span: 1 }, { id: 'activity-feed', span: 1 },
];
const CHART_BAR_COLOR_REV  = 'rgba(59,130,246,0.7)';
const CHART_BAR_COLOR_COST = 'rgba(248,113,113,0.7)';
const PERIODS              = ['Today', 'Week', 'Month', 'Quarter', 'Year'];
const PREFS_META_KEY       = 'preferences';

let _period      = 'Month';
let _salesFilter = null;
let _mode        = DEFAULT_MODE;
let _data        = null;
let _charts      = {};
let _db          = null;
let _debounce    = null;
let _feedEl      = null;
let _onEntityChanged;
let _onPeriodChanged;
let _onSyncError;
let _onModeChange;

function destroyCharts() {
  Object.values(_charts).forEach((c) => c?.destroy?.());
  _charts = {};
}

function fmtNum(n) {
  if (!n && n !== 0) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function fmtPct(n) { return `${Number(n || 0).toFixed(1)}%`; }

function kpiCard(label, value, tone) {
  return `<kpi-card label="${label}" value="${value}" tone="${tone}"></kpi-card>`;
}

const VOLUME_LABEL_DISPLAY = {
  'manager.kpi.teu':           'TEU',
  'manager.kpi.chargeable_kg': 'Chargeable kg',
  'manager.kpi.mixed':         'Volume',
};

function renderKpis(kpis) {
  const pendTone  = kpis.pendingApprovals > 0 ? 'amber' : 'blue';
  const excTone   = kpis.openExceptions   > 0 ? 'red'   : 'blue';
  const arTone    = kpis.arOverdue        > 0 ? 'red'   : 'blue';
  const volLabel  = VOLUME_LABEL_DISPLAY[kpis.volumeLabelKey] ?? 'Volume';
  const volValue  = kpis.volumeValue !== null && kpis.volumeValue !== undefined
    ? fmtNum(kpis.volumeValue) : '—';
  return [
    kpiCard('Revenue MTD',        fmtNum(kpis.revenue),          'blue'),
    kpiCard('Cost MTD',           fmtNum(kpis.cost),             'slate'),
    kpiCard('Margin MTD',         fmtNum(kpis.margin),           kpis.margin >= 0 ? 'green' : 'red'),
    kpiCard('Margin %',           fmtPct(kpis.marginPct),        'green'),
    kpiCard('Active Jobs',        kpis.activeCount,              'blue'),
    kpiCard('Pending Approvals',  kpis.pendingApprovals,         pendTone),
    kpiCard('Open Exceptions',    kpis.openExceptions,           excTone),
    kpiCard('AR Overdue >30d',    kpis.arOverdue,                arTone),
    kpiCard(volLabel,             volValue,                       'blue'),
  ].join('');
}

function exportWidgetCsv(slug, rows, headers) {
  const csv  = [headers.join(','), ...rows.map((r) => headers.map((h) => r[h] ?? '').join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = `vdg-${slug}-${date}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

function handleExport(slug) {
  if (!_data) return;
  if (slug === 'leaderboard') {
    exportWidgetCsv('leaderboard', _data.leaderboard,
      ['sales', 'shipments', 'revenue', 'margin', 'marginPct']);
  } else if (slug === 'top-customers') {
    exportWidgetCsv('top-customers', _data.topCustomers.slice(0, TOP_CUSTOMERS_MAX),
      ['customer', 'revenue', 'margin']);
  } else if (slug === 'revenue-chart') {
    const rows = _data.monthly.labels.map((l, i) => ({
      month: l, revenue: _data.monthly.revenue[i], cost: _data.monthly.cost[i],
    }));
    exportWidgetCsv('revenue-chart', rows, ['month', 'revenue', 'cost']);
  }
}

function renderRevenueChart(monthly) {
  const ctx = document.getElementById('mgr-bar-chart');
  if (!ctx || !window.Chart) return;
  _charts.bar?.destroy();
  _charts.bar = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthly.labels,
      datasets: [
        { label: 'Revenue', data: monthly.revenue, backgroundColor: CHART_BAR_COLOR_REV },
        { label: 'Cost',    data: monthly.cost,    backgroundColor: CHART_BAR_COLOR_COST },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } },
  });
}

function renderCarrierDonut(leaderboard) {
  const ctx = document.getElementById('mgr-donut-chart');
  if (!ctx || !window.Chart) return;
  const DONUT_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6'];
  _charts.donut?.destroy();
  _charts.donut = new window.Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: leaderboard.map((r) => r.sales),
      datasets: [{ data: leaderboard.map((r) => r.revenue), backgroundColor: DONUT_COLORS, borderWidth: 0 }],
    },
    options: { cutout: '65%', plugins: { legend: { position: 'right' } }, maintainAspectRatio: false },
  });
}

function prependActivity(text) {
  if (!_feedEl) return;
  const li = document.createElement('li');
  li.className = 'py-1.5 text-xs text-slate-600 border-b border-slate-50';
  li.textContent = `${new Date().toLocaleTimeString()} — ${text}`;
  _feedEl.prepend(li);
  while (_feedEl.children.length > ACTIVITY_FEED_MAX) _feedEl.lastChild?.remove();
}

async function saveLayout(layout) {
  if (!_db) return;
  try {
    const prefs = (await idbGet(_db, 'meta', PREFS_META_KEY)) || { key: PREFS_META_KEY };
    await idbPut(_db, 'meta', { ...prefs, widget_layout: layout });
  } catch { /* layout pref — non-critical */ }
}

async function recompose(root) {
  const repo = window.__vdg_repo;
  if (!repo) return;
  try {
    _data = await compose(repo, _period, _salesFilter, _mode);
    const kpiEl = root.querySelector('#mgr-kpi-row');
    if (kpiEl) kpiEl.innerHTML = renderKpis(_data.kpis);
    _feedEl = root.querySelector('#activity-feed');
    queueMicrotask(() => {
      renderRevenueChart(_data.monthly);
      renderCarrierDonut(_data.leaderboard);
    });
  } catch (err) {
    console.warn('[mgr-dashboard] compose error:', err.message); // DEV
  }
}

async function _buildSalesBtns() {
  const repo = window.__vdg_repo;
  const labels = ['All'];
  if (repo) {
    try {
      const reps = await getActiveSalesReps(repo);
      reps.forEach((r) => labels.push(r.prefix));
    } catch { /* fallback: All-only */ }
  }
  return labels.map((s) => {
    const val    = s === 'All' ? '' : s;
    const active = (s === 'All' && !_salesFilter) || val === _salesFilter;
    return `<button data-sales="${val}"
      class="px-3 py-1.5 rounded-lg text-xs font-medium ${active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
    >${s}</button>`;
  }).join('');
}

export async function render(root) {
  if (!isManager()) { navigate('/dashboard'); return; }

  destroyCharts();
  if (_onEntityChanged) window.removeEventListener('vdg:entity-changed', _onEntityChanged);
  if (_onPeriodChanged) window.removeEventListener('vdg:period-changed', _onPeriodChanged);
  if (_onSyncError)     window.removeEventListener('vdg:sync-error',     _onSyncError);
  if (_onModeChange)    window.removeEventListener('vdg:mode-change',     _onModeChange);

  _mode = readMode();

  try { _db = window.__vdg_db || null; } catch { _db = null; }

  let layout = DEFAULT_WIDGET_LAYOUT;
  if (_db) {
    try {
      const prefs = await idbGet(_db, 'meta', PREFS_META_KEY);
      if (prefs?.widget_layout) layout = prefs.widget_layout;
    } catch { /* fallback to default */ }
  }

  const skeletonRow = Array.from({ length: 8 }, () =>
    '<div class="h-20 rounded-xl bg-slate-200 animate-pulse"></div>').join('');

  const periodBtns = PERIODS.map((p) =>
    `<button data-period="${p}"
      class="px-3 py-1.5 rounded-lg text-xs font-medium ${p === _period ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
    >${p}</button>`).join('');

  const salesBtns = await _buildSalesBtns();

  root.innerHTML = `
    <div class="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div class="flex items-center flex-wrap gap-3 justify-between">
        <div class="flex gap-1">${periodBtns}</div>
        <div class="flex gap-1">${salesBtns}</div>
      </div>
      <section id="mgr-kpi-row" class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        ${skeletonRow}
      </section>
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm font-semibold text-slate-900">Revenue vs Cost (12M)</div>
            <button data-export="revenue-chart" class="text-xs text-blue-600 hover:underline">⬇ Export</button>
          </div>
          <div class="h-56"><canvas id="mgr-bar-chart"></canvas></div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm font-semibold text-slate-900">Revenue by sales</div>
            <button data-export="carrier-donut" class="text-xs text-blue-600 hover:underline">⬇ Export</button>
          </div>
          <div class="h-56"><canvas id="mgr-donut-chart"></canvas></div>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100">
          <div class="text-sm font-semibold text-slate-900">Recent activity</div>
        </div>
        <ul id="activity-feed" class="px-4 py-2 max-h-48 overflow-y-auto">
          <li class="py-1.5 text-xs text-slate-400">No recent activity</li>
        </ul>
      </div>
    </div>`;

  _feedEl = root.querySelector('#activity-feed');

  root.addEventListener('click', (e) => {
    const pBtn = e.target.closest('[data-period]');
    if (pBtn) {
      _period = pBtn.dataset.period;
      root.querySelectorAll('[data-period]').forEach((b) =>
        b.className = b.className.replace('bg-blue-600 text-white', 'bg-slate-100 text-slate-600 hover:bg-slate-200'));
      pBtn.className = pBtn.className.replace('bg-slate-100 text-slate-600 hover:bg-slate-200', 'bg-blue-600 text-white');
      recompose(root);
    }
    const sBtn = e.target.closest('[data-sales]');
    if (sBtn) {
      _salesFilter = sBtn.dataset.sales || null;
      recompose(root);
    }
    const expBtn = e.target.closest('[data-export]');
    if (expBtn) handleExport(expBtn.dataset.export);
  });

  _onModeChange    = (e) => { _mode = e.detail?.mode ?? DEFAULT_MODE; recompose(root); };
  _onEntityChanged = (e) => {
    const { kind, id } = e.detail || {};
    prependActivity(`${kind} ${id} updated`);
    if (kind === 'user') {
      // Reload filter buttons when user roster changes
      _buildSalesBtns().then((html) => {
        const el = root.querySelector('.flex.gap-1:last-child');
        if (el) el.outerHTML = `<div class="flex gap-1">${html}</div>`;
      }).catch(() => {});
    }
    clearTimeout(_debounce);
    _debounce = setTimeout(() => recompose(root), LAYOUT_DEBOUNCE_MS);
  };
  _onPeriodChanged = (e) => { _period = e.detail?.period || _period; recompose(root); };
  _onSyncError     = () => prependActivity('⚠ Sync paused — retrying…');

  window.addEventListener('vdg:entity-changed', _onEntityChanged);
  window.addEventListener('vdg:period-changed', _onPeriodChanged);
  window.addEventListener('vdg:sync-error',     _onSyncError);
  window.addEventListener('vdg:mode-change',    _onModeChange);

  await recompose(root);
  if (_db) { void saveLayout(layout); }
}
