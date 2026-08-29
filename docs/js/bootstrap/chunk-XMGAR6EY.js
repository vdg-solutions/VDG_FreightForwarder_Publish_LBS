import {
  getRateForDate
} from "./chunk-QOACCM4N.js";
import {
  lineVnd
} from "./chunk-53TPUVAF.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new-form/pnl-line-fx.js
var VND_CURRENCY = "VND";
var FX_CELL_CLS = "border border-slate-200 rounded px-1 py-0.5 text-xs";
var RO_CELL_CLS = `${FX_CELL_CLS} bg-slate-50`;
var LINE_CURRENCY_OPTIONS = ["USD", "VND", "EUR", "SGD", "JPY"];
var DEFAULT_HEADER_CURRENCY = "VND";
function computeLineVnd(amount, currency, fxRate, bookCurrency) {
  return lineVnd(amount, currency, fxRate, bookCurrency);
}
function lockFxIfVnd(currency, bookCurrency) {
  return currency === bookCurrency ? { rate: 1, locked: true } : { rate: null, locked: false };
}
function resolveHeaderCurrency(saved, configuredDefault) {
  const bridge = window.workspace_header_currency;
  if (typeof bridge !== "function") return saved || configuredDefault || DEFAULT_HEADER_CURRENCY;
  return bridge(saved || "", configuredDefault || "");
}
function bookCurrencyOf(el) {
  return el?.closest("form")?.querySelector("[name=book_currency]")?.value || DEFAULT_HEADER_CURRENCY;
}
var SIDE_DIRECTION = { buy: "Sell", sell: "Buy" };
async function prefillFxRate(fxRepo, currency, fxDate, side) {
  if (!fxRepo || !fxDate || !currency || currency === VND_CURRENCY) return null;
  return getRateForDate(fxRepo, fxDate, currency, SIDE_DIRECTION[side]);
}
function currencySelectHtml(name, selected, cls = `w-16 ${FX_CELL_CLS}`) {
  const opts = LINE_CURRENCY_OPTIONS.map((c) => `<option value="${c}"${c === selected ? " selected" : ""}>${c}</option>`).join("");
  return `<select name="${name}" class="${cls}">${opts}</select>`;
}
function fxCellsHtml(side, line = {}, headerCurrency, bookCurrency) {
  const currency = line[`${side}_currency`] || headerCurrency || bookCurrency || VND_CURRENCY;
  const { rate, locked } = lockFxIfVnd(currency, bookCurrency);
  const rateVal = locked ? rate : line[`${side}_fx_rate`] ?? "";
  const rateCls = locked ? RO_CELL_CLS : FX_CELL_CLS;
  return `
    <td class="px-1 py-1">${currencySelectHtml(`${side}_currency`, currency)}</td>
    <td class="px-1 py-1">
      <input name="${side}_fx_rate" type="number" step="any" value="${rateVal}"${locked ? " readonly" : ""}
        class="w-16 ${rateCls} text-right" /></td>
    <td class="px-1 py-1">
      <input name="${side}_fx_date" type="date" value="${line[`${side}_fx_date`] || ""}"
        class="w-28 ${FX_CELL_CLS}" /></td>`;
}
function fmtVndNum(val) {
  if (val == null || val === "") return "";
  const n = Number(val);
  if (isNaN(n) || n === 0) return "";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function vndCellHtml(side, line = {}, bookCurrency) {
  const amt = side === "buy" ? line.buy_amt : line.sell_amt;
  const currency = line[`${side}_currency`] || bookCurrency || VND_CURRENCY;
  const fxRate = side === "buy" ? line.buy_fx_rate : line.sell_fx_rate;
  const vnd = computeLineVnd(amt, currency, fxRate, bookCurrency);
  const fieldName = side === "buy" ? "vnd_pay" : "vnd_collect";
  const colorCls = side === "buy" ? "text-blue-700 bg-blue-50/40" : "text-emerald-700 bg-emerald-50/40";
  return `<td class="px-1 py-1">
    <input name="${fieldName}" type="text" value="${fmtVndNum(vnd)}" placeholder="0" readonly
      class="w-28 ${RO_CELL_CLS} text-right font-semibold ${colorCls}" /></td>`;
}
function summarizeLineCurrencies(lines = [], commissionLines = []) {
  const counts = /* @__PURE__ */ new Map();
  const bump = (currency) => {
    if (currency) counts.set(currency, (counts.get(currency) || 0) + 1);
  };
  for (const l of lines) {
    const used = /* @__PURE__ */ new Set();
    if (l.buy_amt) used.add(l.buy_currency);
    if (l.sell_amt) used.add(l.sell_currency);
    for (const c of used) bump(c);
  }
  for (const l of commissionLines) {
    if (l.amount_fx) bump(l.currency);
  }
  return [...counts.entries()].map(([currency, count]) => ({ currency, count })).sort((a, b) => b.count - a.count || a.currency.localeCompare(b.currency));
}
function applyFxDateDefaults(row, docDate) {
  if (!row || !docDate) return;
  ["buy_fx_date", "sell_fx_date"].forEach((name) => {
    const el = row.querySelector(`[name=${name}]`);
    if (el && !el.value) el.value = docDate;
  });
}
function _sideOf(name, suffix) {
  if (name === `buy${suffix}`) return "buy";
  if (name === `sell${suffix}`) return "sell";
  return null;
}
function _recomputeVndCell(row, side) {
  if (!row) return;
  const amtEl = row.querySelector(`[name=${side === "buy" ? "buy_amt" : "sell_amt"}]`);
  const curEl = row.querySelector(`[name=${side}_currency]`);
  const rateEl = row.querySelector(`[name=${side}_fx_rate]`);
  const vndEl = row.querySelector(`[name=${side === "buy" ? "vnd_pay" : "vnd_collect"}]`);
  if (!vndEl) return;
  const vnd = computeLineVnd(amtEl?.value, curEl?.value, rateEl?.value, bookCurrencyOf(row));
  vndEl.value = fmtVndNum(vnd);
}
async function prefillRowFx(row, side, fxRepo, { overwrite = false } = {}) {
  if (!row) return;
  const currencyEl = row.querySelector(`[name=${side}_currency]`);
  const rateEl = row.querySelector(`[name=${side}_fx_rate]`);
  const dateEl = row.querySelector(`[name=${side}_fx_date]`);
  if (!fxRepo || !currencyEl || currencyEl.value === VND_CURRENCY) return;
  if (rateEl?.dataset.manuallySet === "true") return;
  if (!overwrite && rateEl?.value !== "") return;
  if (overwrite && rateEl) rateEl.value = "";
  const fetched = await prefillFxRate(fxRepo, currencyEl.value, dateEl?.value, side);
  if (rateEl && rateEl.dataset.manuallySet !== "true" && (fetched != null || overwrite)) {
    if (fetched != null) rateEl.value = fetched;
    _recomputeVndCell(row, side);
    row.dispatchEvent(new Event("input", { bubbles: true }));
  }
}
async function _onCurrencyChange(row, side, fxRepo) {
  if (!row) return;
  const currencyEl = row.querySelector(`[name=${side}_currency]`);
  const rateEl = row.querySelector(`[name=${side}_fx_rate]`);
  const { rate, locked } = lockFxIfVnd(currencyEl?.value, bookCurrencyOf(row));
  if (rateEl) {
    rateEl.readOnly = locked;
    rateEl.classList.toggle("bg-slate-50", locked);
    if (locked) {
      rateEl.value = rate;
      delete rateEl.dataset.manuallySet;
    } else if (rateEl.dataset.manuallySet !== "true") {
      rateEl.value = "";
    }
  }
  _recomputeVndCell(row, side);
  if (!locked) await prefillRowFx(row, side, fxRepo, { overwrite: true });
}
async function _onFxDateChange(row, side, fxRepo) {
  await prefillRowFx(row, side, fxRepo, { overwrite: true });
}
function wireLineFx(tbody, fxRepo, docDate) {
  if (!tbody) return;
  Array.from(tbody.querySelectorAll("tr[data-line]")).forEach((row) => applyFxDateDefaults(row, docDate));
  tbody.addEventListener("change", (e) => {
    const currencySide = _sideOf(e.target.name, "_currency");
    if (currencySide) {
      _onCurrencyChange(e.target.closest("tr[data-line]"), currencySide, fxRepo);
      return;
    }
    const dateSide = _sideOf(e.target.name, "_fx_date");
    if (dateSide) _onFxDateChange(e.target.closest("tr[data-line]"), dateSide, fxRepo);
  });
  tbody.addEventListener("input", (e) => {
    if (e.target.name === "buy_amt" || e.target.name === "sell_amt") {
      _recomputeVndCell(e.target.closest("tr[data-line]"), e.target.name === "buy_amt" ? "buy" : "sell");
      return;
    }
    const rateSide = _sideOf(e.target.name, "_fx_rate");
    if (rateSide) {
      if (e.isTrusted) e.target.dataset.manuallySet = "true";
      _recomputeVndCell(e.target.closest("tr[data-line]"), rateSide);
    }
  });
}

export {
  LINE_CURRENCY_OPTIONS,
  DEFAULT_HEADER_CURRENCY,
  computeLineVnd,
  lockFxIfVnd,
  resolveHeaderCurrency,
  bookCurrencyOf,
  prefillFxRate,
  currencySelectHtml,
  fxCellsHtml,
  vndCellHtml,
  summarizeLineCurrencies,
  applyFxDateDefaults,
  prefillRowFx,
  wireLineFx
};
