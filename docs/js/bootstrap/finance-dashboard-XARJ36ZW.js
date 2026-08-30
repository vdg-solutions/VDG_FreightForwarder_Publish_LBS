import {
  fmtNumber,
  t
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/finance-dashboard.js
var CHART_ID = "finance-revcost-chart";
var EMPTY_CODE = "UNKNOWN";
function getSell(l) {
  return Number(l.selling_vnd_collect ?? l.SellingVNDCollect ?? 0);
}
function getBuy(l) {
  return Number(l.buying_vnd_pay ?? l.BuyingVNDPay ?? 0);
}
function getCode(l) {
  return l.charge_code ?? l.description ?? EMPTY_CODE;
}
function aggregateByChargeCode(lines) {
  const agg = {};
  for (const l of lines || []) {
    const code = getCode(l);
    if (!agg[code]) agg[code] = { code, sell: 0, buy: 0 };
    agg[code].sell += getSell(l);
    agg[code].buy += getBuy(l);
  }
  return Object.values(agg).map((r) => ({ ...r, margin: r.sell - r.buy })).sort((a, b) => b.margin - a.margin);
}
var MARGIN_PCT_UNDEFINED = "\u2014";
function summaryTotals(lines) {
  const revenue = (lines || []).reduce((a, l) => a + getSell(l), 0);
  const cost = (lines || []).reduce((a, l) => a + getBuy(l), 0);
  const margin = revenue - cost;
  const marginPct = revenue > 0 ? margin / revenue * 100 : null;
  return { revenue, cost, margin, marginPct };
}
function marginPctDisplay(marginPct) {
  return marginPct === null ? MARGIN_PCT_UNDEFINED : `${fmtNumber(marginPct)}%`;
}
function summaryCards(lines) {
  const { revenue, cost, margin, marginPct } = summaryTotals(lines);
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl border border-slate-200 p-5">
        <div class="text-sm font-semibold text-slate-500 mb-1">${t("finance_dash.card.gross_revenue")}</div>
        <div class="text-2xl font-bold text-slate-800">${fmtNumber(revenue)} \u20AB</div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-5">
        <div class="text-sm font-semibold text-slate-500 mb-1">${t("finance_dash.card.direct_costs")}</div>
        <div class="text-2xl font-bold text-slate-800">${fmtNumber(cost)} \u20AB</div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-5">
        <div class="text-sm font-semibold text-slate-500 mb-1">${t("finance_dash.card.gross_margin")}</div>
        <div class="text-2xl font-bold text-emerald-600">${marginPctDisplay(marginPct)}</div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-5">
        <div class="text-sm font-semibold text-slate-500 mb-1">${t("finance_dash.card.gross_margin_vnd")}</div>
        <div class="text-2xl font-bold ${margin >= 0 ? "text-emerald-600" : "text-red-600"}">${fmtNumber(margin)} \u20AB</div>
      </div>
    </div>
  `;
}
function pnlTable(lines) {
  if (!lines || !lines.length) {
    return `<div class="bg-white rounded-xl border border-slate-200 p-5 text-center text-slate-500">${t("finance_dash.empty")}</div>`;
  }
  const rows = aggregateByChargeCode(lines);
  return `
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div class="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <h3 class="font-semibold text-slate-800">${t("finance_dash.table.title")}</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead class="text-xs uppercase text-slate-500 bg-white border-b border-slate-200">
            <tr>
              <th class="py-3 px-5 font-semibold">${t("finance_dash.table.col.code")}</th>
              <th class="py-3 px-5 font-semibold text-right">${t("finance_dash.table.col.revenue")}</th>
              <th class="py-3 px-5 font-semibold text-right">${t("finance_dash.table.col.cost")}</th>
              <th class="py-3 px-5 font-semibold text-right">${t("finance_dash.table.col.margin")}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-sm">
            ${rows.map((r) => `
              <tr class="hover:bg-slate-50 transition">
                <td class="py-3 px-5 font-medium text-slate-700">${r.code}</td>
                <td class="py-3 px-5 text-right font-mono">${fmtNumber(r.sell)} \u20AB</td>
                <td class="py-3 px-5 text-right font-mono">${fmtNumber(r.buy)} \u20AB</td>
                <td class="py-3 px-5 text-right font-mono font-medium ${r.margin >= 0 ? "text-emerald-600" : "text-red-600"}">
                  ${fmtNumber(r.margin)} \u20AB
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
function mountChart(lines) {
  const ctx = document.getElementById(CHART_ID);
  if (!ctx || !window.Chart) return;
  window.Chart.getChart(ctx)?.destroy();
  const agg = aggregateByChargeCode(lines);
  new window.Chart(ctx, {
    type: "bar",
    data: {
      labels: agg.map((r) => r.code),
      datasets: [
        { label: t("finance_dash.chart.revenue"), data: agg.map((r) => r.sell), backgroundColor: "#3b82f6" },
        { label: t("finance_dash.chart.cost"), data: agg.map((r) => r.buy), backgroundColor: "#f59e0b" }
      ]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: true, position: "bottom" } },
      scales: { y: { beginAtZero: true } }
    }
  });
}
async function render(root) {
  let lines = [];
  try {
    const repo = window.__vdg_repo;
    if (repo) lines = await repo.list("pnl_line", null).catch(() => []);
  } catch (e) {
    console.warn("Failed to load pnl_line", e);
  }
  root.innerHTML = `
    <div class="p-6 max-w-[1600px] mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xl font-bold text-slate-900">${t("finance_dash.title")}</div>
        </div>
        <div class="flex gap-2">
          <a href="#/finance/credit" class="px-3 py-1.5 text-xs rounded border border-slate-200 text-slate-700 hover:bg-slate-50 transition">${t("finance_dash.link.credit")}</a>
          <a href="#/finance/demdet" class="px-3 py-1.5 text-xs rounded border border-slate-200 text-slate-700 hover:bg-slate-50 transition">${t("finance_dash.link.demdet")}</a>
        </div>
      </div>

      ${summaryCards(lines)}

      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div class="text-sm font-semibold text-slate-700 mb-4">${t("finance_dash.chart.title")}</div>
        <canvas id="${CHART_ID}" height="200"></canvas>
      </div>

      ${pnlTable(lines)}
    </div>
  `;
  queueMicrotask(() => mountChart(lines));
}
export {
  aggregateByChargeCode,
  render,
  summaryTotals
};
