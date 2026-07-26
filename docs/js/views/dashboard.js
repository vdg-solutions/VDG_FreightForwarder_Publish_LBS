import { t } from '../i18n/index.js';
import { buildDistribution } from '../util/dashboard-distribution.js';
import { resolveShipmentState } from '../util/shipment-state-resolver.js';
import { ensureShipmentStateAliases } from '../util/shipment-state-aliases.js';

const CLOSED_LIKE_STATES  = ['Closed', 'Delivered']; // F-18-11: KPI "active" excludes these

function kpiSection(kpis) {
  return `
    <section class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      ${kpis.map(
        (k) => `<kpi-card label="${k.label}" value="${k.value}" delta="${k.delta}" tone="${k.tone}" icon="${k.icon}"></kpi-card>`
      ).join('')}
    </section>
  `;
}

function distributionSection(distribution) {
  return `
    <section class="bg-white rounded-xl border border-slate-200 p-5">
      <div class="flex items-center justify-between mb-4">
        <div>
          <div class="text-sm font-semibold text-slate-900">${t('shipment_status_distribution')}</div>
          <div class="text-xs text-slate-500">${t('dashboard.distribution.subtitle')}</div>
        </div>
        <select class="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 bg-white">
          <option>${t('period_this_month')}</option><option>${t('period_last_30_days')}</option><option>${t('period_quarter')}</option>
        </select>
      </div>
      <div class="flex items-center gap-6">
        <div class="w-44 h-44 shrink-0"><canvas id="dist-chart"></canvas></div>
        <div class="flex-1 grid grid-cols-2 gap-2">
          ${distribution.map(
            (s) => `
            <div class="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-slate-50">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-sm" style="background:${s.color}"></span>
                <span class="text-slate-700">${s.label}</span>
              </div>
              <span class="font-mono font-semibold text-slate-900">${s.value}</span>
            </div>`
          ).join('')}
        </div>
      </div>
    </section>
  `;
}

const DEFAULT_SEVERITY_COLOR = 'slate';

function exceptionSection(exceptions) {
  const severityColor = { Critical: 'red', High: 'red', Medium: 'orange', Low: 'yellow' };
  if (!exceptions.length) return `<section class="bg-white rounded-xl border border-slate-200 p-5"><div class="text-sm font-semibold text-slate-900">${t('dashboard.exceptions.empty')}</div></section>`;
  return `
    <section class="bg-white rounded-xl border border-slate-200 p-5">
      <div class="flex items-center justify-between mb-4">
        <div>
          <div class="text-sm font-semibold text-slate-900">${t('open_exceptions')}</div>
          <div class="text-xs text-slate-500">${t('dashboard.exceptions.subtitle')}</div>
        </div>
      </div>
      <div class="divide-y divide-slate-100">
        ${exceptions.map(
          (e) => `
          <div class="py-2.5 flex items-center gap-3">
            <span class="w-1.5 h-8 rounded-full bg-${severityColor[e.severity] || DEFAULT_SEVERITY_COLOR}-500"></span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-slate-800 truncate">${e.type}</div>
              <div class="text-[11px] text-slate-500">${e.id} · ${e.shipment}</div>
            </div>
            <status-badge state="${e.severity}" fsm="exception"></status-badge>
            <div class="text-xs font-mono ${e.mins < 60 ? 'text-red-600 font-semibold' : 'text-slate-500'} w-16 text-right">
              ${e.mins < 60 ? t('dashboard.exceptions.mins_left', { n: e.mins }) : t('dashboard.exceptions.hours_left', { n: Math.floor(e.mins / 60) })}
            </div>
          </div>`
        ).join('')}
      </div>
    </section>
  `;
}

function cutoffSection(cutoffs) {
  if (!cutoffs.length) return `<section class="bg-white rounded-xl border border-slate-200 p-5"><div class="text-sm font-semibold text-slate-900">${t('dashboard.cutoffs.empty')}</div></section>`;
  return `
    <section class="bg-white rounded-xl border border-slate-200 p-5">
      <div class="flex items-center justify-between mb-4">
        <div>
          <div class="text-sm font-semibold text-slate-900">${t('dashboard.cutoffs.header')}</div>
          <div class="text-xs text-slate-500">${t('dashboard.cutoffs.subtitle')}</div>
        </div>
      </div>
      <div class="space-y-3">
        ${cutoffs.map(
          (c) => `
          <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition">
            <div>
              <div class="text-sm font-medium text-slate-800">${c.voyage}</div>
              <div class="text-[11px] text-slate-500 font-mono">${t('sales_new.field.pol')} ${c.port}</div>
            </div>
            <div class="flex flex-col items-end gap-1">
              <cutoff-timer deadline="${c.si}" label="${t('dashboard.cutoffs.si_cutoff_label')}"></cutoff-timer>
              <cutoff-timer deadline="${c.vgm}" label="${t('dashboard.cutoffs.vgm_cutoff_label')}"></cutoff-timer>
            </div>
          </div>`
        ).join('')}
      </div>
    </section>
  `;
}

