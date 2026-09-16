import {
  applyShipmentEvent
} from "./chunk-3RLMMSOJ.js";
import {
  can
} from "./chunk-GOIBPTZO.js";
import {
  guardMessage
} from "./chunk-4OQ5MA6C.js";
import {
  listCommissionEntriesFor
} from "./chunk-ZYZ6J7HL.js";
import {
  showConfirm
} from "./chunk-HKNQBDY4.js";
import {
  currentLocale,
  fmtNumber,
  t
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/ui/bootstrap/components/sync-attention-modal.js
var REASON_CODE_TO_KEY = {
  undecodable_content: "topbar.sync.attention.reason.undecodable_content",
  permission_denied: "topbar.sync.attention.reason.permission_denied",
  not_found: "topbar.sync.attention.reason.not_found",
  validation_refused: "topbar.sync.attention.reason.validation_refused",
  unsupported_kind: "topbar.sync.attention.reason.unsupported_kind",
  record_changed: "topbar.sync.attention.reason.record_changed",
  state_moved: "topbar.sync.attention.reason.state_moved",
  create_collided: "topbar.sync.attention.reason.create_collided",
  unsent_before_upgrade: "topbar.sync.attention.reason.unsent_before_upgrade",
  unsent_before_upgrade_unchecked: "topbar.sync.attention.reason.unsent_before_upgrade_unchecked",
  other: "topbar.sync.attention.reason.other",
  // ADO #123 — `backup_quarantined` rows (outbox/attention.rs::classify_backup_reason):
  // backup-copy problems, never a write refusal, so each gets its own sentence rather than
  // reusing e.g. `not_found`'s wording above (that one means a write THIS device made was
  // refused; these mean the record is safe and only its Google Drive backup is delayed).
  backup_subrequest_budget_exceeded: "topbar.sync.attention.reason.backup_subrequest_budget_exceeded",
  backup_credentials_rejected: "topbar.sync.attention.reason.backup_credentials_rejected",
  backup_not_found: "topbar.sync.attention.reason.backup_not_found",
  backup_unknown: "topbar.sync.attention.reason.backup_unknown",
  // store/core_abstractions/intent_parking.rs: a queued change on this device that no longer reads.
  intent_unreadable: "topbar.sync.attention.reason.intent_unreadable"
};
var REASON_FALLBACK_KEY = "topbar.sync.attention.reason.other";
var ACTION_TO_KEY = {
  reapply: "attention.action.reapply",
  discard: "attention.action.discard",
  open: "attention.action.open",
  // outbox/unreadable_intents.rs: same label, its own wasm call (the row is not in the queue).
  discard_unreadable: "attention.action.discard"
};
var ACTION_REAPPLY = "reapply";
var ACTION_DISCARD_UNREADABLE = "discard_unreadable";
var OPEN_ROUTE = { shipment: (id) => `#/sales/edit/${encodeURIComponent(id)}` };
var OUTCOME_STALE = "stale";
var ACTION_ATTR = "data-intent-action";
function reasonText(reasonCode) {
  return t(REASON_CODE_TO_KEY[reasonCode] ?? REASON_FALLBACK_KEY);
}
function fmtWhen(ms) {
  if (!ms) return "\u2014";
  return new Date(ms).toLocaleString(currentLocale() === "vi" ? "vi-VN" : "en-US");
}
var shown = (v) => v === null || v === void 0 || v === "" ? "\u2014" : typeof v === "object" ? JSON.stringify(v) : String(v);
function changeLines(item) {
  const changes = item.changes || [];
  const lines = changes.map((c) => `
    <div class="text-[11px] text-slate-600"><span class="font-mono">${c.field}</span>:
      ${t("attention.change.yours")} <b>${shown(c.yours)}</b> \xB7
      ${c.from === void 0 ? "" : `${t("attention.change.from")} ${shown(c.from)} \xB7 `}
      ${t("attention.change.now")} ${shown(c.now)}</div>`);
  if (item.dependents) lines.push(`<div class="text-[11px] text-slate-400">${t("attention.dependents", { n: fmtNumber(item.dependents) })}</div>`);
  return lines.join("");
}
function actionButtons(item) {
  if (!item.intent_id) return "";
  return (item.actions || []).filter((a) => ACTION_TO_KEY[a] && (a !== "open" || OPEN_ROUTE[item.collection])).map((a) => `
    <button type="button" ${ACTION_ATTR}="${a}" data-intent-id="${item.intent_id}"
      class="px-2 py-1 text-[11px] rounded border border-slate-300 hover:bg-slate-100">${t(ACTION_TO_KEY[a])}</button>`).join(" ");
}
function itemRow(item) {
  const label = item.record_label || `${item.collection} / ${item.record_id}`;
  return `
    <tr class="border-b border-slate-100 align-top">
      <td class="px-3 py-2">
        <div class="font-medium text-slate-800">${label}</div>
        <div class="text-[11px] text-slate-400 font-mono">${item.collection} \xB7 ${item.record_id}</div>
      </td>
      <td class="px-3 py-2">${reasonText(item.reason_code)}${changeLines(item)}</td>
      <td class="px-3 py-2 text-slate-500 whitespace-nowrap">${fmtWhen(item.last_seen_ms)}</td>
      <td class="px-3 py-2 text-right font-mono">${fmtNumber(item.attempts)}</td>
      <td class="px-3 py-2 text-right whitespace-nowrap">${actionButtons(item)}</td>
    </tr>`;
}
function toast(type, message) {
  window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { type, message } }));
}
async function onAction(dlg, button, items) {
  const action = button.getAttribute(ACTION_ATTR);
  const intentId = button.getAttribute("data-intent-id");
  const item = items.find((i) => i.intent_id === intentId);
  if (action === "open") {
    window.location.hash = OPEN_ROUTE[item.collection](item.record_id);
    dlg.close();
    return;
  }
  const wasm = window.__vdg_wasm;
  try {
    if (action === ACTION_DISCARD_UNREADABLE) {
      await window.__vdg_repo.sync_unreadable_intent_discard(intentId);
    } else {
      const call = action === ACTION_REAPPLY ? wasm?.sync_intent_reapply : wasm?.sync_intent_discard;
      const reply = await call({ intent_id: intentId });
      if (!reply?.ok) toast("error", t("attention.action.failed", { error: reply?.error ?? "" }));
      else if (reply.outcome === OUTCOME_STALE) toast("info", t("save.error.stale_base"));
    }
  } catch (e) {
    toast("error", t("attention.action.failed", { error: e?.message ?? String(e) }));
  }
  dlg.close();
  openSyncAttentionModal();
}
async function openSyncAttentionModal() {
  let items = [];
  try {
    items = await window.__vdg_repo?.sync_attention_items?.() || [];
  } catch (e) {
    toast("error", t("topbar.sync.attention.load_failed"));
    return;
  }
  const body = items.length ? `<table class="w-full text-left border-collapse text-xs">
         <thead>
           <tr class="bg-slate-50 text-slate-500 uppercase text-[10px]">
             <th class="px-3 py-2">${t("topbar.sync.attention.col_record")}</th>
             <th class="px-3 py-2">${t("topbar.sync.attention.col_reason")}</th>
             <th class="px-3 py-2">${t("topbar.sync.attention.col_when")}</th>
             <th class="px-3 py-2 text-right">${t("topbar.sync.attention.col_attempts")}</th>
             <th class="px-3 py-2 text-right">${t("topbar.sync.attention.col_actions")}</th>
           </tr>
         </thead>
         <tbody>${items.map(itemRow).join("")}</tbody>
       </table>` : `<div class="px-6 py-10 text-center text-slate-400 text-sm">${t("topbar.sync.attention.empty")}</div>`;
  const dlg = document.createElement("dialog");
  dlg.className = "rounded-xl shadow-2xl p-0 w-[760px] max-w-[95vw] bg-white backdrop:bg-black/40";
  dlg.innerHTML = `
    <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
      <div class="font-semibold text-slate-900 text-sm">${t("topbar.sync.attention.title")}</div>
      <button type="button" data-dialog-close class="w-8 h-8 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500">\u2715</button>
    </div>
    <div class="max-h-[70vh] overflow-y-auto">${body}</div>
  `;
  dlg.addEventListener("click", (ev) => {
    if (ev.target.closest?.("[data-dialog-close]")) {
      dlg.close();
      return;
    }
    const button = ev.target.closest?.(`[${ACTION_ATTR}]`);
    if (button) onAction(dlg, button, items);
  });
  document.body.appendChild(dlg);
  dlg.addEventListener("close", () => dlg.remove());
  dlg.showModal();
}
var TRANSITION_OUTCOME_EVENT = "vdg:transition-outcome";
var OUTCOME_NOTICE = {
  applied: ["success", "shipment.detail.transition_applied"],
  reapplied: ["info", "intent.outcome.reapplied"],
  settled: ["info", "intent.settled.already_in_state"],
  state_moved: ["warn", "intent.outcome.state_moved"],
  refused: ["warn", "intent.outcome.refused"]
};
var statusLabel = (state) => state ? t("shipment.status." + state) : "";
function outcomeNotice(detail) {
  const entry = OUTCOME_NOTICE[detail?.outcome];
  if (!entry) return null;
  const [type, key] = entry;
  return { type, message: t(key, { from: statusLabel(detail.from), to: statusLabel(detail.to), state: statusLabel(detail.state) }) };
}
function bindIntentNotices() {
  window.addEventListener(TRANSITION_OUTCOME_EVENT, (e) => {
    const notice = outcomeNotice(e.detail);
    if (notice) toast(notice.type, notice.message);
  });
}

