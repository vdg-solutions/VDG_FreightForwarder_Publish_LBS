import {
  computeKpis, computeLeaderboard, computeTopCustomers,
  computeLaneHeatmap, computeMonthlyBars, computeBillingFunnel,
  COMMISSION_PCT,
} from '../operators/sales-analytics-compute.js';

// ── constants ─────────────────────────────────────────────────────────────────

const KIND_SHIPMENT   = 'shipment';
const KIND_LINE       = 'pnl_line';
const CHART_BAR_COLOR_REV  = 'rgba(59,130,246,0.7)';
const CHART_BAR_COLOR_COST = 'rgba(248,113,113,0.7)';
const DONUT_COLORS    = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#14b8a6','#f97316','#6366f1'];
const PERIODS = ['Today', 'Week', 'Month', 'Quarter', 'Year'];

let _charts = {};

function destroyCharts() {
  Object.values(_charts).forEach((c) => c.destroy?.());
  _charts = {};
}

// ── number format ─────────────────────────────────────────────────────────────

function fmtNum(n) {
  if (!n && n !== 0) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function fmtPct(n) { return `${Number(n || 0).toFixed(1)}%`; }

function marginCls(m) { return m >= 0 ? 'text-emerald-600' : 'text-red-500'; }

// ── KPI cards ─────────────────────────────────────────────────────────────────

function renderKpiRow(kpis) {
  const cards = [
    { label: 'Revenue MTD',       value: fmtNum(kpis.revenue),     tone: 'blue',  icon: 'dollar' },
    { label: 'Cost MTD',          value: fmtNum(kpis.cost),         tone: 'red',   icon: 'dollar' },
    { label: 'Margin MTD',        value: fmtNum(kpis.margin),       tone: kpis.margin >= 0 ? 'green' : 'red', icon: 'dollar' },
    { label: 'Margin %',          value: fmtPct(kpis.marginPct),    tone: 'green', icon: 'dollar' },
    { label: 'Active Shipments',  value: kpis.activeCount,          tone: 'blue',  icon: 'ship'   },
  ];
  return cards.map((c) =>
    `<kpi-card label="${c.label}" value="${c.value}" tone="${c.tone}" icon="${c.icon}"></kpi-card>`
  ).join('');
}

// ── leaderboard ───────────────────────────────────────────────────────────────

function renderLeaderboard(rows) {
  if (!rows.length) return '<p class="text-slate-400 text-sm px-4 py-3">No data</p>';
  const trs = rows.map((r) => `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-sm">
      <td class="px-3 py-2 font-semibold">${r.sales}</td>
      <td class="px-3 py-2 text-right">${r.shipments}</td>
      <td class="px-3 py-2 text-right">${fmtNum(r.revenue)}</td>
      <td class="px-3 py-2 text-right ${marginCls(r.margin)}">${fmtNum(r.margin)}</td>
      <td class="px-3 py-2 text-right">${fmtPct(r.marginPct)}</td>
      <td class="px-3 py-2 text-right">${fmtPct(r.winRate)}</td>
      <td class="px-3 py-2 text-right text-blue-600 font-mono">${fmtNum(r.ttcn)}</td>
    </tr>`).join('');
  return `
    <table class="w-full text-xs">
      <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px]">
        <tr>
          <th class="px-3 py-2 text-left">Sales</th>
          <th class="px-3 py-2 text-right">Shipments</th>
          <th class="px-3 py-2 text-right">Revenue</th>
          <th class="px-3 py-2 text-right">Margin</th>
          <th class="px-3 py-2 text-right">Margin %</th>
          <th class="px-3 py-2 text-right">Win %</th>
          <th class="px-3 py-2 text-right">TTCN (${COMMISSION_PCT * 100}%)</th>
        </tr>
      </thead>
      <tbody>${trs}</tbody>
    </table>`;
}

// ── top customers ─────────────────────────────────────────────────────────────

function renderTopCustomers(rows) {
  const data = rows;
  if (!data.length) return '<p class="text-slate-400 text-sm px-4 py-3">No data</p>';
  const trs  = data.slice(0, 10).map((r) => `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-sm">
      <td class="px-3 py-2">${r.customer || r.name}</td>
      <td class="px-3 py-2 text-right font-mono">${fmtNum(r.revenue)}</td>
      <td class="px-3 py-2 text-right ${marginCls(r.margin || 0)}">${fmtNum(r.margin ?? '—')}</td>
    </tr>`).join('');
  return `
    <table class="w-full text-xs">
      <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px]">
        <tr>
          <th class="px-3 py-2 text-left">Customer</th>
          <th class="px-3 py-2 text-right">Revenue</th>
          <th class="px-3 py-2 text-right">Margin</th>
        </tr>
      </thead>
      <tbody>${trs}</tbody>
    </table>`;
}

// ── heatmap ───────────────────────────────────────────────────────────────────

function renderHeatmap({ rows, cols, matrix }) {
  if (!rows.length) return '<p class="text-slate-400 text-sm p-4">No lane data</p>';
  const allMargins = rows.flatMap((pol) => cols.map((pod) => matrix[pol]?.[pod]?.margin ?? null)).filter((v) => v !== null);
  const maxAbs = Math.max(...allMargins.map(Math.abs), 1);

  const header = `<tr><th class="p-1 text-[10px] text-slate-400">POL↓ / POD→</th>${cols.map((p) => `<th class="p-1 text-[10px] font-mono">${p}</th>`).join('')}</tr>`;
  const bodyRows = rows.map((pol) => {
    const cells = cols.map((pod) => {
      const cell = matrix[pol]?.[pod];
      if (!cell) return `<td class="p-1 bg-slate-50 text-center text-[10px] text-slate-300">—</td>`;
      const pct   = Math.min(Math.abs(cell.margin) / maxAbs, 1);
      const alpha = (pct * 0.7 + 0.1).toFixed(2);
      const bg    = cell.margin >= 0 ? `rgba(16,185,129,${alpha})` : `rgba(239,68,68,${alpha})`;
      return `<td class="p-1 text-center text-[10px] font-mono" style="background:${bg}">${fmtNum(cell.margin)}</td>`;
    }).join('');
    return `<tr><td class="px-2 py-1 text-[10px] font-mono font-semibold text-slate-600 whitespace-nowrap">${pol}</td>${cells}</tr>`;
  }).join('');

  return `<div class="overflow-x-auto"><table class="text-xs border-collapse w-full"><thead>${header}</thead><tbody>${bodyRows}</tbody></table></div>`;
}

// ── billing funnel ────────────────────────────────────────────────────────────

function renderFunnel(funnel) {
  const data  = funnel;
  if (!data.length) return '<p class="text-slate-400 text-sm p-4">No data</p>';
  const total = data.reduce((a, d) => a + d.count, 0) || 1;
  const colors = ['bg-slate-300','bg-blue-300','bg-blue-500','bg-amber-400','bg-emerald-500'];
  return data.map((d, i) => `
    <div class="flex items-center gap-3 text-sm">
      <span class="w-28 text-right text-xs text-slate-500 shrink-0">${d.stage}</span>
      <div class="flex-1 bg-slate-100 rounded-full h-4">
        <div class="${colors[i] || 'bg-blue-400'} h-4 rounded-full" style="width:${Math.round(d.count/total*100)}%"></div>
      </div>
      <span class="w-8 text-xs font-mono font-semibold text-right">${d.count}</span>
    </div>`).join('');
}

// ── chart renders ─────────────────────────────────────────────────────────────

function renderBarChart(monthly) {
  const labels  = monthly.labels;
  const revenue = monthly.revenue;
  const cost    = monthly.cost;

  const ctx = document.getElementById('an-bar-chart');
  if (!ctx || !window.Chart) return;
  _charts.bar = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Revenue', data: revenue, backgroundColor: CHART_BAR_COLOR_REV },
        { label: 'Cost',    data: cost,    backgroundColor: CHART_BAR_COLOR_COST },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: { y: { ticks: { callback: (v) => fmtNum(v) } } },
    },
  });
}

