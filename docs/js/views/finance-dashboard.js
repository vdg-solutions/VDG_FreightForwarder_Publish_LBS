// F-06-12 — Finance Dashboard

import {
  REVENUE_TIMESERIES,
  BILLING_FUNNEL,
  TOP_CUSTOMERS,
  CREDIT_CUSTOMERS,
  DEMDET_CONTAINERS,
} from '../mock-data.js';

// ── KPI derivation ─────────────────────────────────────────────────────────────
const CURRENT_MONTH = REVENUE_TIMESERIES[REVENUE_TIMESERIES.length - 1];
const REVENUE_MTD   = CURRENT_MONTH.revenue;
const COST_MTD      = CURRENT_MONTH.cost;
const MARGIN_PCT    = (((REVENUE_MTD - COST_MTD) / REVENUE_MTD) * 100).toFixed(1);

const OUTSTANDING_AR = CREDIT_CUSTOMERS.reduce((s, c) => s + c.outstanding, 0);
const DEMDET_EXPOSURE = DEMDET_CONTAINERS.filter(
  (c) => c.state === 'Accruing' || c.state === 'Expired',
).length;

const FUNNEL_MAX = Math.max(...BILLING_FUNNEL.map((f) => f.count));

function fmt(n) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000)    return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
}

// ── KPI cards ─────────────────────────────────────────────────────────────────
const KPI_DEFS = [
  { label: 'Revenue MTD',       value: fmt(REVENUE_MTD),  delta: `+${MARGIN_PCT}% margin`, tone: 'blue' },
  { label: 'Cost MTD',          value: fmt(COST_MTD),     delta: `${((COST_MTD / REVENUE_MTD) * 100).toFixed(0)}% of revenue`, tone: 'slate' },
  { label: 'Gross Margin',      value: `${MARGIN_PCT}%`,  delta: 'vs last month +1.2%', tone: 'green' },
  { label: 'Outstanding AR',    value: fmt(OUTSTANDING_AR), delta: `${CREDIT_CUSTOMERS.filter((c) => c.status !== 'OK').length} flagged`, tone: 'amber' },
  { label: 'DEM/DET Exposure',  value: `${DEMDET_EXPOSURE}`, delta: 'containers accruing', tone: DEMDET_EXPOSURE > 3 ? 'red' : 'slate' },
];

const TONE_CLASSES = {
  blue:  'border-blue-300 text-blue-700',
  green: 'border-emerald-300 text-emerald-700',
  amber: 'border-amber-300 text-amber-700',
  red:   'border-red-300 text-red-700',
  slate: 'border-slate-200 text-slate-700',
};