function demExposureCard() {
  return `
    <section class="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 text-white">
      <div class="text-xs uppercase tracking-wider text-slate-400 mb-1">${t('dashboard.dem_det.title')}</div>
      <div class="text-3xl font-bold tracking-tight">0</div>
      <div class="text-xs text-slate-300 mt-1">${t('dashboard.dem_det.pending')}</div>
      <div class="mt-4 pt-4 border-t border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
        <div>
          <div class="text-slate-400">${t('dashboard.dem_det.free_time_remaining')}</div>
          <div class="font-semibold mt-0.5">${t('dashboard.dem_det.boxes_count', { n: 0 })}</div>
        </div>
        <div>
          <div class="text-slate-400">${t('dashboard.dem_det.over_free_time')}</div>
          <div class="font-semibold mt-0.5 text-red-300">${t('dashboard.dem_det.boxes_count', { n: 0 })}</div>
        </div>
      </div>
    </section>
  `;
}

export function renderChart(distribution) {
  const ctx = document.getElementById('dist-chart');
  if (!ctx || !window.Chart) return;
  window.Chart.getChart(ctx)?.destroy();
  new window.Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: distribution.map((s) => s.label),
      datasets: [{
        data: distribution.map((s) => s.value),
        backgroundColor: distribution.map((s) => s.color),
        borderWidth: 0,
      }],
    },
    options: {
      cutout: '70%',
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      maintainAspectRatio: false,
    },
  });
}

export async function render(root) {
  const repo = window.__vdg_repo;
  let allShipments = [];
  let aliasRows = [];
  if (repo) {
    allShipments = await repo.list('shipment', null);
    // DEFECT-1: seed-on-first-read — a fresh session (any role) must resolve legacy aliases
    // without a manager first opening the states-master view.
    aliasRows = await ensureShipmentStateAliases(repo);
  }

  // Calculate KPIs — F-18-11: resolve through the alias registry before comparing, a legacy
  // alias (e.g. 'Open') must land in its canonical bucket, not fall through raw.
  const activeShipments = allShipments.filter((s) =>
    !CLOSED_LIKE_STATES.includes(resolveShipmentState(s.state || s.status, aliasRows)));
  const kpis = [
    { label: t('dashboard.kpi.active_shipments'), value: activeShipments.length, delta: t('dashboard.kpi.total_active'), tone: 'blue', icon: 'ship' },
    { label: t('dashboard.kpi.pending_documents'), value: 0, delta: t('dashboard.kpi.real_data_na'), tone: 'amber', icon: 'doc' },
    { label: t('open_exceptions'), value: 0, delta: t('dashboard.kpi.real_data_na'), tone: 'red', icon: 'alert' },
    { label: t('revenue_mtd'), value: 'N/A', delta: t('dashboard.kpi.requires_pnl_compute'), tone: 'green', icon: 'dollar' },
  ];

  // Distribution — single canonical source (util/dashboard-distribution.js), no hand-typed
  // literal comparisons that can silently drift from ShipmentState (root cause of the undercount).
  const distribution = buildDistribution(allShipments, aliasRows);

  const exceptions = []; // Real data source not implemented yet
  const cutoffs = []; // Real data source not implemented yet

  root.innerHTML = `
    <div class="p-6 space-y-6 max-w-[1400px] mx-auto">
      ${kpiSection(kpis)}
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div class="xl:col-span-2 space-y-4">
          ${distributionSection(distribution)}
          ${exceptionSection(exceptions)}
        </div>
        <div class="space-y-4">
          ${demExposureCard()}
          ${cutoffSection(cutoffs)}
        </div>
      </div>
    </div>
  `;
  queueMicrotask(() => renderChart(distribution));
}
