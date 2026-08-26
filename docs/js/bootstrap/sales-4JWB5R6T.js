import {
  KIND_PNL_LINE,
  SPARKLINE_MONTHS,
  buildPeriodKey,
  compose,
  computeCommissions,
  computeSparkline
} from "./chunk-PJCMTW4C.js";
import {
  todayLocal
} from "./chunk-SWWKLW6A.js";
import {
  KIND_SHIPMENT,
  listShipments
} from "./chunk-U4BJYZQA.js";
import {
  navigate
} from "./chunk-H2H4WJDI.js";
import {
  agGridLocaleText
} from "./chunk-IWVPLMJU.js";
import "./chunk-EQL6UFHA.js";
import {
  ROLE_MANAGER
} from "./chunk-KXTXGKNK.js";
import {
  hasRole
} from "./chunk-B24LWBUG.js";
import {
  t
} from "./chunk-MGTH6QM4.js";

// output/web/js.tmp/implementations/ui/bootstrap/components/sparkline.js
import { LitElement, html } from "https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm";
var SPARKLINE_W_PX = 80;
var SPARKLINE_H_PX = 28;
var SPARKLINE_STROKE_COLOR = "#3b82f6";
var SPARKLINE_MIDPOINT_Y = SPARKLINE_H_PX / 2;
var SPARKLINE_PADDING = 2;
var VdgSparkline = class extends LitElement {
  static properties = {
    values: { type: Array }
  };
  createRenderRoot() {
    return this;
  }
  constructor() {
    super();
    this.values = [];
  }
  _polylinePoints() {
    const vals = this.values || [];
    if (!vals.length) {
      return `0,${SPARKLINE_MIDPOINT_Y} ${SPARKLINE_W_PX},${SPARKLINE_MIDPOINT_Y}`;
    }
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const usableH = SPARKLINE_H_PX - SPARKLINE_PADDING * 2;
    return vals.map((v, i) => {
      const x = i / Math.max(vals.length - 1, 1) * SPARKLINE_W_PX;
      const y = SPARKLINE_PADDING + usableH - (v - min) / range * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }
  render() {
    return html`
      <svg width="${SPARKLINE_W_PX}" height="${SPARKLINE_H_PX}"
           viewBox="0 0 ${SPARKLINE_W_PX} ${SPARKLINE_H_PX}"
           xmlns="http://www.w3.org/2000/svg"
           style="display:inline-block;vertical-align:middle;">
        <polyline
          points="${this._polylinePoints()}"
          fill="none"
          stroke="${SPARKLINE_STROKE_COLOR}"
          stroke-width="1.5"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
      </svg>`;
  }
};
customElements.define("vdg-sparkline", VdgSparkline);

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/sales.js
var DEFAULT_PERIOD_MODE = "month";
var KIND_COMMISSION_RULES = "commission_rules";
var CSV_COLS = "Sales Rep,Margin,TNDN 20%,Com KH/Line,Net,Sales %,Sales Share,LBS Share,Advances,Net Payable,Status";
var DRILL_TABS = ["shipments", "pipeline", "top_customers", "commission_history"];
var PIPELINE_STAGES = ["Lead", "Quote", "Won", "Closed"];
var PERIOD_MODES = ["month", "quarter", "year"];
var COMMISSION_STATUS_SETTLED = "Settled";
var DRILL_SHIPMENT_COLS = ["ref", "lane", "etd", "state"];
var PREVIEW_TABLE_COLS = ["sales", "margin", "tndn", "com_kh_line", "net", "sales_pct", "sales_share", "lbs_share", "net_payable", "status"];
var _shipments = [];
var _pnlLines = [];
var _rules = /* @__PURE__ */ new Map();
var _periodMode = DEFAULT_PERIOD_MODE;
var _periodDate = /* @__PURE__ */ new Date();
var _gridApi = null;
var _drillId = null;
var _onEntity;
function getRepo() {
  return window.__vdg_repo;
}
function fmtNum(n) {
  return Number(n ?? 0).toLocaleString("vi-VN");
}
function currentPeriodKey() {
  return buildPeriodKey(_periodMode, _periodDate);
}
function buildGridCols() {
  return [
    { field: "sales", headerName: t("mgr_sales.col.sales_rep"), flex: 1 },
    { field: "shipments", headerName: t("mgr_sales.col.shipments"), width: 90 },
    {
      field: "margin",
      headerName: t("mgr_sales.col.margin"),
      width: 130,
      valueFormatter: ({ value }) => fmtNum(value)
    },
    {
      field: "tndn",
      headerName: t("mgr_sales.col.tndn"),
      width: 110,
      valueFormatter: ({ value }) => fmtNum(value)
    },
    {
      field: "salesSharePct",
      headerName: t("mgr_sales.col.sales_pct"),
      width: 80,
      valueFormatter: ({ value }) => `${(value || 0).toFixed(0)}%`
    },
    {
      field: "commission",
      headerName: t("mgr_sales.col.sales_share"),
      width: 120,
      valueFormatter: ({ value }) => fmtNum(value)
    },
    {
      field: "lbsShare",
      headerName: t("mgr_sales.col.lbs_share"),
      width: 110,
      valueFormatter: ({ value }) => fmtNum(value)
    },
    {
      field: "netPayable",
      headerName: t("mgr_sales.col.net_payable"),
      width: 120,
      valueFormatter: ({ value }) => fmtNum(value)
    },
    {
      field: "sparkline",
      headerName: t("mgr_sales.col.trend"),
      width: 110,
      cellRenderer: (p) => {
        const el = document.createElement("vdg-sparkline");
        el.values = p.value || [];
        return el;
      }
    },
    { headerName: "", width: 100, cellRenderer: (p) => {
      const btn = document.createElement("button");
      btn.className = "px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100";
      btn.textContent = t("mgr_sales.drill");
      btn.onclick = () => {
        _drillId = p.data.salesId;
        const url = new URL(location.href);
        url.searchParams.set("sales", _drillId);
        history.replaceState(null, "", url);
        renderDrillPanel(document.querySelector("[data-mgr-sales]"));
      };
      return btn;
    } }
  ];
}
function buildRows(commRows) {
  return commRows.map((r) => ({
    ...r,
    sales: r.salesName || r.salesId,
    sparkline: computeSparkline(_shipments, _pnlLines, r.salesId, SPARKLINE_MONTHS)
  }));
}
function mountGrid(container, rows) {
  if (_gridApi) {
    try {
      _gridApi.destroy();
    } catch {
    }
    _gridApi = null;
  }
  container.innerHTML = '<div class="ag-theme-quartz" style="height:420px"></div>';
  if (!window.agGrid) return;
  const opts = {
    columnDefs: buildGridCols(),
    rowData: rows,
    defaultColDef: { sortable: true, resizable: true },
    localeText: agGridLocaleText()
  };
  const grid = new agGrid.Grid(container.querySelector(".ag-theme-quartz"), opts);
  _gridApi = grid.gridOptions?.api || opts.api;
}
function renderPreviewTable(container, rows, periodKey) {
  if (!rows.length) {
    container.innerHTML = `<div class="text-xs text-slate-400 p-4">${t("mgr_sales.no_closed")}</div>`;
    return;
  }
  const rowHtml = rows.map((r) => {
    const rowCls = r.status === COMMISSION_STATUS_SETTLED ? "opacity-60" : "";
    return `
    <tr class="${rowCls}">
      <td class="py-2 px-3 text-xs">${r.salesName}</td>
      <td class="py-2 px-3 text-xs text-right">${fmtNum(r.margin)}</td>
      <td class="py-2 px-3 text-xs text-right text-red-600">${fmtNum(r.tndn)}</td>
      <td class="py-2 px-3 text-xs text-right text-amber-700">${fmtNum(r.comDeductions)}</td>
      <td class="py-2 px-3 text-xs text-right font-medium">${fmtNum(r.netAfterDeductions)}</td>
      <td class="py-2 px-3 text-xs text-center">${(r.salesSharePct || 0).toFixed(0)}%</td>
      <td class="py-2 px-3 text-xs text-right text-green-700">${fmtNum(r.commission)}</td>
      <td class="py-2 px-3 text-xs text-right text-slate-500">${fmtNum(r.lbsShare)}</td>
      <td class="py-2 px-3 text-xs text-right">${fmtNum(r.netPayable)}</td>
      <td class="py-2 px-3"><span class="px-2 py-0.5 rounded text-xs bg-slate-100">${t("commission.status." + r.status)}</span></td>
    </tr>`;
  }).join("");
  const headerRow = PREVIEW_TABLE_COLS.map((h) => `<th class="py-2 px-3 font-medium text-slate-600 whitespace-nowrap">${t("mgr_sales.pcol." + h)}</th>`).join("");
  container.innerHTML = `
    <table class="w-full text-left border-collapse text-xs">
      <thead class="bg-slate-50">
        <tr>${headerRow}</tr>
      </thead>
      <tbody>${rowHtml}</tbody>
    </table>`;
}
async function renderDrillPanel(root) {
  const panel = root?.querySelector("#drill-panel");
  if (!panel || !_drillId) return;
  const salesName = _drillId;
  const ships = _shipments.filter((s) => (s.sales_rep || s.SalesRep) === _drillId);
  panel.innerHTML = `
    <div class="p-4 space-y-3">
      <div class="font-semibold text-slate-900">${salesName} \xB7 ${t("mgr_sales.period_label")} ${currentPeriodKey()} \xB7 ${t("mgr_sales.ships_count", { n: ships.length })}</div>
      <div class="flex gap-2 border-b border-slate-200">
        ${DRILL_TABS.map((tab, i) => `<button data-drill-tab="${i}"
            class="px-4 py-2 text-xs font-medium ${i === 0 ? "text-blue-700 border-b-2 border-blue-600" : "text-slate-500"}">${t("mgr_sales.tab." + tab)}</button>`).join("")}
      </div>
      <div id="drill-tab-content"></div>
    </div>`;
  panel.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-drill-tab]");
    if (!btn) return;
    const idx = Number(btn.dataset.drillTab);
    panel.querySelectorAll("[data-drill-tab]").forEach((b, i) => {
      b.className = `px-4 py-2 text-xs font-medium ${i === idx ? "text-blue-700 border-b-2 border-blue-600" : "text-slate-500"}`;
    });
    renderDrillTab(panel.querySelector("#drill-tab-content"), idx, ships);
  });
  renderDrillTab(panel.querySelector("#drill-tab-content"), 0, ships);
}
function renderDrillTab(container, idx, ships) {
  if (!container) return;
  if (idx === 0) {
    const rows = ships.map((s) => `<tr>
      <td class="py-1 px-2 text-xs">${s.shipment_ref || s.id}</td>
      <td class="py-1 px-2 text-xs">${s.pol || "?"}\u2192${s.pod || "?"}</td>
      <td class="py-1 px-2 text-xs">${s.etd || "\u2014"}</td>
      <td class="py-1 px-2 text-xs">${s.state ? t("shipment.status." + s.state) : "\u2014"}</td>
    </tr>`).join("");
    const headerRow = DRILL_SHIPMENT_COLS.map((h) => `<th class="py-1 px-2 text-left text-slate-600">${t("mgr_sales.dcol." + h)}</th>`).join("");
    const noShipsRow = `<tr><td colspan="4" class="p-3 text-slate-400">${t("mgr_sales.no_ships")}</td></tr>`;
    container.innerHTML = `<table class="w-full text-xs border-collapse"><thead class="bg-slate-50">
      <tr>${headerRow}</tr>
      </thead><tbody>${rows || noShipsRow}</tbody></table>`;
  } else if (idx === 1) {
    const counts = PIPELINE_STAGES.map((st) => ships.filter((s) => (s.state || s.State || "") === st).length);
    const maxC = Math.max(...counts, 1);
    container.innerHTML = `<div class="space-y-2 p-2">${PIPELINE_STAGES.map((st, i) => `
      <div class="flex items-center gap-2 text-xs">
        <span class="w-20 text-slate-500">${t("mgr_sales.stage." + st.toLowerCase())}</span>
        <div class="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
          <div class="h-4 bg-blue-500 rounded-full" style="width:${(counts[i] / maxC * 100).toFixed(0)}%"></div>
        </div>
        <span class="w-6 text-right">${counts[i]}</span>
      </div>`).join("")}</div>`;
  } else if (idx === 2) {
    const custMap = {};
    for (const s of ships) {
      const c = s.customer || s.Customer || "\u2014";
      custMap[c] = (custMap[c] || 0) + Number(s.selling_vnd ?? 0);
    }
    const top5 = Object.entries(custMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    container.innerHTML = `<table class="w-full text-xs border-collapse"><thead class="bg-slate-50">
      <tr><th class="py-1 px-2 text-left text-slate-600">${t("mgr_sales.dcol.customer")}</th><th class="py-1 px-2 text-right text-slate-600">${t("mgr_sales.dcol.revenue")}</th></tr>
      </thead><tbody>${top5.map(([c, v]) => `<tr><td class="py-1 px-2">${c}</td><td class="py-1 px-2 text-right">${fmtNum(v)}</td></tr>`).join("")}</tbody></table>`;
  } else {
    container.innerHTML = `<div class="text-xs text-slate-400 p-3">${t("mgr_sales.no_commission")}</div>`;
  }
}
function exportCsv(rows, periodKey) {
  const date = todayLocal();
  const lines = [
    CSV_COLS,
    ...rows.map((r) => [
      r.salesName,
      r.margin,
      r.tndn,
      r.comDeductions,
      r.netAfterDeductions,
      r.salesSharePct?.toFixed(0),
      r.commission,
      r.lbsShare,
      r.advances,
      r.netPayable,
      r.status
    ].join(","))
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: `vdg-sales-commission-${periodKey}-${date}.csv`
  });
  a.click();
}
async function render(root) {
  if (!hasRole(ROLE_MANAGER)) {
    navigate("/dashboard");
    return;
  }
  if (_onEntity) window.removeEventListener("vdg:entity-changed", _onEntity);
  root.setAttribute("data-mgr-sales", "1");
  const repo = getRepo();
  if (repo) {
    [_shipments, _pnlLines] = await Promise.all([
      listShipments(repo, null),
      repo.list(KIND_PNL_LINE, null)
    ]);
    const composed = await compose(repo);
    _rules = composed.rules;
  }
  root.innerHTML = `
    <div class="p-6 space-y-5 max-w-[1600px] mx-auto" data-mgr-sales="1">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex gap-2">
          ${PERIOD_MODES.map((m) => `
            <button data-period-mode="${m}"
              class="px-3 py-1.5 text-xs rounded-lg ${m === _periodMode ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}">${t("mgr_sales.mode." + m)}</button>`).join("")}
        </div>
        <button id="btn-export" class="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">${t("mgr_sales.export_csv")}</button>
      </div>

      <div id="leaderboard-grid"></div>

      <div id="commission-preview" class="bg-white rounded-xl border border-slate-200">
        <div class="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div class="text-sm font-semibold text-slate-900">${t("mgr_sales.preview_title", { k: currentPeriodKey() })}</div>
          <button id="btn-calc" class="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">${t("mgr_sales.calculate")}</button>
        </div>
        <div id="preview-table" class="p-4"></div>
        <div class="px-5 pb-4">
          <button id="btn-settle-link" disabled
            class="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40">
            ${t("mgr_sales.approve_settle")}
          </button>
        </div>
      </div>

      <div id="drill-panel" class="bg-white rounded-xl border border-slate-200 hidden"></div>
    </div>`;
  function refreshLeaderboard() {
    const commRows = computeCommissions(_shipments, _pnlLines, _rules, [], currentPeriodKey());
    mountGrid(root.querySelector("#leaderboard-grid"), buildRows(commRows));
  }
  refreshLeaderboard();
  root.addEventListener("click", async (e) => {
    const modeBtn = e.target.closest("[data-period-mode]");
    if (modeBtn) {
      _periodMode = modeBtn.dataset.periodMode;
      root.querySelectorAll("[data-period-mode]").forEach((b) => {
        const active = b.dataset.periodMode === _periodMode;
        b.className = `px-3 py-1.5 text-xs rounded-lg ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`;
      });
      refreshLeaderboard();
    }
  });
  root.querySelector("#btn-calc").addEventListener("click", () => {
    const rows = computeCommissions(_shipments, _pnlLines, _rules, [], currentPeriodKey());
    renderPreviewTable(root.querySelector("#preview-table"), rows, currentPeriodKey());
    const hasPending = rows.some((r) => r.status === "Pending");
    root.querySelector("#btn-settle-link").disabled = !hasPending;
  });
  root.querySelector("#btn-settle-link").addEventListener("click", () => {
    navigate(`/manager/finance/commissions?period=${currentPeriodKey()}`);
  });
  root.querySelector("#btn-export").addEventListener("click", () => {
    const rows = computeCommissions(_shipments, _pnlLines, _rules, [], currentPeriodKey());
    exportCsv(rows, currentPeriodKey());
  });
  const urlSales = new URLSearchParams(location.search).get("sales");
  if (urlSales) {
    _drillId = urlSales;
    root.querySelector("#drill-panel")?.classList.remove("hidden");
    renderDrillPanel(root);
  }
  _onEntity = async (e) => {
    if (!root.isConnected) {
      window.removeEventListener("vdg:entity-changed", _onEntity);
      return;
    }
    const kind = e.detail?.kind;
    if (kind !== KIND_SHIPMENT && kind !== KIND_COMMISSION_RULES) return;
    if (repo) {
      [_shipments, _pnlLines] = await Promise.all([listShipments(repo, null), repo.list(KIND_PNL_LINE, null)]);
      const composed = await compose(repo);
      _rules = composed.rules;
    }
    refreshLeaderboard();
  };
  window.addEventListener("vdg:entity-changed", _onEntity);
}
export {
  buildGridCols,
  render,
  renderDrillTab,
  renderPreviewTable
};
