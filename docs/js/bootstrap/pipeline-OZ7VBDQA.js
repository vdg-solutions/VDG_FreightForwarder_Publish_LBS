import {
  resolveSalesRepLabel
} from "./chunk-SUGSGZPX.js";
import {
  NEXT_ON_PATH,
  SHIPMENT_MAIN_PATH
} from "./chunk-ETXXTRJC.js";
import {
  DEFAULT_MODE,
  readMode
} from "./chunk-RE24EIGD.js";
import {
  todayLocal
} from "./chunk-SWWKLW6A.js";
import {
  shipmentLane
} from "./chunk-V5UQPUBE.js";
import {
  getActiveSalesReps
} from "./chunk-YFN2XPGT.js";
import {
  navigate
} from "./chunk-H2H4WJDI.js";
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

// output/web/js.tmp/implementations/ui/bootstrap/components/kanban-board.js
import { LitElement, html } from "https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm";
var KANBAN_STATES = SHIPMENT_MAIN_PATH;
var KANBAN_COLUMN_WIDTH_PX = 280;
var TOUCH_MODE_BREAKPOINT = 768;
var FALLBACK_BORDER_COLOR = "border-slate-300";
var VALID_NEXT = NEXT_ON_PATH;
var VdgKanbanBoard = class extends LitElement {
  static properties = {
    shipments: { type: Array },
    filter: { type: Object },
    columns: { type: Array },
    // override KANBAN_STATES for air/all mode
    mode: { type: String },
    // 'Sea'|'Air'|'All' — badge shown when 'All'
    _selected: { type: Object, state: true },
    _dragging: { type: String, state: true },
    _pending: { type: Object, state: true },
    _moveMenuId: { type: String, state: true },
    // touch mode: open move-to menu
    _touchMode: { type: Boolean, state: true }
  };
  createRenderRoot() {
    return this;
  }
  constructor() {
    super();
    this.shipments = [];
    this.filter = {};
    this.columns = null;
    this.mode = "All";
    this._selected = /* @__PURE__ */ new Set();
    this._dragging = null;
    this._pending = /* @__PURE__ */ new Set();
    this._moveMenuId = null;
    this._touchMode = window.innerWidth < TOUCH_MODE_BREAKPOINT || navigator.maxTouchPoints > 0;
    this._colorMap = /* @__PURE__ */ new Map();
    this._loadColors();
  }
  async _loadColors() {
    const repo = window.__vdg_repo;
    if (!repo) return;
    try {
      const reps = await getActiveSalesReps(repo);
      this._colorMap = new Map(reps.map((r) => [r.prefix.toUpperCase(), r.color]));
      this.requestUpdate();
    } catch (err) {
      console.error("[kanban-board] color load failed:", err);
    }
  }
  connectedCallback() {
    super.connectedCallback();
    this._onUserChange = (e) => {
      if (e.detail?.kind === "user") this._loadColors();
    };
    window.addEventListener("vdg:entity-changed", this._onUserChange);
    this._onLocale = () => this.requestUpdate();
    window.addEventListener("vdg:locale-changed", this._onLocale);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._onUserChange) window.removeEventListener("vdg:entity-changed", this._onUserChange);
    if (this._onLocale) window.removeEventListener("vdg:locale-changed", this._onLocale);
  }
  _filtered() {
    return this.shipments.filter((s) => {
      if (this.filter.sales_rep && (s.sales_rep || s.SalesRep) !== this.filter.sales_rep) return false;
      if (this.filter.customer && (s.customer || s.Customer) !== this.filter.customer) return false;
      if (this.filter.state && (s.state || s.State) !== this.filter.state) return false;
      return true;
    });
  }
  _byState(state) {
    return this._filtered().filter((s) => (s.state || s.State) === state);
  }
  _onDragStart(e, id) {
    this._dragging = id;
    e.dataTransfer.effectAllowed = "move";
  }
  _onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  _onDrop(e, toState) {
    e.preventDefault();
    const id = this._dragging;
    this._dragging = null;
    if (!id) return;
    const ship = this.shipments.find((s) => s.id === id);
    const from = ship?.state || ship?.State;
    if (!from || from === toState) return;
    const wasm = window.__vdg_wasm;
    let allowed;
    if (wasm?.check_quotation_transition) {
      allowed = wasm.check_quotation_transition(from, toState);
    } else {
      const validTargets = VALID_NEXT[from] || [];
      allowed = validTargets.includes(toState);
    }
    if (!allowed) {
      this.dispatchEvent(new CustomEvent("vdg:toast", {
        bubbles: true,
        composed: true,
        detail: { type: "error", message: t("kanban.move_invalid", { from: t("shipment.status." + from), to: t("shipment.status." + toState) }) }
      }));
      return;
    }
    this._pending = /* @__PURE__ */ new Set([...this._pending, id]);
    this.dispatchEvent(new CustomEvent("vdg:transition-request", {
      bubbles: true,
      composed: true,
      detail: { id, from, to: toState }
    }));
  }
  _onMoveRequest(id, toState) {
    this._moveMenuId = null;
    const ship = this.shipments.find((s) => s.id === id);
    const from = ship?.state || ship?.State;
    if (!from) return;
    const fakeEvent = { preventDefault: () => {
    } };
    this._dragging = id;
    this._onDrop(fakeEvent, toState);
  }
  _renderMoveMenu(id) {
    const ship = this.shipments.find((s) => s.id === id);
    const from = ship?.state || ship?.State;
    const targets = VALID_NEXT[from] || [];
    if (!targets.length) return "";
    return html`
      <div class="absolute left-0 top-full z-20 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px]"
           @click="${(e) => e.stopPropagation()}">
        ${targets.map((targetState) => html`
          <button class="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700"
                  @click="${() => this._onMoveRequest(id, targetState)}">
            → ${t("shipment.status." + targetState)}
          </button>`)}
        <button class="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-slate-50"
                @click="${() => {
      this._moveMenuId = null;
    }}">${t("common.action.cancel")}</button>
      </div>`;
  }
  _onCardClick(e, id) {
    if (e.shiftKey) {
      const next = new Set(this._selected);
      next.has(id) ? next.delete(id) : next.add(id);
      this._selected = next;
      this.dispatchEvent(new CustomEvent("vdg:selection-changed", {
        bubbles: true,
        composed: true,
        detail: { ids: [...next] }
      }));
    } else {
      this.dispatchEvent(new CustomEvent("vdg:card-click", {
        bubbles: true,
        composed: true,
        detail: { id }
      }));
    }
  }
  _renderCard(s) {
    const id = s.id;
    const ref = s.shipment_ref || s.ShipmentRef || id;
    const customer = s.customer || s.Customer || "\u2014";
    const pol = s.pol || s.POL || "?";
    const pod = s.pod || s.POD || "?";
    const etd = s.etd || s.ETD || "";
    const eta = s.eta || s.ETA || "";
    const currentUser = typeof window !== "undefined" ? window.__vdg_current_user : null;
    const sales = resolveSalesRepLabel(s.sales_rep || s.SalesRep || "", currentUser, t);
    const margin = s.margin_pct ?? null;
    const isAir = s.mode === "air";
    const salesCls = this._colorMap.get((sales || "").toUpperCase()) || FALLBACK_BORDER_COLOR;
    const pendingCls = this._pending.has(id) ? "opacity-70 animate-pulse" : "";
    const selCls = this._selected.has(id) ? "ring-2 ring-blue-400" : "";
    return html`
      <div
        class="relative bg-white rounded-lg border-l-4 ${salesCls} shadow-sm p-3 mb-2 cursor-pointer
               hover:shadow-md transition ${pendingCls} ${selCls}"
        draggable="${!this._touchMode}"
        @dragstart="${this._touchMode ? null : (e) => this._onDragStart(e, id)}"
        @click="${(e) => this._onCardClick(e, id)}"
      >
        <div class="text-xs font-semibold text-slate-800 font-mono">${ref}</div>
        <div class="text-[11px] text-slate-600 mt-0.5 truncate">${customer}</div>
        <div class="text-[11px] text-slate-500 mt-1">${pol}→${pod}</div>
        <div class="flex justify-between mt-1.5 text-[10px] text-slate-400">
          <span>${t("kanban.card.etd")} ${etd?.slice(0, 10) || "\u2014"}</span>
          <span>${t("kanban.card.eta")} ${eta?.slice(0, 10) || "\u2014"}</span>
        </div>
        ${margin !== null ? html`
          <div class="mt-1 text-[10px] font-medium ${margin >= 0 ? "text-emerald-600" : "text-red-500"}">
            ${t("kanban.card.margin")} ${margin.toFixed(1)}%
          </div>` : ""}
        ${sales ? html`<div class="text-[10px] text-slate-400 mt-0.5">${sales}</div>` : ""}
        ${this.mode === "All" && s.mode ? html`
          <span class="text-[9px] font-bold px-1 rounded mt-1 inline-block ${isAir ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}">
            ${isAir ? t("shipment.mode.air") : t("shipment.mode.sea")}
          </span>` : ""}
        ${this._touchMode && (VALID_NEXT[s.state || s.State] || []).length ? html`
          <button class="mt-2 w-full text-[10px] text-blue-600 bg-blue-50 rounded py-1 text-center"
                  @click="${(e) => {
      e.stopPropagation();
      this._moveMenuId = this._moveMenuId === id ? null : id;
    }}">
            ${t("kanban.move_to")}
          </button>
          <div class="relative">${this._moveMenuId === id ? this._renderMoveMenu(id) : ""}</div>` : ""}
      </div>`;
  }
  _renderColumn(state) {
    const cards = this._byState(state);
    return html`
      <div
        class="shrink-0 bg-slate-50 rounded-xl border border-slate-200"
        style="width:${KANBAN_COLUMN_WIDTH_PX}px"
        @dragover="${this._onDragOver}"
        @drop="${(e) => this._onDrop(e, state)}"
      >
        <div class="px-3 py-2.5 border-b border-slate-200 flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-700">${t("shipment.status." + state)}</span>
          <span class="text-[10px] bg-slate-200 text-slate-600 rounded-full px-2 py-0.5">
            ${cards.length}
          </span>
        </div>
        <div class="p-2 min-h-[120px]">
          ${cards.map((s) => this._renderCard(s))}
          ${cards.length === 0 ? html`
            <div class="text-center text-[11px] text-slate-300 py-8">${t("kanban.column_empty")}</div>` : ""}
        </div>
      </div>`;
  }
  confirmPending(id) {
    const next = new Set(this._pending);
    next.delete(id);
    this._pending = next;
  }
  render() {
    const cols = this.columns || KANBAN_STATES;
    return html`
      <div class="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
        ${cols.map((s) => this._renderColumn(s))}
      </div>`;
  }
};
customElements.define("vdg-kanban-board", VdgKanbanBoard);

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/pipeline.js
var SEA_KANBAN_STATES = SHIPMENT_MAIN_PATH;
var AIR_KANBAN_STATES = ["Created", "Tendered", "Accepted", "Manifested", "FlightDeparted", "FlightArrived", "Cleared", "PoD"];
var ALL_KANBAN_STATES = [...SEA_KANBAN_STATES, "Tendered", "Accepted", "Manifested", "FlightDeparted", "FlightArrived", "Cleared", "PoD"];
function pipelineGridCols() {
  return [
    { field: "shipment_ref", headerName: t("pipeline.col.ref"), width: 130 },
    { field: "customer", headerName: t("customer"), flex: 1 },
    { field: "lane", headerName: t("pipeline.col.lane"), width: 140 },
    { field: "state", headerName: t("state"), width: 140 },
    { field: "etd", headerName: "ETD", width: 110 },
    // loanword, kept
    { field: "eta", headerName: "ETA", width: 110 },
    // loanword, kept
    { field: "margin_pct", headerName: t("margin_pct"), width: 100 },
    { field: "sales_rep", headerName: t("sales_rep"), width: 110 }
  ];
}
var PIPELINE_VIEW_KEY = "pipeline_view_mode";
var PREFS_META_KEY = "preferences";
var FILTER_CHIPS_CONFIG = [
  { value: "sales", labelKey: "sales_rep" },
  { value: "customer", labelKey: "customer" },
  { value: "carrier", labelKey: "carrier" },
  { value: "lane", labelKey: "pipeline.chip.lane" },
  { value: "state", labelKey: "state" }
];
var _viewMode = "board";
var _filter = {};
var _mode = DEFAULT_MODE;
var _selectedIds = /* @__PURE__ */ new Set();
var _shipments = [];
var _gridApi = null;
var _kanban = null;
var _onEntity;
var _onFilter;
var _onModeChange;
function getColumns(mode) {
  if (mode === "Air") return AIR_KANBAN_STATES;
  if (mode === "Sea") return SEA_KANBAN_STATES;
  return ALL_KANBAN_STATES;
}
function applyPipelineModeFilter(shipments, mode) {
  if (!mode || mode === "All") return shipments;
  if (mode === "Air") return shipments.filter((s) => s.mode === "air");
  return shipments.filter((s) => s.mode !== "air");
}
function getRepo() {
  return window.__vdg_repo;
}
async function loadShipments() {
  const repo = getRepo();
  if (!repo) return [];
  return repo.list("shipment", null);
}
function applyFilter(list, filter) {
  return list.filter((s) => {
    if (filter.sales && (s.sales_rep || s.SalesRep) !== filter.sales) return false;
    if (filter.state && (s.state || s.State) !== filter.state) return false;
    if (filter.lane) {
      if (shipmentLane(s) !== filter.lane) return false;
    }
    return true;
  });
}
function enrichShipments(list) {
  return list.map((s) => ({
    ...s,
    lane: shipmentLane(s)
  }));
}
function mountGrid(container, filtered) {
  if (_gridApi) {
    try {
      _gridApi.destroy();
    } catch {
    }
    _gridApi = null;
  }
  const currentUser = typeof window !== "undefined" ? window.__vdg_current_user : null;
  const rowData = filtered.map((s) => ({
    ...s,
    shipment_ref: s.shipment_ref || s.ShipmentRef || s.id,
    customer: s.customer || s.Customer || "\u2014",
    // lane already resolved by enrichShipments (F-37-01) — no re-derivation here
    state: s.state || s.State || "\u2014",
    sales_rep: resolveSalesRepLabel(s.sales_rep || s.SalesRep || "", currentUser, t) || "\u2014"
  }));
  container.innerHTML = '<div class="ag-theme-quartz" style="height:500px"></div>';
  const div = container.querySelector(".ag-theme-quartz");
  if (!window.agGrid) return;
  const opts = {
    columnDefs: pipelineGridCols(),
    rowData,
    rowSelection: "multiple",
    suppressRowClickSelection: true,
    onSelectionChanged: () => {
      const rows = _gridApi?.getSelectedRows() || [];
      _selectedIds = new Set(rows.map((r) => r.id));
      updateBulkToolbar(container.closest("[data-mgr-pipeline]"));
    },
    onRowClicked: (e) => {
      window.dispatchEvent(new CustomEvent("vdg:open-detail", {
        detail: { kind: "shipment", id: e.data.id }
      }));
    }
  };
  const grid = new agGrid.Grid(div, opts);
  _gridApi = grid.gridOptions?.api || opts.api;
}
function updateBulkToolbar(root) {
  if (!root) return;
  const bar = root.querySelector("#bulk-toolbar");
  if (!bar) return;
  const n = _selectedIds.size;
  bar.classList.toggle("translate-y-full", n === 0);
  root.querySelector("#bulk-count").textContent = t("bulk_selected_count", { n });
  const states = [..._selectedIds].map((id) => {
    const s = _shipments.find((x) => x.id === id);
    return s?.state || s?.State || "";
  });
  const validTargets = states.length > 0 ? (VALID_NEXT[states[0]] || []).filter((t2) => states.every((st) => (VALID_NEXT[st] || []).includes(t2))) : [];
  const select = root.querySelector("#bulk-transition-select");
  if (select) {
    select.innerHTML = `<option value="">${t("pipeline.bulk.transition_placeholder")}</option>${validTargets.map((s) => `<option>${s}</option>`).join("")}`;
  }
}
async function saveViewMode(store, mode) {
  if (!store) return;
  try {
    const prefs = await store.cache_get_meta(PREFS_META_KEY) || { key: PREFS_META_KEY };
    await store.cache_put_meta(PREFS_META_KEY, { ...prefs, [PIPELINE_VIEW_KEY]: mode });
  } catch {
  }
}
async function render(root) {
  if (!hasRole(ROLE_MANAGER)) {
    navigate("/dashboard");
    return;
  }
  if (_onEntity) window.removeEventListener("vdg:entity-changed", _onEntity);
  if (_onFilter) window.removeEventListener("vdg:filter-changed", _onFilter);
  if (_onModeChange) window.removeEventListener("vdg:mode-change", _onModeChange);
  _mode = readMode();
  const store = window.__vdg_store || null;
  try {
    const prefs = store ? await store.cache_get_meta(PREFS_META_KEY) : null;
    if (prefs?.[PIPELINE_VIEW_KEY]) _viewMode = prefs[PIPELINE_VIEW_KEY];
  } catch {
  }
  _shipments = enrichShipments(await loadShipments());
  root.setAttribute("data-mgr-pipeline", "1");
  const chipHtml = FILTER_CHIPS_CONFIG.map((c) => `<button data-chip="${c.value}"
      class="px-3 py-1 rounded-full text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
    >${t(c.labelKey)}</button>`).join("");
  root.innerHTML = `
    <div class="p-6 space-y-4 max-w-[1600px] mx-auto" data-mgr-pipeline="1">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex gap-2 flex-wrap">${chipHtml}</div>
        <button id="view-toggle"
          class="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
          ${_viewMode === "board" ? t("list_view") : t("board_view")}
        </button>
      </div>

      <div id="pipeline-content"></div>

      <!-- Bulk toolbar -->
      <div id="bulk-toolbar"
        class="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 text-white flex items-center gap-4 px-6 py-3
               transition-transform translate-y-full">
        <span id="bulk-count" class="text-sm font-medium"></span>
        <select id="bulk-transition-select"
          class="text-xs bg-slate-700 text-white border border-slate-600 rounded px-2 py-1">
          <option value="">${t("pipeline.bulk.transition_placeholder")}</option>
        </select>
        <button id="bulk-export" class="px-3 py-1.5 text-xs bg-blue-600 rounded hover:bg-blue-700">
          ${t("air_invoice.export_csv")}
        </button>
        <button id="bulk-clear"
          class="ml-auto px-2 py-1.5 text-xs text-slate-400 hover:text-white">${t("bulk_clear")}</button>
      </div>
    </div>`;
  const content = root.querySelector("#pipeline-content");
  function mountView() {
    const modeFiltered = applyPipelineModeFilter(_shipments, _mode);
    const filtered = applyFilter(modeFiltered, _filter);
    if (_viewMode === "board") {
      if (!content.querySelector("vdg-kanban-board")) {
        content.innerHTML = "<vdg-kanban-board></vdg-kanban-board>";
      }
      _kanban = content.querySelector("vdg-kanban-board");
      _kanban.shipments = filtered;
      _kanban.filter = _filter;
      _kanban.columns = getColumns(_mode);
      _kanban.mode = _mode;
    } else {
      mountGrid(content, filtered);
    }
  }
  mountView();
  content.addEventListener("vdg:card-click", (e) => {
    window.dispatchEvent(new CustomEvent("vdg:open-detail", {
      detail: { kind: "shipment", id: e.detail.id }
    }));
  });
  content.addEventListener("vdg:transition-request", async (e) => {
    const { id, to } = e.detail;
    const s = _shipments.find((x) => x.id === id);
    if (!s) return;
    const repo = getRepo();
    if (repo) {
      try {
        await repo.put("shipment", id, { ...s, state: to });
      } catch (err) {
        console.warn("[pipeline] transition write failed:", err.message);
      }
    }
    _kanban?.confirmPending(id);
  });
  root.querySelector("#view-toggle").addEventListener("click", async () => {
    _viewMode = _viewMode === "board" ? "list" : "board";
    root.querySelector("#view-toggle").textContent = _viewMode === "board" ? t("list_view") : t("board_view");
    mountView();
    await saveViewMode(store, _viewMode);
  });
  root.querySelector("#bulk-clear").addEventListener("click", () => {
    _selectedIds.clear();
    updateBulkToolbar(root);
    _gridApi?.deselectAll?.();
  });
  root.querySelector("#bulk-export")?.addEventListener("click", () => {
    const selected = _shipments.filter((s) => _selectedIds.has(s.id));
    const csv = [
      "ref,customer,lane,state,etd\n",
      ...selected.map((s) => `${s.shipment_ref || s.id},${s.customer || ""},${s.lane || ""},${s.state || ""},${s.etd || ""}`)
    ].join("\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      download: `vdg-pipeline-${todayLocal()}.csv`
    });
    a.click();
  });
  _onEntity = async () => {
    _shipments = enrichShipments(await loadShipments());
    mountView();
  };
  _onFilter = (e) => {
    _filter = e.detail || {};
    mountView();
  };
  _onModeChange = (e) => {
    _mode = e.detail?.mode ?? DEFAULT_MODE;
    mountView();
  };
  window.addEventListener("vdg:entity-changed", _onEntity);
  window.addEventListener("vdg:filter-changed", _onFilter);
  window.addEventListener("vdg:mode-change", _onModeChange);
}
export {
  applyPipelineModeFilter,
  getColumns,
  render
};
