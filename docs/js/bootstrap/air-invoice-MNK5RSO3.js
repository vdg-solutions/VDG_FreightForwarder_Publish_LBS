import {
  KIND_AIRLINE_CARRIER,
  KIND_AIR_RATE,
  composeAirInvoice
} from "./chunk-MKBTAKU7.js";
import {
  EMPTY_STATE_VARIANT,
  emptyStateHtml
} from "./chunk-ZJJVGVDQ.js";
import {
  t
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/air-invoice.js
var CSV_HEADER = "awb_no,carrier_iata,flight_no,origin_iata,dest_iata,weight_chargeable_kg,expected_freight,invoiced_amount,variance_amount,currency,verdict";
function getRepo() {
  return window.__vdg_repo;
}
function fmtAmount(n) {
  return n != null ? Number(n).toLocaleString("vi-VN") : "\u2014";
}
function csvField(value) {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
function buildCassCSV(rows) {
  const lines = rows.map((r) => [
    csvField(r.awbNo),
    csvField(r.carrierIata),
    csvField(r.flightNo),
    csvField(r.originIata),
    csvField(r.destIata),
    csvField(r.weightChargeableKg),
    csvField(r.expectedFreightDisplay),
    csvField(r.invoicedAmountDisplay),
    csvField(r.varianceAmountDisplay),
    csvField(r.invoiceCurrency),
    csvField(r.verdict)
  ].join(","));
  return [CSV_HEADER, ...lines].join("\n");
}
function groupByCarrier(rows) {
  const map = /* @__PURE__ */ new Map();
  for (const r of rows) {
    if (!map.has(r.carrierIata)) map.set(r.carrierIata, { name: r.carrierName, rows: [] });
    map.get(r.carrierIata).rows.push(r);
  }
  return map;
}
function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function verdictBadge(verdict) {
  const map = {
    matched: ["bg-green-100 text-green-700", t("air_invoice.verdict.matched")],
    disputed: ["bg-red-100 text-red-700", t("air_invoice.verdict.disputed")],
    unbilled: ["bg-slate-100 text-slate-500", t("air_invoice.verdict.unbilled")]
  };
  const [cls, label] = map[verdict] || map.unbilled;
  return `<span class="text-[10px] px-2 py-0.5 rounded border-0 font-medium ${cls}">${label}</span>`;
}
function buildInvoiceRow(r) {
  return `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs">
      <td class="px-3 py-2 font-mono">${escHtml(r.awbNo)}</td>
      <td class="px-3 py-2 font-mono">${escHtml(r.flightNo) || "\u2014"}</td>
      <td class="px-3 py-2">${escHtml(r.originIata)} \u2192 ${escHtml(r.destIata)}</td>
      <td class="px-3 py-2 text-right">${fmtAmount(r.weightChargeableKg)} kg</td>
      <td class="px-3 py-2 text-right">${fmtAmount(r.expectedFreightDisplay)} ${escHtml(r.rateCurrency)}</td>
      <td class="px-3 py-2 text-right">${fmtAmount(r.invoicedAmountDisplay)} ${escHtml(r.invoiceCurrency)}</td>
      <td class="px-3 py-2 text-right">${r.varianceAmountDisplay != null ? fmtAmount(r.varianceAmountDisplay) : "\u2014"}</td>
      <td class="px-3 py-2 text-center">${verdictBadge(r.verdict)}</td>
    </tr>`;
}
function buildCarrierSection(carrierIata, group) {
  const rows = group.rows.map(buildInvoiceRow).join("");
  return `
    <div class="mb-6">
      <div class="text-sm font-semibold text-slate-700 mb-2 px-1">
        ${escHtml(carrierIata)} \u2014 ${escHtml(group.name)}
        <span class="ml-2 text-xs text-slate-400">${t("air_invoice.count_invoices", { n: group.rows.length })}</span>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">${t("air_invoice.col.awb")}</th>
              <th class="px-3 py-2 text-left">${t("air_invoice.col.flight")}</th>
              <th class="px-3 py-2 text-left">${t("air_invoice.col.route")}</th>
              <th class="px-3 py-2 text-right">${t("air_invoice.col.weight")}</th>
              <th class="px-3 py-2 text-right">${t("air_invoice.col.expected")}</th>
              <th class="px-3 py-2 text-right">${t("air_invoice.col.invoiced")}</th>
              <th class="px-3 py-2 text-right">${t("air_invoice.col.variance")}</th>
              <th class="px-3 py-2 text-center">${t("air_invoice.col.verdict")}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}
function summaryHtml(totals) {
  return `
    <div class="flex items-center gap-4 text-xs text-slate-500 mb-4">
      <span>${t("air_invoice.verdict.matched")}: <b class="text-green-700">${totals.matchedCount}</b></span>
      <span>${t("air_invoice.verdict.disputed")}: <b class="text-red-700">${totals.disputedCount}</b></span>
      <span>${t("air_invoice.verdict.unbilled")}: <b class="text-slate-600">${totals.unbilledCount}</b></span>
    </div>`;
}
async function loadReconciliation() {
  const repo = getRepo();
  if (!repo) return { rows: [], totals: { matchedCount: 0, disputedCount: 0, unbilledCount: 0 } };
  const [awbs, airRates, carriers] = await Promise.all([
    repo.awb_list_all(),
    repo.list(KIND_AIR_RATE, null),
    repo.list(KIND_AIRLINE_CARRIER, null)
  ]);
  return composeAirInvoice(awbs, airRates, carriers);
}
async function render(root) {
  const { rows, totals } = await loadReconciliation();
  root.innerHTML = `
    <div class="p-6 max-w-6xl mx-auto">
      <div class="flex items-center justify-between mb-4">
        <div class="text-lg font-semibold text-slate-900">${t("air_invoice.title")}</div>
        <button id="air-invoice-export"
          class="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium">
          ${t("air_invoice.export_csv")}
        </button>
      </div>
      ${rows.length ? summaryHtml(totals) : ""}
      <div id="air-invoice-body"></div>
    </div>`;
  const body = root.querySelector("#air-invoice-body");
  if (!body) return;
  if (!rows.length) {
    body.innerHTML = emptyStateHtml({ variant: EMPTY_STATE_VARIANT.FIRST_RUN, entity: t("air_invoice.entity") });
    root.querySelector("#air-invoice-export")?.setAttribute("disabled", "true");
    return;
  }
  const groups = groupByCarrier(rows);
  for (const [iata, group] of groups) {
    body.insertAdjacentHTML("beforeend", buildCarrierSection(iata, group));
  }
  const exportBtn = root.querySelector("#air-invoice-export");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const csv = buildCassCSV(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cass-invoice.csv";
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}
export {
  buildCassCSV,
  csvField,
  render
};