function kpiCards() {
  return `
    <div class="grid grid-cols-5 gap-4 mb-6">
      ${KPI_DEFS.map((k) => {
        const cls = TONE_CLASSES[k.tone] ?? TONE_CLASSES.slate;
        return `
          <div class="bg-white rounded-xl border ${cls} p-4 shadow-sm">
            <div class="text-2xl font-bold ${cls.split(' ')[1]}">${k.value}</div>
            <div class="text-xs text-slate-500 mt-0.5">${k.label}</div>
            <div class="text-xs text-slate-400 mt-1">${k.delta}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ── Billing funnel ─────────────────────────────────────────────────────────────
function billingFunnel() {
  const rows = BILLING_FUNNEL.map((f) => {
    const pct = ((f.count / FUNNEL_MAX) * 100).toFixed(0);
    return `
      <div class="flex items-center gap-3">
        <div class="w-32 text-xs text-slate-600 text-right shrink-0">${f.stage}</div>
        <div class="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
          <div class="bg-blue-500 h-5 rounded-full flex items-center px-2" style="width:${pct}%;min-width:2rem">
            <span class="text-white text-xs font-semibold">${f.count}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
  return `
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
      <div class="text-sm font-semibold text-slate-700 mb-4">Billing Pipeline</div>
      <div class="flex flex-col gap-2">${rows}</div>
    </div>
  `;
}

// ── Top customers table ────────────────────────────────────────────────────────
function topCustomersTable() {
  const maxRev = TOP_CUSTOMERS[0].revenue;
  const rows = TOP_CUSTOMERS.map((c, i) => `
    <tr class="border-b border-slate-100 hover:bg-slate-50">
      <td class="py-2 px-4 text-xs text-slate-400 text-center w-8">${i + 1}</td>
      <td class="py-2 px-4 text-sm text-slate-800 font-medium">${c.name}</td>
      <td class="py-2 px-4">
        <div class="flex items-center gap-2">
          <div class="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div class="bg-blue-400 h-2 rounded-full" style="width:${((c.revenue / maxRev) * 100).toFixed(0)}%"></div>
          </div>
          <span class="text-xs font-mono text-slate-700 w-14 text-right">${fmt(c.revenue)}</span>
        </div>
      </td>
    </tr>
  `).join('');
  return `
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="p-4 border-b border-slate-100 text-sm font-semibold text-slate-700">Top 10 Customers by Revenue</div>
      <table class="w-full">
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ── Chart.js bar chart ─────────────────────────────────────────────────────────
async function mountChart(canvasId) {
  let Chart;
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.3/+esm');
    Chart = mod.Chart;
    mod.registerables && Chart.register(...mod.registerables);
  } catch {
    /* Chart.js optional — no CDN in offline env */
    return;
  }

  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  new Chart(canvas, {
    type: 'bar',
    data: {
import { formatMoney } from '../utils/formatters.js';

function summaryCards() {
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl border border-slate-200 p-5">
        <div class="text-sm font-semibold text-slate-500 mb-1">Gross Revenue (MTD)</div>
        <div class="text-2xl font-bold text-slate-800">$0</div>
        <div class="text-xs font-medium mt-1 text-slate-400">Data not available</div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-5">
        <div class="text-sm font-semibold text-slate-500 mb-1">Direct Costs (MTD)</div>
        <div class="text-2xl font-bold text-slate-800">$0</div>
        <div class="text-xs font-medium mt-1 text-slate-400">Data not available</div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-5">
        <div class="text-sm font-semibold text-slate-500 mb-1">Gross Margin</div>
        <div class="text-2xl font-bold text-emerald-600">0%</div>
        <div class="text-xs font-medium mt-1 text-slate-400">Data not available</div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-5">
        <div class="text-sm font-semibold text-slate-500 mb-1">Accrued DEM/DET</div>
        <div class="text-2xl font-bold text-red-600">$0</div>
        <div class="text-xs font-medium mt-1 text-slate-400">Data not available</div>
      </div>
    </div>
  `;
}

function pnlTable(lines) {
  if (!lines || !lines.length) return `<div class="bg-white rounded-xl border border-slate-200 p-5 text-center text-slate-500">Chưa có dữ liệu PnL (No PnL lines found)</div>`;

  // Aggregate by charge code
  const agg = {};
  for (const l of lines) {
    const code = l.charge_code || l.code || 'UNKNOWN';
    if (!agg[code]) agg[code] = { code, sell: 0, buy: 0 };
    agg[code].sell += Number(l.sell_amt || l.selling_vnd_collect || 0);
    agg[code].buy  += Number(l.buy_amt  || l.buying_vnd_pay      || 0);
  }
  const rows = Object.values(agg).sort((a, b) => (b.sell - b.buy) - (a.sell - a.buy));

  return `
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div class="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <h3 class="font-semibold text-slate-800">Job P&L Summary (Charge Code)</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead class="text-xs uppercase text-slate-500 bg-white border-b border-slate-200">
            <tr>
              <th class="py-3 px-5 font-semibold">Charge Code</th>
              <th class="py-3 px-5 font-semibold text-right">Revenue</th>
              <th class="py-3 px-5 font-semibold text-right">Cost</th>
              <th class="py-3 px-5 font-semibold text-right">Margin</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-sm">
            ${rows.map(r => {
              const margin = r.sell - r.buy;
              return `
              <tr class="hover:bg-slate-50 transition">
                <td class="py-3 px-5 font-medium text-slate-700">${r.code}</td>
                <td class="py-3 px-5 text-right font-mono">${formatMoney(r.sell)}</td>
                <td class="py-3 px-5 text-right font-mono">${formatMoney(r.buy)}</td>
                <td class="py-3 px-5 text-right font-mono font-medium ${margin >= 0 ? 'text-emerald-600' : 'text-red-600'}">
                  ${formatMoney(margin)}
                </td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function demDetCard() {
  return `
    <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-full">
      <div class="flex justify-between items-center mb-6">
        <h3 class="font-semibold text-slate-800">DEM/DET Exposure</h3>
        <button class="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition">View All</button>
      </div>
      <div class="space-y-4">
        <div class="flex justify-between items-center text-sm">
          <span class="text-slate-600 font-medium">MSC OSCAR / V012</span>
          <span class="font-mono font-medium text-red-600">$0</span>
        </div>
        <div class="w-full bg-slate-100 rounded-full h-1.5 mb-2"><div class="bg-red-500 h-1.5 rounded-full" style="width: 0%"></div></div>
        <div class="text-xs text-slate-500 text-center py-4">Data not available</div>
      </div>
    </div>
  `;
}

function creditCard() {
  return `
    <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-full">
      <div class="flex justify-between items-center mb-6">
        <h3 class="font-semibold text-slate-800">Credit Watchlist</h3>
      </div>
      <div class="space-y-4">
        <div class="text-xs text-slate-500 text-center py-4">Data not available</div>
      </div>
    </div>
  `;
}

export async function render(root) {
  let lines = [];
  try {
    const repo = window.__vdg_repo;
    if (repo) lines = await repo.list('pnl_line', null).catch(() => []);
  } catch (e) {
    console.warn('Failed to load pnl_line', e); // DEV
  }

  root.innerHTML = `
    <div class="p-6 max-w-[1400px] mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xs text-slate-500">F-06-12 · finance</div>
          <div class="text-xl font-bold text-slate-900">Finance Dashboard</div>
        </div>
        <div class="flex gap-2">
          <a href="#/finance/credit"  class="px-3 py-1.5 text-xs rounded border border-slate-200 text-slate-700 hover:bg-slate-50 transition">Credit</a>
          <a href="#/finance/demdet"  class="px-3 py-1.5 text-xs rounded border border-slate-200 text-slate-700 hover:bg-slate-50 transition">DEM/DET</a>
        </div>
      </div>

      ${kpiCards()}

      <div class="grid grid-cols-2 gap-6 mb-6">
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div class="text-sm font-semibold text-slate-700 mb-4">Revenue vs Cost (6 months)</div>
          <canvas id="${CHART_ID}" height="200"></canvas>
        </div>
        ${billingFunnel()}
      </div>

      ${topCustomersTable()}
    </div>
  `;

  await mountChart(CHART_ID);
}
