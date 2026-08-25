import {
  UNKNOWN_STATE,
  resolveShipmentState
} from "./chunk-TFGCEERX.js";
import "./chunk-ETXXTRJC.js";
import {
  chooseShipmentAffordance,
  runShipmentAffordance
} from "./chunk-TFQRLZCI.js";
import "./chunk-VTRTBWKI.js";
import {
  ensureShipmentStateAliases
} from "./chunk-CDLM5DUW.js";
import {
  shipmentLane
} from "./chunk-V5UQPUBE.js";
import {
  listShipments
} from "./chunk-U4BJYZQA.js";
import {
  safeAwait
} from "./chunk-JAZY43GR.js";
import {
  navigate
} from "./chunk-H2H4WJDI.js";
import {
  agGridLocaleText
} from "./chunk-KZWJDTAL.js";
import {
  showConfirm
} from "./chunk-SXHZPWVA.js";
import "./chunk-EQL6UFHA.js";
import {
  ROLE_MANAGER
} from "./chunk-KXTXGKNK.js";
import {
  hasRole
} from "./chunk-B24LWBUG.js";
import {
  fmtNumber,
  t
} from "./chunk-NPO6NGQC.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/shipments/cell-renderers.js
function statusRenderer(params) {
  const el = document.createElement("status-badge");
  el.setAttribute("state", params.value);
  el.setAttribute("fsm", "shipment");
  return el;
}
function pnlRenderer(params) {
  if (params.value === void 0 || params.value === null) {
    const dash = document.createElement("span");
    dash.className = "text-slate-400 font-mono text-xs";
    dash.textContent = "\u2014";
    return dash;
  }
  const v = params.value;
  const positive = v >= 0;
  const div = document.createElement("div");
  div.className = "flex items-center gap-2";
  const bar = document.createElement("div");
  bar.className = "w-12 h-1.5 rounded-full overflow-hidden bg-slate-100";
  const fill = document.createElement("div");
  fill.style.width = `${Math.min(100, Math.abs(v) / 100)}%`;
  fill.className = positive ? "h-full bg-emerald-500" : "h-full bg-red-500";
  bar.appendChild(fill);
  const label = document.createElement("span");
  label.className = `font-mono text-xs ${positive ? "text-emerald-700" : "text-red-700"} font-semibold`;
  label.textContent = `${positive ? "+" : ""}${fmtNumber(v)}`;
  div.appendChild(bar);
  div.appendChild(label);
  return div;
}
function budgetLinkRenderer(params) {
  const a = document.createElement("a");
  a.href = `#/shipment/${encodeURIComponent(params.data.ref)}/budget`;
  a.textContent = t("shipments.action.pnl_sheet");
  a.className = "text-xs text-blue-600 hover:underline";
  a.addEventListener("click", (e) => e.stopPropagation());
  return a;
}
function confirmAffordance(affordance) {
  return showConfirm({
    destructive: true,
    title: t(affordance === "delete" ? "shipments.delete_confirm.title" : "shipments.void_confirm.title"),
    body: affordance === "void" ? t("shipments.void_confirm.body") : void 0,
    confirmLabel: t(affordance === "delete" ? "common.action.delete" : "shipments.action.void"),
    cancelLabel: t("common.action.cancel")
  });
}
async function handleRowAffordance(row, api, reload) {
  const result = await runShipmentAffordance({
    repo: window.__vdg_repo,
    shipment: row,
    isManager: hasRole(ROLE_MANAGER),
    confirm: confirmAffordance
  });
  if (!result.mutated) return;
  const rows = await reload();
  api?.setGridOption("rowData", rows);
}
function createActionsRenderer(reload) {
  return function actionsRenderer(params) {
    const affordance = chooseShipmentAffordance(params.data);
    if (affordance === "none") return document.createElement("span");
    const btn = document.createElement("button");
    btn.className = affordance === "delete" ? "text-xs px-2 py-1 rounded-md font-medium text-red-700 hover:bg-red-50" : "text-xs px-2 py-1 rounded-md font-medium text-amber-700 hover:bg-amber-50";
    btn.textContent = affordance === "delete" ? t("common.action.delete") : t("shipments.action.void");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      handleRowAffordance(params.data, params.api, reload);
    });
    return btn;
  };
}

