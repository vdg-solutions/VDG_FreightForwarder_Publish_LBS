import {
  persistAdvancedState
} from "./chunk-VTRTBWKI.js";
import {
  showConfirm
} from "./chunk-SXHZPWVA.js";
import {
  ROLE_MANAGER
} from "./chunk-KXTXGKNK.js";
import {
  hasRole
} from "./chunk-B24LWBUG.js";
import {
  t
} from "./chunk-NPO6NGQC.js";

// output/web/js.tmp/implementations/ui/bootstrap/components/detail-panel.js
import { LitElement as LitElement2, html as html2 } from "https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm";

// output/web/js.tmp/implementations/kernel/core_abstractions/util/guard-messages.js
var GUARD_MESSAGES = {
  GUARD_VIOLATION: null,
  CREDIT_SUSPENDED: "Customer credit is suspended or blacklisted \u2014 contact Finance",
  OPEN_EXCEPTION: "Open exception(s) must be resolved before this transition",
  BILLING_NOT_PAID: "Billing has not been fully paid",
  QUOTATION_NOT_ACCEPTED: "Quotation has not been accepted yet",
  BOOKING_NOT_CONFIRMED: "Carrier booking is not confirmed",
  CONTAINER_NOT_LOADED: "One or more containers are not loaded onto vessel",
  CUSTOMS_NOT_CLEARED: "Customs clearance has not been completed",
  DG_COMPLIANCE_PENDING: "DG compliance is pending or rejected",
  ALREADY_IN_TARGET_STATE: "Shipment is already in this state",
  INVALID_TRANSITION: "This transition is not valid from the current state",
  NOT_FOUND: "Shipment record not found",
  STORAGE: "Storage error \u2014 please refresh and retry"
};
function guardMessage(envelope) {
  if (envelope.code === "GUARD_VIOLATION") {
    return `Guard condition not met: ${envelope.message}`;
  }
  return GUARD_MESSAGES[envelope.code] ?? `Transition failed: ${envelope.message}`;
}

// output/web/js.tmp/implementations/ui/bootstrap/components/timeline-entry.js
import { LitElement, html } from "https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm";
var VdgTimelineEntry = class extends LitElement {
  static properties = {
    entry: { type: Object },
    last: { type: Boolean }
  };
  createRenderRoot() {
    return this;
  }
  constructor() {
    super();
    this.entry = null;
    this.last = false;
  }
  render() {
    if (!this.entry) return html``;
    const e = this.entry;
    const ts = new Date(e.timestamp_ms).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" });
    return html`
      <div class="flex gap-3 pb-4 relative">
        <div class="shrink-0 flex flex-col items-center">
          <div class="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1"></div>
          ${!this.last ? html`<div class="w-px flex-1 bg-slate-200 mt-1"></div>` : ""}
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-mono text-xs text-slate-400">${ts}</div>
          <div class="text-sm font-medium text-slate-900 mt-0.5">${e.event}</div>
          <div class="text-xs text-slate-500">${e.from_state} → ${e.to_state}</div>
          ${e.emitted?.length ? html`
            <div class="flex flex-wrap gap-1 mt-1">
              ${e.emitted.map((ev) => html`<span class="inline-flex items-center text-[10px] bg-teal-50 text-teal-700 rounded px-1.5 py-0.5">↗ ${ev}</span>`)}
            </div>` : ""}
        </div>
      </div>`;
  }
};
customElements.define("vdg-timeline-entry", VdgTimelineEntry);