// output/web/js.tmp/implementations/ui/bootstrap/components/detail-panel.js
import { LitElement as LitElement2, html as html2 } from "https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm";

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
    entries = await listCommissionEntriesFor(shipmentRef) || [];
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
    this.commissionEl = null;
    this._requestId = INITIAL_REQUEST_ID;
    this._escListener = null;
    this._onWasmReady = () => {
      this.wasmReady = typeof window.__vdg_wasm?.flows_apply_event === "function";
      if (this.wasmReady && this.shipment && !this.liveState) {
        this.liveState = this.shipment.state;
        if (this.activeTab === "History") this._loadTimeline();
      }
    };
    this._onTransitionOutcome = (e) => {
      const { shipment_ref: ref, state } = e.detail || {};
      if (!this.shipment || ref !== this.shipment.ref || !state) return;
      this.liveState = state;
      this.shipment = { ...this.shipment, state };
      this.timeline = null;
    };
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("vdg:wasm-ready", this._onWasmReady);
    window.addEventListener(TRANSITION_OUTCOME_EVENT, this._onTransitionOutcome);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("vdg:wasm-ready", this._onWasmReady);
    window.removeEventListener(TRANSITION_OUTCOME_EVENT, this._onTransitionOutcome);
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
  // Public: open panel with row data. `liveState` is seeded from the record the grid handed in
  // (ADO #120: the record is the only source of a shipment's state) and only ever moves again
  // when a transition the operator actually wrote back succeeds — never from a separate read.
  open(rowData) {
    this.shipment = rowData;
    this.activeTab = "Overview";
    this.liveState = rowData?.state ?? null;
    this.transitionError = null;
    this.transitioning = false;
    this.timeline = null;
    this.commissionEl = null;
    this.wasmReady = typeof window.__vdg_wasm?.flows_apply_event === "function";
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
  // ADO #120: one call. `applyShipmentEvent` re-reads the record inside FsmIngest and computes the
  // hop off THAT (never off `this.liveState`, which can be stale the moment a second device or
  // tab already moved the job). A success is QUEUED, not applied: the server's answer arrives as
  // `vdg:transition-outcome` (accept-0492 D2), which says applied or hands back the real state.
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
      const result = await applyShipmentEvent(window.__vdg_repo, this.shipment.ref, event);
      if (this._requestId !== myId) return;
      if (!result.ok) {
        try {
          this.transitionError = guardMessage(JSON.parse(result.error));
        } catch {
          this.transitionError = t("shipment.detail.transition_failed", { error: result.error });
        }
        return;
      }
      this.liveState = result.state;
      this.shipment = { ...this.shipment, state: result.state };
      this.timeline = null;
      this._toast(t("shipment.detail.transition_queued", { from: t("shipment.status." + prevState), to: t("shipment.status." + result.state) }));
    } catch (err) {
      if (this._requestId !== myId) return;
      this.transitionError = t("shipment.detail.transition_failed", { error: err.message });
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
    if (!can("shipment.transition")) return html2``;
    const event = NEXT_EVENT[cur];
    if (!event) return html2``;
    const offline = !navigator.onLine;
    const label = `${offline ? t("shipment.detail.offline_prefix") : ""}${t(TRANSITION_LABEL[event])}`;
    const armed = this.wasmReady;
    return html2`
      <div class="mt-4">
        <button @click=${() => this._applyTransition()} ?disabled=${!armed || this.transitioning}
          title=${!this.wasmReady ? t("shipment.detail.wasm_not_available") : ""}
          class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
          ${this.transitioning ? t("shipment.detail.applying") : `\u2192 ${label}`}
        </button>
        ${this.transitionError ? html2`<p class="mt-2 text-xs" style="color:${ERROR_COLOR}">${this.transitionError}</p>` : ""}
      </div>`;
  }
  // F-19-77 AC-01/02/05 — manager-only Void/Delete control. Decision keys ONLY on the stored
  // shipment record (publish_state/state) — same rule as the grid row action (shipments.js).
  // This keeps the grid and the detail panel in agreement for the same shipment (F-19-77 rework
  // D-1): a published shipment always offers Void here, never Delete.
  _renderVoidDelete(cur) {
    if (!can("shipment.void")) return html2``;
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
      canVoid: can("shipment.void"),
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
  openSyncAttentionModal,
  bindIntentNotices,
  bindShipmentVoidDelete,
  chooseShipmentAffordance,
  runShipmentAffordance
};