// output/web/js.tmp/implementations/ui/bootstrap/views/shipments.js
var PANEL_WIDTH_PX = 480;
var SLIDE_DURATION_MS = 250;
var NAV_HEIGHT_REM = 3.5;
var Z_PANEL = 40;
var GOOGLE_DRIVE_URL = "/data/10k_shipments.json";
var FSM_LEGEND_CODE = "FSM-01";
var COLUMN_LABEL_KEY = {
  ref: "shipments.grid.ref",
  customer: "customer",
  lane: "shipments.grid.lane",
  vessel: "shipments.grid.vessel",
  etd: "shipments.grid.etd",
  eta: "shipments.grid.eta",
  teu: "shipments.grid.teu",
  state: "state",
  pnl: "shipments.grid.pnl"
};
var ACTIONS_COL_WIDTH = 90;
function buildColumnDefs(rows = null) {
  const cols = [
    { headerName: t(COLUMN_LABEL_KEY.ref), field: "ref", pinned: "left", width: 140, cellClass: "font-mono text-xs" },
    { headerName: t(COLUMN_LABEL_KEY.customer), field: "customer", width: 170 },
    {
      headerName: t(COLUMN_LABEL_KEY.lane),
      field: "lane",
      width: 140,
      cellClass: "font-mono text-xs",
      valueGetter: (p) => p.data.lane ?? "\u2014"
    },
    {
      headerName: t(COLUMN_LABEL_KEY.vessel),
      field: "vessel",
      width: 170,
      valueGetter: (p) => `${p.data.vessel || "\u2014"} / ${p.data.voyage || "\u2014"}`
    },
    { headerName: t(COLUMN_LABEL_KEY.etd), field: "etd", width: 110, cellClass: "font-mono text-xs text-slate-600" },
    { headerName: t(COLUMN_LABEL_KEY.eta), field: "eta", width: 110, cellClass: "font-mono text-xs text-slate-600" },
    { headerName: t(COLUMN_LABEL_KEY.teu), field: "teu", width: 70, type: "numericColumn", cellClass: "font-mono text-xs text-right" },
    { headerName: t(COLUMN_LABEL_KEY.state), field: "state", width: 150, cellRenderer: statusRenderer }
  ];
  if (rows === null || rows.some((r) => r?.pnl != null)) {
    cols.push({ headerName: t(COLUMN_LABEL_KEY.pnl), field: "pnl", width: 180, cellRenderer: pnlRenderer });
  }
  cols.push({
    headerName: "",
    field: "budget",
    width: 70,
    sortable: false,
    filter: false,
    cellRenderer: budgetLinkRenderer
  });
  if (hasRole(ROLE_MANAGER)) {
    cols.push({
      headerName: "",
      field: "actions",
      width: ACTIONS_COL_WIDTH,
      sortable: false,
      filter: false,
      cellRenderer: createActionsRenderer(loadRealData)
    });
  }
  return cols;
}
var GRID_HEIGHT_PX = 560;
function toolbar(total, isLarge) {
  return `
    <div class="flex items-center justify-between mb-4">
      <div>
        <div class="text-xs text-slate-500">${FSM_LEGEND_CODE} \xB7 ${t("active_jobs")}</div>
        <div class="text-base font-semibold text-slate-900">${total.toLocaleString()} ${t("shipments")}${isLarge ? ` <span class="text-xs font-normal text-amber-600 ml-1">${t("shipments.toolbar.virtual_scroll_demo")}</span>` : ""}</div>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative">
          <svg class="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input id="grid-search" placeholder="${t("shipments.toolbar.search_placeholder")}" class="text-sm pl-8 pr-3 py-1.5 border border-slate-200 rounded-md w-72 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
        </div>
        <button id="toggle-large" class="text-xs px-3 py-1.5 border border-slate-200 rounded-md text-slate-700 bg-white hover:bg-slate-50" title="${t("shipments.toolbar.stress_test_title")}">
          ${isLarge ? t("shipments.toolbar.normal_view") : t("shipments.toolbar.large_demo")}
        </button>
        <button id="export-csv" class="text-xs px-3 py-1.5 border border-slate-200 rounded-md text-slate-700 bg-white hover:bg-slate-50">${t("shipments.toolbar.export_csv")}</button>
        <!-- F-37-03: creating a job starts here, where the jobs are. It used to live only under
             Sales, which said the job was a rep's before anyone had named one. -->
        <button id="new-shipment" class="text-xs px-3 py-1.5 bg-slate-900 text-white rounded-md hover:bg-slate-800">${t("shipments.new")}</button>
      </div>
    </div>
  `;
}
var VIEW_SOURCE_MS = 2500;
var _bounded = async (p, fallback) => {
  const r = await safeAwait(p, VIEW_SOURCE_MS, null, "shipments:load");
  return r.ok ? r.value : fallback;
};
async function loadRealData() {
  const repo = window.__vdg_repo;
  if (!repo) return [];
  const [allShipments, allLines, aliasRows] = await Promise.all([
    _bounded(listShipments(repo, null), []),
    _bounded(repo.list("pnl_line"), []),
    _bounded(ensureShipmentStateAliases(repo), [])
  ]);
  const linesByRef = {};
  for (const l of allLines) {
    const r = l.shipment_ref;
    if (!linesByRef[r]) linesByRef[r] = [];
    linesByRef[r].push(l);
  }
  for (const s of allShipments) {
    s.ref = s.shipment_ref || s.ref;
    s.state = resolveShipmentState(s.state || s.status, aliasRows) || UNKNOWN_STATE;
    s.lane = shipmentLane(s);
    const lines = linesByRef[s.ref] && linesByRef[s.ref].length ? linesByRef[s.ref] : s.pnl_lines || [];
    const sellSeen = lines.some(
      (l) => l.sell_amt != null || l.selling_vnd_collect != null || l.selling_amount != null
    );
    s.pnl = sellSeen ? lines.reduce((acc, l) => acc + Number(l.sell_amt || l.selling_vnd_collect || 0) - Number(l.buy_amt || l.buying_vnd_pay || 0), 0) : void 0;
  }
  return allShipments;
}
var ENTITY_CHANGED_EVENT = "vdg:entity-changed";
var KIND_SHIPMENT = "shipment";
var _onLocale;
var _onEntityChanged;
async function render(root) {
  if (_onLocale) window.removeEventListener("vdg:locale-changed", _onLocale);
  if (_onEntityChanged) window.removeEventListener(ENTITY_CHANGED_EVENT, _onEntityChanged);
  const isLarge = location.hash.includes("large=1");
  root.innerHTML = `
    <div class="p-6 max-w-[1400px] mx-auto">
      <div id="grid-header">
        <div class="text-sm text-slate-500 py-4">\u0110ang t\u1EA3i d\u1EEF li\u1EC7u...</div>
      </div>
      <div id="grid" class="ag-theme-quartz rounded-xl overflow-hidden border border-slate-200" style="height:${GRID_HEIGHT_PX}px;"></div>
    </div>
  `;
  let rowData = [];
  if (isLarge) {
    try {
      const res = await fetch(GOOGLE_DRIVE_URL);
      rowData = await res.json();
    } catch (e) {
      console.error("Failed to load 10K demo data", e);
      rowData = [];
    }
  } else {
    rowData = await loadRealData();
  }
  const gridDiv = document.getElementById("grid");
  let api = null;
  if (window.agGrid) {
    api = window.agGrid.createGrid(gridDiv, {
      columnDefs: buildColumnDefs(rowData),
      rowData,
      defaultColDef: { sortable: true, resizable: true, filter: true },
      rowSelection: "single",
      onRowClicked: (e) => {
        document.getElementById("detail-panel")?.open(e.data);
      },
      animateRows: !isLarge,
      rowHeight: 38,
      headerHeight: 36,
      localeText: agGridLocaleText()
    });
  }
  const headerDiv = document.getElementById("grid-header");
  if (headerDiv) {
    headerDiv.innerHTML = toolbar(rowData.length, isLarge);
    document.getElementById("grid-search")?.addEventListener("input", (e) => {
      api?.setGridOption("quickFilterText", e.target.value);
    });
    document.getElementById("export-csv")?.addEventListener("click", () => {
      api?.exportDataAsCsv({ fileName: "vdg_shipments.csv" });
    });
    document.getElementById("new-shipment")?.addEventListener("click", () => {
      navigate("/shipments/new");
    });
    document.getElementById("toggle-large")?.addEventListener("click", () => {
      const next = isLarge ? "/shipments" : "/shipments?large=1";
      window.dispatchEvent(new CustomEvent("vdg:navigate", { detail: { route: next } }));
      location.hash = next;
    });
  }
  if (!document.getElementById("detail-panel")) {
    const panel = document.createElement("vdg-detail-panel");
    panel.id = "detail-panel";
    panel.setAttribute("hidden", "");
    panel.className = "fixed right-0 bg-white shadow-xl flex flex-col translate-x-full";
    panel.style.cssText = `top:${NAV_HEIGHT_REM}rem;height:calc(100vh - ${NAV_HEIGHT_REM}rem);z-index:${Z_PANEL};width:${PANEL_WIDTH_PX}px;max-width:100%;transition:transform ${SLIDE_DURATION_MS}ms ease-out`;
    document.body.appendChild(panel);
  }
  _onLocale = () => {
    const liveRoot = document.getElementById("view-root");
    if (liveRoot) render(liveRoot);
  };
  window.addEventListener("vdg:locale-changed", _onLocale);
  _onEntityChanged = (e) => {
    if (e?.detail?.kind && e.detail.kind !== KIND_SHIPMENT) return;
    const liveRoot = document.getElementById("view-root");
    if (liveRoot) render(liveRoot);
  };
  window.addEventListener(ENTITY_CHANGED_EVENT, _onEntityChanged);
}
export {
  buildColumnDefs,
  loadRealData,
  render,
  toolbar
};
