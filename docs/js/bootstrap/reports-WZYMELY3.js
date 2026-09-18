import {
  mountDateHints
} from "./chunk-H7AL5STO.js";
import {
  balanceSheet,
  pnl,
  pnlMonthlyBreakdown,
  trialBalance
} from "./chunk-FZUKIDAT.js";
import {
  todayLocal
} from "./chunk-QSZOMCXZ.js";
import {
  renderMasterLoadRetryStatus
} from "./chunk-V5A2B6CO.js";
import "./chunk-JAZY43GR.js";
import {
  currentLocale,
  fmtNumber,
  t
} from "./chunk-G2RKYR7P.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/accounting/reports.js
var TAB_TB = "TB";
var TAB_PNL = "PNL";
var TAB_BS = "BS";
var TABS = [
  { key: TAB_TB, labelKey: "reports.tab.trial_balance" },
  { key: TAB_PNL, labelKey: "reports.tab.pnl" },
  { key: TAB_BS, labelKey: "reports.tab.balance_sheet" }
];
function today() {
  return todayLocal();
}
var _tab = TAB_TB;
var _asOfDateTB = today();
var _asOfDateBS = today();
var _pnlYear = (/* @__PURE__ */ new Date()).getFullYear();
var _comparePrevMonth = false;
var _refresh = true;
function fmtAmt(n) {
  return fmtNumber(n ?? 0);
}
function accountName(row) {
  return (currentLocale() === "en" ? row?.name_en : row?.name_vi) ?? "";
}
function renderUnreadable(container, reply, retry) {
  container.innerHTML = "";
  renderMasterLoadRetryStatus(container, reply.error || t("masters.load_error"), t("retry"), retry);
}
function takeRefresh() {
  const refresh = _refresh;
  _refresh = false;
  return refresh;
}
function tabButtons() {
  return TABS.map(({ key, labelKey }) => `
    <button data-tab="${key}"
      class="px-4 py-2 text-sm font-medium rounded-tl-lg rounded-tr-lg no-print
             ${_tab === key ? "bg-white border border-b-0 border-slate-200 text-blue-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}">
      ${t(labelKey)}
    </button>`).join("");
}
function shellHtml() {
  return `
    <div class="p-6 space-y-4 max-w-[1600px] mx-auto">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="text-sm font-semibold text-slate-900">${t("reports.title")}</div>
        <button id="btn-export-pdf" class="px-3 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 no-print">
          ${t("reports.export_pdf")}
        </button>
      </div>
      <div class="flex gap-1">${tabButtons()}</div>
      <div id="tab-content" class="bg-white rounded-xl border border-slate-200 p-5"></div>
    </div>`;
}
function integrityBadge(ok, okKey, mismatchKey) {
  return `<span class="text-xs font-medium ${ok ? "text-emerald-600" : "text-red-600"}">
    ${ok ? t(okKey) : t(mismatchKey)}
  </span>`;
}
async function renderTrialBalance(container) {
  const reply = await trialBalance(_asOfDateTB, takeRefresh());
  if (!reply.ok) {
    renderUnreadable(container, reply, () => renderTrialBalance(container));
    return;
  }
  const { rows, total_dr: totalDr, total_cr: totalCr, balanced } = reply;
  const trs = rows.map((r) => `
      <tr class="border-t border-slate-100 text-xs">
        <td class="px-3 py-1.5 font-mono">${r.acc_code}</td>
        <td class="px-3 py-1.5">${accountName(r)}</td>
        <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(r.opening)}</td>
        <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(r.dr)}</td>
        <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(r.cr)}</td>
        <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(r.closing)}</td>
      </tr>`).join("");
  container.innerHTML = `
    <div class="print-doc print-root" data-report-title="${t("reports.tab.trial_balance")}" data-print-date="${today()}">
      <div class="flex items-center gap-2 mb-3 no-print">
        <label class="text-xs text-slate-500 flex items-center gap-1">${t("reports.as_of_date")}
          <input id="tb-as-of-date" type="date" value="${_asOfDateTB}" lang="${currentLocale()}"
            class="border border-slate-300 rounded px-2 py-1 text-xs"></label>
      </div>
      <table class="w-full">
        <thead class="bg-slate-50 text-[11px] text-slate-500 uppercase">
          <tr>
            <th class="px-3 py-1.5 text-left">${t("reports.column.code")}</th>
            <th class="px-3 py-1.5 text-left">${t("reports.column.name")}</th>
            <th class="px-3 py-1.5 text-right">${t("reports.column.opening")}</th>
            <th class="px-3 py-1.5 text-right">${t("reports.column.debit")}</th>
            <th class="px-3 py-1.5 text-right">${t("reports.column.credit")}</th>
            <th class="px-3 py-1.5 text-right">${t("reports.column.closing")}</th>
          </tr>
        </thead>
        <tbody>${trs}</tbody>
        <tfoot>
          <tr class="border-t-2 border-slate-300 text-xs font-semibold">
            <td class="px-3 py-1.5" colspan="3">${t("reports.tb.total")}</td>
            <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(totalDr)}</td>
            <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(totalCr)}</td>
            <td class="px-3 py-1.5 text-right">${integrityBadge(balanced, "reports.tb.integrity_ok", "reports.tb.integrity_mismatch")}</td>
          </tr>
        </tfoot>
      </table>
    </div>`;
  mountDateHints(container);
  container.querySelector("#tb-as-of-date").addEventListener("change", async (e) => {
    _asOfDateTB = e.target.value;
    await renderTrialBalance(container);
  });
}
function monthRow(m, prevM) {
  const delta = prevM ? m.netIncome - prevM.netIncome : null;
  return `
    <tr class="border-t border-slate-100 text-xs">
      <td class="px-3 py-1.5">${_pnlYear}-${m.month}</td>
      <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(m.revenue)}</td>
      <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(m.expense)}</td>
      <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(m.netIncome)}</td>
      ${_comparePrevMonth ? `<td class="px-3 py-1.5 text-right font-mono ${delta != null && delta < 0 ? "text-red-500" : "text-emerald-600"}">${delta != null ? fmtAmt(delta) : "\u2014"}</td>` : ""}
    </tr>`;
}
async function renderPnl(container) {
  const monthly = await pnlMonthlyBreakdown(_pnlYear, takeRefresh());
  if (!monthly.ok) {
    renderUnreadable(container, monthly, () => renderPnl(container));
    return;
  }
  const months = monthly.months;
  const yearTotal = await pnl(_pnlYear, false);
  const trs = months.map((m, i) => monthRow(m, i > 0 ? months[i - 1] : null)).join("");
  container.innerHTML = `
    <div class="print-doc print-root" data-report-title="${t("reports.tab.pnl")}" data-print-date="${today()}">
      <div class="flex items-center gap-4 mb-3 no-print">
        <label class="text-xs text-slate-500 flex items-center gap-1">${_pnlYear}
          <input id="pnl-year" type="number" value="${_pnlYear}"
            class="border border-slate-300 rounded px-2 py-1 text-xs w-24"></label>
        <label class="text-xs text-slate-600 flex items-center gap-1.5">
          <input id="pnl-compare" type="checkbox" ${_comparePrevMonth ? "checked" : ""}>
          ${t("reports.pnl.compare_prev_month")}
        </label>
      </div>
      <table class="w-full">
        <thead class="bg-slate-50 text-[11px] text-slate-500 uppercase">
          <tr>
            <th class="px-3 py-1.5 text-left">${t("reports.pnl.month")}</th>
            <th class="px-3 py-1.5 text-right">${t("reports.pnl.revenue")}</th>
            <th class="px-3 py-1.5 text-right">${t("reports.pnl.expense")}</th>
            <th class="px-3 py-1.5 text-right">${t("reports.pnl.net_income")}</th>
            ${_comparePrevMonth ? `<th class="px-3 py-1.5 text-right uppercase">${t("reports.pnl.delta_prev_month")}</th>` : ""}
          </tr>
        </thead>
        <tbody>${trs}</tbody>
        <tfoot>
          <tr class="border-t-2 border-slate-300 text-xs font-semibold">
            <td class="px-3 py-1.5">${t("reports.pnl.total_year")}</td>
            <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(yearTotal.totalRevenue)}</td>
            <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(yearTotal.totalExpense)}</td>
            <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(yearTotal.netIncome)}</td>
            ${_comparePrevMonth ? "<td></td>" : ""}
          </tr>
        </tfoot>
      </table>
    </div>`;
  container.querySelector("#pnl-year").addEventListener("change", async (e) => {
    _pnlYear = Number(e.target.value) || (/* @__PURE__ */ new Date()).getFullYear();
    await renderPnl(container);
  });
  container.querySelector("#pnl-compare").addEventListener("change", async (e) => {
    _comparePrevMonth = e.target.checked;
    await renderPnl(container);
  });
}
async function renderBalanceSheet(container) {
  const reply = await balanceSheet(_asOfDateBS, takeRefresh());
  if (!reply.ok) {
    renderUnreadable(container, reply, () => renderBalanceSheet(container));
    return;
  }
  const {
    assets,
    liabilities,
    equity,
    total_assets: totalAssets,
    total_liabilities: totalLiab,
    total_liab_equity: totalLiabEquity,
    balanced
  } = reply;
  const rowsFor = (list) => list.map((r) => `
      <tr class="border-t border-slate-100 text-xs">
        <td class="px-3 py-1.5 font-mono">${r.acc}</td>
        <td class="px-3 py-1.5">${accountName(r)}</td>
        <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(r.amt)}</td>
      </tr>`).join("");
  container.innerHTML = `
    <div class="print-doc print-root" data-report-title="${t("reports.tab.balance_sheet")}" data-print-date="${today()}">
      <div class="flex items-center gap-2 mb-3 no-print">
        <label class="text-xs text-slate-500 flex items-center gap-1">${t("reports.as_of_date")}
          <input id="bs-as-of-date" type="date" value="${_asOfDateBS}" lang="${currentLocale()}"
            class="border border-slate-300 rounded px-2 py-1 text-xs"></label>
      </div>
      <div class="grid grid-cols-2 gap-6">
        <table class="w-full">
          <thead class="bg-slate-50 text-[11px] text-slate-500 uppercase">
            <tr><th class="px-3 py-1.5 text-left" colspan="2">${t("reports.bs.assets")}</th>
              <th class="px-3 py-1.5 text-right">${fmtAmt(totalAssets)}</th></tr>
          </thead>
          <tbody>${rowsFor(assets)}</tbody>
        </table>
        <table class="w-full">
          <thead class="bg-slate-50 text-[11px] text-slate-500 uppercase">
            <tr><th class="px-3 py-1.5 text-left" colspan="2">${t("reports.bs.liabilities")}</th>
              <th class="px-3 py-1.5 text-right">${fmtAmt(totalLiab)}</th></tr>
          </thead>
          <tbody>${rowsFor(liabilities)}
            <tr class="border-t border-slate-100 text-xs">
              <td class="px-3 py-1.5" colspan="2">${t("reports.bs.equity")}</td>
              <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(equity)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-slate-300 text-xs font-semibold">
              <td class="px-3 py-1.5" colspan="2">${t("reports.bs.total_liab_equity")}</td>
              <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(totalLiabEquity)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="mt-3 text-right">${integrityBadge(balanced, "reports.bs.balanced", "reports.bs.unbalanced")}</div>
    </div>`;
  mountDateHints(container);
  container.querySelector("#bs-as-of-date").addEventListener("change", async (e) => {
    _asOfDateBS = e.target.value;
    await renderBalanceSheet(container);
  });
}
async function renderActiveTab(root) {
  const container = root.querySelector("#tab-content");
  if (_tab === TAB_TB) return renderTrialBalance(container);
  if (_tab === TAB_PNL) return renderPnl(container);
  return renderBalanceSheet(container);
}
async function render(root) {
  _refresh = true;
  _tab = TAB_TB;
  _asOfDateTB = today();
  _asOfDateBS = today();
  _pnlYear = (/* @__PURE__ */ new Date()).getFullYear();
  _comparePrevMonth = false;
  root.innerHTML = shellHtml();
  await renderActiveTab(root);
  root.querySelector("#btn-export-pdf").addEventListener("click", () => window.print());
  root.addEventListener("click", async (e) => {
    const tabBtn = e.target.closest("[data-tab]");
    if (!tabBtn) return;
    _tab = tabBtn.dataset.tab;
    root.querySelectorAll("[data-tab]").forEach((b) => {
      const active = b.dataset.tab === _tab;
      b.className = `px-4 py-2 text-sm font-medium rounded-tl-lg rounded-tr-lg no-print ${active ? "bg-white border border-b-0 border-slate-200 text-blue-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`;
    });
    await renderActiveTab(root);
  });
}
export {
  render
};