// output/web/js.tmp/implementations/ui/bootstrap/views/commission-tab.js
var KIND_COMMISSION_ENTRY = "commission_entry";
function fmtNum(n) {
  return Number(n ?? 0).toLocaleString("vi-VN");
}
function overrideAuditHtml(entry) {
  const by = entry.created_by || "\u2014";
  const reason = entry.remark || "\u2014";
  return `
    <div class="col-span-3 mt-1 text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1">
      ${t("commission.tab.override_audit", { by, reason })}
    </div>`;
}
function rowHtml(entry) {
  const isOverride = entry.source === "Override";
  const badge = isOverride ? `<span class="px-1.5 py-0.5 rounded text-[9px] bg-amber-100 text-amber-700 font-medium">${t("commission.tab.source.override")}</span>` : `<span class="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 text-slate-500">${t("commission.tab.source.rule")}</span>`;
  const ruleInfo = entry.rule_applied ? `<span class="text-[10px] text-slate-400">${t("commission.tab.rule_applied", { rule: entry.rule_applied })}</span>` : "";
  return `
    <div class="grid grid-cols-3 gap-2 text-xs py-2 border-b border-slate-100 last:border-none">
      <div>
        <div class="font-medium text-slate-800">${entry.kind || "\u2014"}</div>
        <div class="text-[10px] text-slate-400">${entry.recipient || "\u2014"}</div>
      </div>
      <div class="text-right">
        <div class="font-mono text-slate-700">${fmtNum(entry.gross_amount)}</div>
        ${ruleInfo}
      </div>
      <div class="flex justify-end items-start gap-1">
        ${badge}
      </div>
      ${isOverride ? overrideAuditHtml(entry) : ""}
    </div>`;
}
async function renderCommissionTab(root, shipmentRef, repo) {
  if (!root) return;
  root.innerHTML = `<p class="text-xs text-slate-400">${t("common.load.loading")}</p>`;
  let entries = [];
  try {
    const all = await repo.list(KIND_COMMISSION_ENTRY, null);
    entries = (all || []).filter((e) => e.shipment_ref === shipmentRef);
  } catch (err) {
    root.innerHTML = `<p class="text-xs text-red-500">${t("commission.tab.load_error")}</p>`;
    console.error("[commission-tab] list failed:", err);
    return;
  }
  if (!entries.length) {
    root.innerHTML = `<p class="text-xs text-slate-400">${t("commission.tab.empty")}</p>`;
    return;
  }
  root.innerHTML = `
    <div class="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">${t("commission.tab.title")}</div>
    <div>${entries.map(rowHtml).join("")}</div>`;
}

// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/shipment-void-delete.js
var CANCELLED_STATE = "Cancelled";
var _impl = null;
function bindShipmentVoidDelete(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/shipment-void-delete: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var chooseShipmentAffordance = (...a) => _i().chooseShipmentAffordance(...a);
var runShipmentAffordance = (...a) => _i().runShipmentAffordance(...a);

// output/web/js.tmp/implementations/ui/bootstrap/components/shipment-lifecycle-map.js
var NEXT_EVENT = {
  Created: "ConfirmBooking",
  BookingConfirmed: "VoyageDeparted",
  InTransit: "VoyageArrived",
  Arrived: "DeliveryConfirmed",
  Delivered: "CloseJob"
};
var TRANSITION_LABEL = {
  ConfirmBooking: "shipment.transition.confirm_booking",
  VoyageDeparted: "shipment.transition.mark_departed",
  VoyageArrived: "shipment.transition.mark_arrived",
  DeliveryConfirmed: "shipment.transition.confirm_delivery",
  CloseJob: "shipment.transition.close_job"
};

// output/web/js.tmp/implementations/ui/bootstrap/components/detail-panel.js
var SLIDE_DURATION_MS = 250;
var ERROR_COLOR = "#dc2626";
var INITIAL_REQUEST_ID = 0;
var TABS = ["Overview", "Containers", "Documents", "Billing", "Exceptions", "Commission", "History"];
var PLACEHOLDER_TABS = ["Documents", "Billing", "Exceptions"];
var VdgDetailPanel = class extends LitElement2 {
  static properties = {
    shipment: { type: Object },
    activeTab: { type: String, state: true },
    liveState: { type: String, state: true },
    transitionError: { type: String, state: true },
    transitioning: { type: Boolean, state: true },
    timeline: { type: Array, state: true },
    wasmReady: { type: Boolean, state: true },
    notFound: { type: Boolean, state: true },
    commissionEl: { type: Object, state: true }
  };
  createRenderRoot() {
    return this;
  }
  constructor() {
    super();
    this.shipment = null;
    this.activeTab = "Overview";
    this.liveState = null;
    this.transitionError = null;
    this.transitioning = false;
    this.timeline = null;
    this.wasmReady = false;
    this.notFound = false;
    this.commissionEl = null;
    this._requestId = INITIAL_REQUEST_ID;
    this._escListener = null;
    this._onWasmReady = () => {
      this.wasmReady = typeof window.__vdg_wasm?.get_entity_state === "function";
      if (this.wasmReady && this.shipment && !this.liveState) {
        this._loadEntityState();
        if (this.activeTab === "History") this._loadTimeline();
      }
    };
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("vdg:wasm-ready", this._onWasmReady);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("vdg:wasm-ready", this._onWasmReady);
    this._removeEscListener();
  }
  _loadCommission() {
    const repo = window.__vdg_repo;
    if (!repo || !this.shipment) return;
    this.updateComplete.then(() => {
      const el = this.querySelector("#commission-tab-content");
      if (el) renderCommissionTab(el, this.shipment.ref, repo);
    });
  }
  // Public: open panel with row data
  open(rowData) {
    this.shipment = rowData;
    this.activeTab = "Overview";
    this.liveState = null;
    this.transitionError = null;
    this.transitioning = false;
    this.timeline = null;
    this.notFound = false;
    this.commissionEl = null;
    this.wasmReady = typeof window.__vdg_wasm?.get_entity_state === "function";
    this.removeAttribute("hidden");
    requestAnimationFrame(() => {
      this.classList.remove("translate-x-full");
      this.classList.add("translate-x-0");
    });
    this._removeEscListener();
    this._escListener = (e) => {
      if (e.key === "Escape") this.close();
    };
    document.addEventListener("keydown", this._escListener);
    if (this.wasmReady) this._loadEntityState();
  }
  // Public: close panel
  close() {
    this.classList.remove("translate-x-0");
    this.classList.add("translate-x-full");
    this._removeEscListener();
    setTimeout(() => {
      this.setAttribute("hidden", "");
      this.dispatchEvent(new CustomEvent("vdg:panel-closed", { bubbles: true, composed: true, detail: {} }));
    }, SLIDE_DURATION_MS);
  }
  _removeEscListener() {
    if (!this._escListener) return;
    document.removeEventListener("keydown", this._escListener);
    this._escListener = null;
  }
  async _loadEntityState() {
    const myId = ++this._requestId;
    try {
      const state = await window.__vdg_wasm.get_entity_state(this.shipment.ref);
      if (this._requestId !== myId) return;
      this.liveState = state;
    } catch (err) {
      if (this._requestId !== myId) return;
      try {
        const env = JSON.parse(err.message);
        if (env.code === "NOT_FOUND") this.notFound = true;
        else console.warn("[VDG] get_entity_state:", env);
      } catch {
      }
    }
  }
  async _loadTimeline() {
    if (this.timeline !== null || !this.wasmReady) return;
    const myId = ++this._requestId;
    try {
      const records = await window.get_transition_log(this.shipment.ref);
      if (this._requestId !== myId) return;
      this.timeline = records;
    } catch (err) {
      if (this._requestId !== myId) return;
      this.timeline = [];
    }
  }
  async _applyTransition() {
    if (!this.wasmReady) {
      this.transitionError = t("shipment.detail.wasm_not_available");
      return;
    }
    if (!navigator.onLine) {
      this.transitionError = t("shipment.detail.offline_no_transition");
      return;
    }
    const prevState = this.liveState ?? this.shipment?.state;
    const event = NEXT_EVENT[prevState];
    if (!event) return;
    this.transitioning = true;
    this.transitionError = null;
    const myId = ++this._requestId;
    try {
      const result = await window.apply_fsm_event(this.shipment.ref, event);
      if (this._requestId !== myId) return;
      this.liveState = result;
      this.timeline = null;
      await persistAdvancedState(window.__vdg_repo, this.shipment.ref, result);
      this._toast(t("shipment.detail.transition_applied", { from: t("shipment.status." + prevState), to: t("shipment.status." + result) }));
    } catch (err) {
      if (this._requestId !== myId) return;
      try {
        this.transitionError = guardMessage(JSON.parse(err.message));
      } catch {
        this.transitionError = t("shipment.detail.transition_failed", { error: err.message });
      }
    } finally {
      if (this._requestId === myId) this.transitioning = false;
    }
  }
  _toast(msg) {
    const el = document.createElement("div");
    el.className = "fixed bottom-6 right-6 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg z-50";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 300);
    }, 2800);
  }
  _onTabClick(tab) {
    this.activeTab = tab;
    if (tab === "History") this._loadTimeline();
    if (tab === "Commission") this._loadCommission();
  }
  _navigate(route) {
    this.dispatchEvent(new CustomEvent("vdg:navigate", { bubbles: true, composed: true, detail: { route } }));
  }
  render() {
    if (!this.shipment) return html2``;
    const cur = this.liveState ?? this.shipment.state;
    return html2`
      <div class="flex flex-col h-full">
        <div class="flex items-center justify-between p-4 border-b border-slate-200 shrink-0">
          <div>
            <div class="font-mono text-sm font-semibold text-slate-900">${this.shipment.ref}</div>
            <div class="text-xs text-slate-500 mt-0.5">${this.shipment.customer}</div>
          </div>
          <button @click=${() => this.close()} class="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">
            <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        ${!this.wasmReady ? html2`<div class="mx-4 mt-3 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs">${t("shipment.detail.wasm_unavailable")}</div>` : ""}
        ${this.notFound ? html2`<div class="mx-4 mt-3 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-xs" style="color:${ERROR_COLOR}">${t("shipment.detail.not_found", { ref: this.shipment.ref })}</div>` : ""}
        <div class="flex border-b border-slate-200 shrink-0 overflow-x-auto scrollbar-thin">
          ${TABS.map((tab) => html2`<button @click=${() => this._onTabClick(tab)}
            class="px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${this.activeTab === tab ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-900"}">${t("shipment.detail.tab." + tab.toLowerCase())}</button>`)}
        </div>
        <div class="flex-1 overflow-y-auto scrollbar-thin p-4">${this._renderContent(cur)}</div>
      </div>
    `;
  }
  _renderContent(cur) {
    const s = this.shipment;
    if (this.activeTab === "Overview") return html2`
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-500">${t("shipment.detail.field.state")}</span>
          <status-badge state=${cur} fsm="shipment"></status-badge>
        </div>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
          ${["lane", "carrier", "vessel", "voyage", "etd", "eta", "teu"].map((f) => html2`
            <div><dt class="text-slate-400 mb-0.5">${t("shipment.detail.field." + f)}</dt><dd class="font-medium text-slate-800 font-mono">${s[f] ?? "\u2014"}</dd></div>`)}
        </dl>
        ${this._renderChips(s)}
        ${this._renderButton(cur)}
        ${this._renderVoidDelete(cur)}
      </div>`;
    if (this.activeTab === "Containers") return html2`
      <div class="flex items-center gap-2 text-sm">
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">${s.teu ?? 0} ${t("shipment.detail.field.teu")}</span>
        <span class="text-slate-400 text-xs">${t("shipment.detail.containers_placeholder")}</span>
      </div>`;
    if (this.activeTab === "History") return this._renderHistory();
    if (this.activeTab === "Commission") return html2`<div id="commission-tab-content"><p class="text-xs text-slate-400">${t("common.loading")}</p></div>`;
    return html2`<p class="text-xs text-slate-400">${PLACEHOLDER_TABS.includes(this.activeTab) ? t("shipment.detail.placeholder." + this.activeTab.toLowerCase()) : ""}</p>`;
  }
  _renderChips(s) {
    const hasVoyage = s.voyage != null;
    return html2`
      <div class="flex flex-wrap gap-2 pt-1">
        <button ?disabled=${!hasVoyage} @click=${() => hasVoyage && this._navigate(`/voyages/${s.voyage}`)}
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${hasVoyage ? "bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer" : "bg-slate-50 text-slate-400 cursor-default"}">
          <svg viewBox="0 0 24 24" class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l1-4 5-1 2-6 2 6 5 1 1 4H3z"/></svg>
          ${hasVoyage ? `${s.vessel} / ${s.voyage}` : t("shipment.detail.unassigned")}
        </button>
        <button @click=${() => this._navigate(`/customers/${encodeURIComponent(s.customer)}`)}
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer">
          <svg viewBox="0 0 24 24" class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          ${s.customer}
        </button>
      </div>`;
  }
  _renderButton(cur) {
    if (cur === "Closed") return html2`<button disabled class="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed">${t("shipment.detail.job_closed")}</button>`;
    const event = NEXT_EVENT[cur];
    if (!event) return html2``;
    const offline = !navigator.onLine;
    const label = `${offline ? t("shipment.detail.offline_prefix") : ""}${t(TRANSITION_LABEL[event])}`;
    const can = this.wasmReady && !this.notFound;
    return html2`
      <div class="mt-4">
        <button @click=${() => this._applyTransition()} ?disabled=${!can || this.transitioning}
          title=${!this.wasmReady ? t("shipment.detail.wasm_not_available") : ""}
          class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
          ${this.transitioning ? t("shipment.detail.applying") : `\u2192 ${label}`}
        </button>
        ${this.transitionError ? html2`<p class="mt-2 text-xs" style="color:${ERROR_COLOR}">${this.transitionError}</p>` : ""}
      </div>`;
  }
  // F-19-77 AC-01/02/05 — manager-only Void/Delete control. Decision keys ONLY on the stored
  // shipment record (publish_state/state) — same rule as the grid row action (shipments.js) —
  // never on this.notFound (wasm get_entity_state NOT_FOUND is a different, unrelated orphan
  // class tracked separately as F-19-88). This keeps the grid and the detail panel in agreement
  // for the same shipment (F-19-77 rework D-1): a published shipment always offers Void here,
  // never Delete.
  _renderVoidDelete(cur) {
    if (!hasRole(ROLE_MANAGER)) return html2``;
    const affordance = chooseShipmentAffordance({ ...this.shipment, state: cur });
    if (affordance === "none") return html2``;
    const label = affordance === "delete" ? t("common.action.delete") : t("shipments.action.void");
    const cls = affordance === "delete" ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-amber-50 text-amber-700 hover:bg-amber-100";
    return html2`
      <div class="mt-2">
        <button @click=${() => this._onVoidDelete()} class="px-3 py-1.5 rounded-lg text-xs font-medium ${cls}">
          ${label}
        </button>
      </div>`;
  }
  async _onVoidDelete() {
    const result = await runShipmentAffordance({
      repo: window.__vdg_repo,
      shipment: this.shipment,
      isManager: hasRole(ROLE_MANAGER),
      confirm: (a) => showConfirm({
        destructive: true,
        title: t(a === "delete" ? "shipments.delete_confirm.title" : "shipments.void_confirm.title"),
        body: a === "void" ? t("shipments.void_confirm.body") : void 0,
        confirmLabel: t(a === "delete" ? "common.action.delete" : "shipments.action.void"),
        cancelLabel: t("common.action.cancel")
      })
    });
    if (!result.mutated) return;
    if (result.affordance === "delete") {
      this.close();
      return;
    }
    this.liveState = CANCELLED_STATE;
  }
  _renderHistory() {
    if (!this.wasmReady) return html2`<p class="text-xs text-slate-400">${t("shipment.detail.history_unavailable")}</p>`;
    if (this.timeline === null) return html2`<p class="text-xs text-slate-400">${t("common.loading")}</p>`;
    if (!this.timeline.length) return html2`<p class="text-xs text-slate-400">${t("shipment.detail.history_empty")}</p>`;
    return html2`<div>${this.timeline.map((e, i) => html2`
      <vdg-timeline-entry .entry=${e} ?last=${i === this.timeline.length - 1}></vdg-timeline-entry>`)}</div>`;
  }
};
customElements.define("vdg-detail-panel", VdgDetailPanel);

export {
  bindShipmentVoidDelete,
  chooseShipmentAffordance,
  runShipmentAffordance
};
