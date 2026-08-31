import {
  kindI18nLabel
} from "./chunk-63NTIMGD.js";
import {
  resolveSalesRepLabel
} from "./chunk-OCM54TMO.js";
import {
  AIR_DEFAULT_DIMS,
  BASE_CURRENCY,
  DIM_OPTIONS,
  PNL_DEFAULT_ROW_DIMS,
  compose,
  composeAir,
  composeBuySellBreakdown,
  filterByDims
} from "./chunk-V4KY2AGW.js";
import {
  todayLocal
} from "./chunk-7INC2TTZ.js";
import {
  currentUserEmail
} from "./chunk-M3ODLRBG.js";
import "./chunk-NGKBNKFN.js";
import {
  isMountedRoute
} from "./chunk-EN6RKDYW.js";
import {
  mountAgGrid
} from "./chunk-4WAHI6XV.js";
import "./chunk-7DW526V3.js";
import {
  t
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/ui/bootstrap/components/pivot-table.js
import { LitElement, html } from "https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm";

// output/web/js.tmp/implementations/kernel/core_abstractions/util/pnl-dim-i18n.js
var DIM_I18N_KEY = {
  period: "period",
  sales_rep: "sales_rep",
  customer: "customer",
  trade_lane: "pnl.col.trade_lane",
  container_type: "pnl.col.container_type",
  carrier: "carrier",
  route_lane: "pnl.col.route_lane",
  carrier_iata: "pnl.col.carrier_iata",
  mode: "pnl.mode_filter"
};
function humanize(dim) {
  return String(dim).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function dimLabel(dim) {
  if (!dim) return "";
  const key = DIM_I18N_KEY[dim];
  if (!key) return humanize(dim);
  const label = t(key);
  return label === key ? humanize(dim) : label;
}
function drillDimValueLabel(dim, value) {
  if (dim !== "mode" || typeof value !== "string") return value;
  const key = `pnl.mode.${value.toLowerCase()}`;
  const label = t(key);
  return label === key ? value : label;
}
function formatDrillDimDesc(rowDims) {
  return Object.entries(rowDims).map(([k, v]) => `${dimLabel(k)}:${drillDimValueLabel(k, v)}`).join(" \xB7 ");
}

// output/web/js.tmp/implementations/ui/bootstrap/components/pivot-table.js
var DEFAULT_DIMS = ["period", "sales_rep"];
function fmtVnd(n) {
  if (!n && n !== 0) return "\u2014";
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString();
}
function fmtPct(n) {
  return `${Number(n || 0).toFixed(1)}%`;
}
function deltaArrow(curr, prev) {
  if (prev == null || prev === 0) return "\u2014";
  const delta = (curr - prev) / Math.abs(prev) * 100;
  const isPositive = delta > 0;
  if (isPositive) {
    return `<span class="text-emerald-600">\u25B2 +${delta.toFixed(1)}%</span>`;
  }
  return `<span class="text-red-500">\u25BC ${delta.toFixed(1)}%</span>`;
}
var VdgPivotTable = class extends LitElement {
  static properties = {
    rows: { type: Array },
    dims: { type: Array },
    showComparison: { type: Boolean },
    // sync_health.rs's own verdict for this pivot's source kinds (shipment/pnl_line) — an empty
    // `rows` array must render this, never `pivot.no_data`, when the load itself failed.
    loadFailed: { type: Boolean },
    // Widened alongside empty-state.js's own LoadOutcome: a collection load can land as "N good,
    // M skipped" instead of aborting on one bad record (sync_health.rs's own per-kind remote-skip
    // count, D13) — rendered even when `rows` is non-empty, so a partial load never presents as a
    // complete one just because the good rows happened to be enough to fill the table.
    skippedCount: { type: Number },
    _dim0: { type: String, state: true },
    _dim1: { type: String, state: true }
  };
  createRenderRoot() {
    return this;
  }
  constructor() {
    super();
    this.rows = [];
    this.dims = DEFAULT_DIMS;
    this.showComparison = false;
    this.loadFailed = false;
    this.skippedCount = 0;
    this._dim0 = DEFAULT_DIMS[0];
    this._dim1 = DEFAULT_DIMS[1];
  }
  _retry() {
    this.dispatchEvent(new CustomEvent("vdg:pivot-retry", { bubbles: true, composed: true }));
  }
  updated(changed) {
    if (changed.has("dims") && this.dims) {
      this._dim0 = this.dims[0] || DEFAULT_DIMS[0];
      this._dim1 = this.dims[1] || DEFAULT_DIMS[1];
    }
  }
  _emitDimChange() {
    this.dispatchEvent(new CustomEvent("vdg:pivot-dims-changed", {
      bubbles: true,
      composed: true,
      detail: { dims: [this._dim0, this._dim1] }
    }));
  }
  _cellClick(row, metric) {
    this.dispatchEvent(new CustomEvent("vdg:pivot-cell-click", {
      bubbles: true,
      composed: true,
      detail: { rowDims: row.dims, colMetric: metric }
    }));
  }
  _grouped() {
    const groups = /* @__PURE__ */ new Map();
    for (const row of this.rows) {
      const k0 = row.dims[this._dim0] || "\u2014";
      const k1 = row.dims[this._dim1] || "\u2014";
      if (!groups.has(k0)) groups.set(k0, /* @__PURE__ */ new Map());
      groups.get(k0).set(k1, row);
    }
    return groups;
  }
  _renderDimSelectors() {
    return html`
      <div class="flex items-center gap-3 mb-3">
        <label class="text-xs text-slate-500">${t("pivot.group_by")}</label>
        <select
          class="text-xs border border-slate-200 rounded px-2 py-1"
          @change="${(e) => {
      this._dim0 = e.target.value;
      this._emitDimChange();
    }}"
        >
          ${DIM_OPTIONS.map((d) => html`
            <option value="${d}" ?selected="${d === this._dim0}">${dimLabel(d)}</option>`)}
        </select>
        <label class="text-xs text-slate-500">${t("pivot.then_by")}</label>
        <select
          class="text-xs border border-slate-200 rounded px-2 py-1"
          @change="${(e) => {
      this._dim1 = e.target.value;
      this._emitDimChange();
    }}"
        >
          ${DIM_OPTIONS.map((d) => html`
            <option value="${d}" ?selected="${d === this._dim1}">${dimLabel(d)}</option>`)}
        </select>
      </div>`;
  }
  _renderHeaderRow() {
    return html`
      <tr class="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider">
        <th class="px-3 py-2 text-left sticky left-0 bg-slate-50">${dimLabel(this._dim0)}</th>
        <th class="px-3 py-2 text-left">${dimLabel(this._dim1)}</th>
        <th class="px-3 py-2 text-right cursor-pointer hover:text-blue-600"
            @click="${() => {
    }}">${t("revenue")}</th>
        <th class="px-3 py-2 text-right">${t("cost")}</th>
        <th class="px-3 py-2 text-right cursor-pointer hover:text-blue-600"
            >${t("margin")}</th>
        <th class="px-3 py-2 text-right">${t("margin_pct")}</th>
        <th class="px-3 py-2 text-right">${t("pivot.ships_count")}</th>
        <th class="px-3 py-2 text-right">${t("pivot.avg_margin")}</th>
        ${this.showComparison ? html`
          <th class="px-3 py-2 text-right text-slate-400">${t("pivot.prev_period")}</th>
          <th class="px-3 py-2 text-right text-slate-400">${t("pivot.yoy")}</th>` : ""}
      </tr>`;
  }
  _renderGroupRows(groups) {
    const trs = [];
    for (const [g0, subMap] of groups) {
      let first = true;
      for (const [g1, row] of subMap) {
        const marginCls = row.margin_vnd >= 0 ? "text-emerald-600" : "text-red-500";
        const shipmentCount = row.shipment_count;
        trs.push(html`
          <tr class="border-t border-slate-100 hover:bg-blue-50 transition text-xs">
            ${first ? html`
              <td class="px-3 py-2 font-semibold text-slate-800 sticky left-0 bg-white"
                  rowspan="${subMap.size}">${g0}</td>` : ""}
            <td class="px-3 py-2 text-slate-600">${g1}</td>
            <td class="px-3 py-2 text-right font-mono cursor-pointer"
                @click="${() => this._cellClick(row, "revenue_vnd")}">${fmtVnd(row.revenue_vnd)}</td>
            <td class="px-3 py-2 text-right font-mono">${fmtVnd(row.cost_vnd)}</td>
            <td class="px-3 py-2 text-right font-mono ${marginCls} cursor-pointer"
                @click="${() => this._cellClick(row, "margin_vnd")}">${fmtVnd(row.margin_vnd)}</td>
            <td class="px-3 py-2 text-right ${marginCls}">${fmtPct(row.margin_pct)}</td>
            <td class="px-3 py-2 text-right">${shipmentCount}</td>
            <td class="px-3 py-2 text-right font-mono">${fmtVnd(row.avg_margin)}</td>
            ${this.showComparison ? html`
              <td class="px-3 py-2 text-right text-[11px]">
                ${html([deltaArrow(row.margin_vnd, row.prev_margin_vnd)])}
              </td>
              <td class="px-3 py-2 text-right text-[11px]">
                ${html([deltaArrow(row.margin_vnd, row.yoy_margin_vnd)])}
              </td>` : ""}
          </tr>`);
        first = false;
      }
    }
    return trs;
  }
  _renderGrandTotal() {
    if (!this.rows.length) return html``;
    const totals = this.rows.reduce(
      (acc, r) => {
        acc.revenue_vnd += r.revenue_vnd;
        acc.cost_vnd += r.cost_vnd;
        acc.margin_vnd += r.margin_vnd;
        acc.shipment_count += r.shipment_count;
        return acc;
      },
      { revenue_vnd: 0, cost_vnd: 0, margin_vnd: 0, shipment_count: 0 }
    );
    const pct = totals.revenue_vnd > 0 ? totals.margin_vnd / totals.revenue_vnd * 100 : 0;
    const cls = totals.margin_vnd >= 0 ? "text-emerald-600" : "text-red-500";
    const shipmentTotal = totals.shipment_count;
    return html`
      <tr class="border-t-2 border-slate-300 bg-slate-50 text-xs font-semibold">
        <td class="px-3 py-2 sticky left-0 bg-slate-50" colspan="2">${t("pivot.grand_total")}</td>
        <td class="px-3 py-2 text-right font-mono">${fmtVnd(totals.revenue_vnd)}</td>
        <td class="px-3 py-2 text-right font-mono">${fmtVnd(totals.cost_vnd)}</td>
        <td class="px-3 py-2 text-right font-mono ${cls}">${fmtVnd(totals.margin_vnd)}</td>
        <td class="px-3 py-2 text-right ${cls}">${fmtPct(pct)}</td>
        <td class="px-3 py-2 text-right">${shipmentTotal}</td>
        <td></td>
        ${this.showComparison ? html`<td></td><td></td>` : ""}
      </tr>`;
  }
  render() {
    const groups = this._grouped();
    const showPartialBanner = this.rows.length > 0 && this.skippedCount > 0;
    return html`
      <div>
        ${this._renderDimSelectors()}
        ${showPartialBanner ? html`
          <div class="text-xs text-amber-600 px-1 pb-2">${t("empty_state.load_failed.partial", { n: this.skippedCount })}</div>` : ""}
        <div class="overflow-x-auto border border-slate-200 rounded-xl">
          <table class="w-full border-collapse text-xs">
            <thead class="sticky top-0 z-10">${this._renderHeaderRow()}</thead>
            <tbody>
              ${this._renderGroupRows(groups)}
              ${this._renderGrandTotal()}
            </tbody>
          </table>
        </div>
        ${!this.rows.length && this.loadFailed ? html`
          <div class="flex flex-col items-center gap-3 py-10">
            <div class="text-sm text-red-600 font-medium">${t("pivot.load_failed")}</div>
            ${this.skippedCount > 0 ? html`
              <div class="text-xs text-amber-600">${t("empty_state.load_failed.partial", { n: this.skippedCount })}</div>` : ""}
            <button type="button" @click="${() => this._retry()}"
              class="px-4 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors">
              ${t("empty_state.load_failed.retry")}
            </button>
          </div>` : !this.rows.length ? html`
          <div class="text-center text-slate-400 text-sm py-10">${t("pivot.no_data")}</div>` : ""}
      </div>`;
  }
};
customElements.define("vdg-pivot-table", VdgPivotTable);

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/pnl-drill-lines.js
var VND = "VND";
var VND_RATE = 1;
var EMPTY = "\u2014";
var VND_FIELD = { buying: "buying_vnd_pay", selling: "selling_vnd_collect" };
function fmtInt(n) {
  return Number(n).toLocaleString("en-US");
}
function drillLineSideView(line, side) {
  const amount = Number(line[`${side}_amount`]) || 0;
  const ccy = line[`${side}_currency`] || VND;
  const present = Number.isFinite(amount) && amount !== 0;
  if (ccy === VND) {
    return { present, amount, ccy, rate: VND_RATE, vnd: amount, rateMissing: false };
  }
  const storedRate = Number(line[`${side}_fx_rate`]);
  const rateOk = Number.isFinite(storedRate) && storedRate > 0;
  if (!rateOk) {
    return { present, amount, ccy, rate: null, vnd: null, rateMissing: true };
  }
  const vnd = Number(line[VND_FIELD[side]]);
  return {
    present,
    amount,
    ccy,
    rate: storedRate,
    vnd: Number.isFinite(vnd) ? vnd : null,
    rateMissing: false
  };
}
function sideCells(view) {
  const na = t("fx.report.na");
  if (!view.present) {
    const dash = `<td class="px-3 py-1.5 text-right font-mono text-slate-400">${na}</td>`;
    return `${dash}<td class="px-3 py-1.5 text-slate-400">${na}</td>${dash}${dash}`;
  }
  const rateCell = view.rateMissing ? na : fmtInt(view.rate);
  const vndCell = view.rateMissing || view.vnd == null ? na : fmtInt(view.vnd);
  return `
    <td class="px-3 py-1.5 text-right font-mono">${fmtInt(view.amount)}</td>
    <td class="px-3 py-1.5">${view.ccy}</td>
    <td class="px-3 py-1.5 text-right font-mono">${rateCell}</td>
    <td class="px-3 py-1.5 text-right font-mono">${vndCell}</td>`;
}
function drillLinesRowsHtml(lines) {
  return (lines || []).map((l) => {
    const buy = sideCells(drillLineSideView(l, "buying"));
    const sell = sideCells(drillLineSideView(l, "selling"));
    const kind = kindI18nLabel(l.kind ?? l.subtype) || EMPTY;
    return `
    <tr data-line-id="${l.id ?? ""}" class="border-t border-slate-100 text-xs">
      <td class="px-3 py-1.5">${kind}</td>${buy}${sell}
    </tr>`;
  }).join("");
}
function drillLinesHeadHtml() {
  return `<thead class="bg-slate-50 text-[11px] text-slate-500 uppercase">
    <tr>
      <th class="px-3 py-1.5 text-left">${t("sales_new.col_kind")}</th>
      <th class="px-3 py-1.5 text-right">${t("sales_new.col_buy_amt")}</th>
      <th class="px-3 py-1.5">${t("sales_new.col_currency")}</th>
      <th class="px-3 py-1.5 text-right">${t("sales_new.col_fx_rate")}</th>
      <th class="px-3 py-1.5 text-right">${t("fx.report.col_vnd")}</th>
      <th class="px-3 py-1.5 text-right">${t("sales_new.col_sell_amt")}</th>
      <th class="px-3 py-1.5">${t("sales_new.col_currency")}</th>
      <th class="px-3 py-1.5 text-right">${t("sales_new.col_fx_rate")}</th>
      <th class="px-3 py-1.5 text-right">${t("fx.report.col_vnd")}</th>
    </tr>
  </thead>`;
}

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/pnl-report-export.js
var SHEETJS_CDN = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
var _sheetJsLoaded = false;
async function loadSheetJs() {
  if (_sheetJsLoaded || window.XLSX) {
    _sheetJsLoaded = true;
    return;
  }
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = SHEETJS_CDN;
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
  _sheetJsLoaded = true;
}
async function exportExcel(rows, period) {
  await loadSheetJs();
  if (!window.XLSX) return;
  const XLSX = window.XLSX;
  const header = ["Dims", "Revenue VND", "Cost VND", "Margin VND", "Margin %", "# Shipments"];
  const wsData = [header, ...rows.map((r) => [
    Object.values(r.dims).join(" \xB7 "),
    r.revenue_vnd,
    r.cost_vnd,
    r.margin_vnd,
    r.margin_pct / 100,
    r.shipment_count
  ])];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = { font: { bold: true } };
  }
  const fmtCols = [1, 2, 3];
  for (let R = 1; R <= rows.length; R++) {
    for (const C of fmtCols) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (ws[addr]) ws[addr].z = "#,##0";
    }
    const pctAddr = XLSX.utils.encode_cell({ r: R, c: 4 });
    if (ws[pctAddr]) ws[pctAddr].z = "0.0%";
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PnL Report");
  const date = todayLocal();
  XLSX.writeFile(wb, `vdg-pnl-${period.toLowerCase()}-${date}.xlsx`);
}

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/pnl-report.js
var PERIODS = ["MTD", "QTD", "YTD", "TTM"];
var MODE_ALL = "All";
var MODE_SEA = "Sea";
var MODE_AIR = "Air";
var _period = "MTD";
var _mode = MODE_ALL;
var _showComparison = false;
var _pivotRows = [];
var _grandTotals = {};
var _allShipments = [];
var _allPnlLines = [];
var _groupedShipments = [];
var _dims = [...PNL_DEFAULT_ROW_DIMS];
var _airDims = [...AIR_DEFAULT_DIMS];
var _loadOutcome = { failed: false, skipped: 0 };
var _onPivotClick;
var _onPivotDims;
var _onPivotRetry;
var OWN_ROUTE = "/manager/reports/pnl";
var _onLocale;
function getRepo() {
  return window.__vdg_repo;
}
function fmtNum(n) {
  if (!n && n !== 0) return "\u2014";
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  return n.toLocaleString();
}
function buildDrillColumnDefs() {
  return [
    { field: "shipment_ref", headerName: t("pnl.drill.col.ref"), width: 120 },
    { field: "customer", headerName: t("customer"), flex: 1 },
    { field: "state", headerName: t("state"), width: 130 },
    { field: "etd", headerName: t("pnl.drill.col.etd"), width: 100 },
    { field: "margin_pct", headerName: t("margin_pct"), width: 90 },
    { field: "sales_rep", headerName: t("pnl.drill.col.sales"), width: 100 }
  ];
}
async function recompose() {
  if (_mode === MODE_AIR) {
    const { rows: rows2, grandTotals: grandTotals2 } = composeAir({
      shipments: _allShipments,
      pnlLines: _allPnlLines,
      dims: _airDims
    });
    _pivotRows = rows2;
    _grandTotals = grandTotals2;
    _groupedShipments = _allShipments;
    return { rows: rows2, grandTotals: grandTotals2 };
  }
  const seaShipments = _mode === MODE_SEA ? _allShipments.filter((s) => s.mode !== "air") : _allShipments;
  const activeDims = _mode === MODE_ALL ? ["mode", ..._dims] : _dims;
  const { rows, grandTotals, groupedShipments } = compose({
    shipments: seaShipments,
    pnlLines: _allPnlLines,
    period: _period,
    dims: activeDims
  });
  if (_mode === MODE_ALL) {
    for (const row of rows) {
      if (!row.dims.mode) row.dims.mode = "\u2014";
    }
  }
  _pivotRows = rows;
  _grandTotals = grandTotals;
  _groupedShipments = groupedShipments;
  return { rows, grandTotals };
}
async function renderDrillPanel(container, rowDims) {
  const refFn = (s) => s.shipment_ref || s.ShipmentRef || s.id;
  const filtered = filterByDims(_groupedShipments, rowDims);
  const refs = filtered.map(refFn);
  const dimDesc = formatDrillDimDesc(rowDims);
  const refSet = new Set(refs);
  const filteredLines = _allPnlLines.filter((l) => refSet.has(l.shipment_ref || l.ShipmentRef));
  const breakdown = composeBuySellBreakdown(_allPnlLines, refs);
  const bsTrs = breakdown.map((r) => `
    <tr class="border-t border-slate-100 text-xs">
      <td class="px-3 py-1.5">${kindI18nLabel(r.kind)}</td>
      <td class="px-3 py-1.5 text-right font-mono">${fmtNum(r.buy_vnd)}</td>
      <td class="px-3 py-1.5 text-right font-mono">${fmtNum(r.sell_vnd)}</td>
      <td class="px-3 py-1.5 text-right font-mono ${r.margin_vnd >= 0 ? "text-emerald-600" : "text-red-500"}">${fmtNum(r.margin_vnd)}</td>
      <td class="px-3 py-1.5 text-right">${r.margin_pct.toFixed(1)}%</td>
    </tr>`).join("");
  const lineTrs = drillLinesRowsHtml(filteredLines);
  const gridRows = filtered.map((s) => ({
    id: s.id,
    shipment_ref: refFn(s),
    customer: s.customer || s.Customer || "\u2014",
    lane: `${s.pol || "?"}\u2192${s.pod || "?"}`,
    state: s.state || s.State || "\u2014",
    etd: s.etd || "\u2014",
    margin_pct: s.margin_pct != null ? `${Number(s.margin_pct).toFixed(1)}%` : "\u2014",
    sales_rep: resolveSalesRepLabel(s.sales_rep || s.SalesRep || "", { email: currentUserEmail() }, t) || "\u2014"
  }));
  container.innerHTML = `
    <div class="border border-slate-200 rounded-xl p-4 bg-white">
      <div class="text-sm font-semibold text-slate-800 mb-2">
        ${dimDesc} \xB7 ${filtered.length} ${t("shipments")}
      </div>
      <div id="drill-grid" class="ag-theme-quartz" style="height:280px"></div>
      <details class="mt-4">
        <summary class="text-xs font-medium text-slate-700 cursor-pointer select-none">
          ${t("pnl.drill.buy_sell_breakdown", { currency: BASE_CURRENCY })}
        </summary>
        <table class="w-full mt-2 text-xs">
          <thead class="bg-slate-50 text-[11px] text-slate-500 uppercase">
            <tr>
              <th class="px-3 py-1.5 text-left">${t("pnl.drill.kind")}</th>
              <th class="px-3 py-1.5 text-right">${t("pnl.drill.buy")}</th>
              <th class="px-3 py-1.5 text-right">${t("pnl.drill.sell")}</th>
              <th class="px-3 py-1.5 text-right">${t("margin")}</th>
              <th class="px-3 py-1.5 text-right">${t("margin_pct")}</th>
            </tr>
          </thead>
          <tbody>${bsTrs || `<tr><td colspan="5" class="px-3 py-2 text-slate-400">${t("pnl.drill.no_line_data")}</td></tr>`}</tbody>
        </table>
      </details>
      <details class="mt-4" id="drill-lines-detail">
        <summary class="text-xs font-medium text-slate-700 cursor-pointer select-none">
          ${t("pnl.drill.cost_lines", { n: filteredLines.length })}
        </summary>
        <table class="w-full mt-2 text-xs" id="drill-lines-table">
          ${drillLinesHeadHtml()}
          <tbody>${lineTrs || `<tr><td colspan="9" class="px-3 py-2 text-slate-400">${t("pnl.drill.no_lines")}</td></tr>`}</tbody>
        </table>
      </details>
    </div>`;
  if (window.agGrid) {
    mountAgGrid(container.querySelector("#drill-grid"), {
      columnDefs: buildDrillColumnDefs(),
      rowData: gridRows,
      rowHeight: 32,
      onRowClicked: (ev) => {
        window.dispatchEvent(new CustomEvent("vdg:open-detail", {
          detail: { kind: "shipment", id: ev.data.id }
        }));
      }
    });
  }
}
async function render(root) {
  if (_onPivotClick) window.removeEventListener("vdg:pivot-cell-click", _onPivotClick);
  if (_onPivotDims) window.removeEventListener("vdg:pivot-dims-changed", _onPivotDims);
  if (_onPivotRetry) window.removeEventListener("vdg:pivot-retry", _onPivotRetry);
  if (_onLocale) window.removeEventListener("vdg:locale-changed", _onLocale);
  const repo = getRepo();
  if (repo) {
    [_allShipments, _allPnlLines] = await Promise.all([
      repo.list("shipment", null),
      repo.list("pnl_line", null)
    ]);
    const failedKinds = repo.sync_failed_kinds?.() ?? [];
    const skippedKinds = repo.sync_skipped_kinds?.() ?? [];
    const relevantKinds = ["shipment", "pnl_line"];
    const skipped = relevantKinds.reduce((sum, k) => sum + (skippedKinds.includes(k) ? repo.sync_skipped_count?.(k) ?? 0 : 0), 0);
    _loadOutcome = { failed: relevantKinds.some((k) => failedKinds.includes(k)), skipped };
  }
  const periodBtns = PERIODS.map((p) => `<button data-period="${p}"
      class="px-3 py-1.5 text-xs rounded-lg font-medium ${p === _period ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}"
    >${p}</button>`).join("");
  const modeOpts = [MODE_ALL, MODE_SEA, MODE_AIR].map(
    (m) => `<option value="${m}" ${m === _mode ? "selected" : ""}>${t(`pnl.mode.${m.toLowerCase()}`)}</option>`
  ).join("");
  root.innerHTML = `
    <div class="p-6 space-y-4 max-w-[1600px] mx-auto">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <div class="flex gap-1">${periodBtns}</div>
          <div class="flex items-center gap-1.5">
            <span class="text-xs text-slate-500">${t("pnl.mode_filter")}</span>
            <select id="sel-mode"
              class="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400">
              ${modeOpts}
            </select>
          </div>
        </div>
        <div class="flex gap-2">
          <button id="btn-compare"
            class="px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">
            ${t(_showComparison ? "comparing_check" : "compare")}
          </button>
          <button id="btn-export-xl"
            class="px-3 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
            ${t("export_excel")}
          </button>
        </div>
      </div>

      <div id="pivot-container"></div>
      <div id="drill-container"></div>
    </div>`;
  const pivotContainer = root.querySelector("#pivot-container");
  const drillContainer = root.querySelector("#drill-container");
  async function refreshPivot() {
    await recompose();
    pivotContainer.innerHTML = "";
    const pt = document.createElement("vdg-pivot-table");
    pt.rows = _pivotRows;
    pt.dims = _dims;
    pt.showComparison = _showComparison;
    pt.loadFailed = _loadOutcome.failed;
    pt.skippedCount = _loadOutcome.skipped;
    pivotContainer.appendChild(pt);
  }
  await refreshPivot();
  root.addEventListener("click", async (e) => {
    const pBtn = e.target.closest("[data-period]");
    if (pBtn) {
      _period = pBtn.dataset.period;
      root.querySelectorAll("[data-period]").forEach((b) => b.className = b.className.replace("bg-blue-600 text-white", "bg-slate-100 text-slate-600 hover:bg-slate-200"));
      pBtn.className = pBtn.className.replace("bg-slate-100 text-slate-600 hover:bg-slate-200", "bg-blue-600 text-white");
      await refreshPivot();
    }
  });
  root.querySelector("#sel-mode").addEventListener("change", async (e) => {
    _mode = e.target.value;
    await refreshPivot();
  });
  root.querySelector("#btn-compare").addEventListener("click", async () => {
    _showComparison = !_showComparison;
    root.querySelector("#btn-compare").textContent = t(_showComparison ? "comparing_check" : "compare");
    await refreshPivot();
  });
  root.querySelector("#btn-export-xl").addEventListener("click", () => exportExcel(_pivotRows, _period));
  _onPivotClick = (e) => {
    renderDrillPanel(drillContainer, e.detail.rowDims);
  };
  _onPivotDims = async (e) => {
    if (_mode === MODE_AIR) {
      _airDims = e.detail.dims;
    } else {
      _dims = e.detail.dims;
    }
    await refreshPivot();
  };
  _onPivotRetry = () => {
    render(root);
  };
  window.addEventListener("vdg:pivot-cell-click", _onPivotClick);
  window.addEventListener("vdg:pivot-dims-changed", _onPivotDims);
  window.addEventListener("vdg:pivot-retry", _onPivotRetry);
  _onLocale = () => {
    if (!isMountedRoute(OWN_ROUTE)) return;
    const liveRoot = document.getElementById("view-root");
    if (liveRoot) render(liveRoot);
  };
  window.addEventListener("vdg:locale-changed", _onLocale);
}
export {
  buildDrillColumnDefs,
  render
};