function renderDonutChart(leaderboard) {
  const data   = leaderboard.slice(0, 8);
  const labels = data.map((r) => r.sales);
  const values = data.map((r) => r.revenue);

  const ctx = document.getElementById('an-donut-chart');
  if (!ctx || !window.Chart) return;
  _charts.donut = new window.Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: DONUT_COLORS, borderWidth: 0 }] },
    options: { cutout: '65%', plugins: { legend: { position: 'right' } }, maintainAspectRatio: false },
  });
}

// ── main render ───────────────────────────────────────────────────────────────

export async function render(root) {
  destroyCharts();
  root.innerHTML = `<div class="p-6 flex items-center gap-3 text-slate-500 text-sm"><div class="animate-spin w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full"></div> Loading…</div>`;

  const repo = window.__vdg_repo;
  const [shipments, lines] = await Promise.all([
    repo.list(KIND_SHIPMENT, null),
    repo.list(KIND_LINE, null),
  ]);

  const kpis       = computeKpis(shipments, lines);
  const leaderboard = computeLeaderboard(shipments, lines);
  const topCusts   = computeTopCustomers(shipments, lines);
  const heatmap    = computeLaneHeatmap(shipments, lines);
  const monthly    = computeMonthlyBars(shipments, lines);
  const funnel     = computeBillingFunnel(shipments);

  root.innerHTML = `
    <div class="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-lg font-semibold text-slate-900">Sales Analytics</div>
          <div class="text-xs text-slate-500 mt-0.5">${shipments.length} shipments · ${lines.length} lines</div>
        </div>
        <div class="flex items-center gap-2">
          ${PERIODS.map((p, i) => `<button class="px-3 py-1.5 rounded-lg text-xs font-medium ${i===2?'bg-blue-600 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}">${p}</button>`).join('')}
        </div>
      </div>

      <!-- KPI row -->
      <section class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        ${renderKpiRow(kpis)}
      </section>

      <!-- Leaderboard + Top customers -->
      <div class="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100">
            <div class="text-sm font-semibold text-slate-900">Per-sales leaderboard</div>
            <div class="text-xs text-slate-500">TTCN = margin × ${COMMISSION_PCT * 100}%</div>
          </div>
          ${renderLeaderboard(leaderboard)}
        </div>
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100">
            <div class="text-sm font-semibold text-slate-900">Top 10 customers</div>
          </div>
          ${renderTopCustomers(topCusts)}
        </div>
      </div>

      <!-- Charts row -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <div class="text-sm font-semibold text-slate-900 mb-3">Revenue vs Cost (last 12 months)</div>
          <div class="h-56"><canvas id="an-bar-chart"></canvas></div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <div class="text-sm font-semibold text-slate-900 mb-3">Revenue by sales</div>
          <div class="h-56"><canvas id="an-donut-chart"></canvas></div>
        </div>
      </div>

      <!-- Heatmap + Funnel -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <div class="text-sm font-semibold text-slate-900 mb-3">Trade-lane margin heatmap (POL × POD)</div>
          ${renderHeatmap(heatmap)}
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <div class="text-sm font-semibold text-slate-900 mb-4">Billing funnel</div>
          <div class="space-y-3">${renderFunnel(funnel)}</div>
        </div>
      </div>
    </div>`;

  queueMicrotask(() => {
    renderBarChart(monthly);
    renderDonutChart(leaderboard);
  });
}
