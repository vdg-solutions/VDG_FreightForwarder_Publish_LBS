import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';
import { guardMessage } from '../utils/guard-messages.js';
import './timeline-entry.js';
import { renderCommissionTab } from '../views/commission-tab.js';

const PANEL_WIDTH_PX     = 480;
const SLIDE_DURATION_MS  = 250;
const NAV_HEIGHT_REM     = 3.5;
const ERROR_COLOR        = '#dc2626';
const Z_PANEL            = 40;
const INITIAL_REQUEST_ID = 0;

const TABS = ['Overview', 'Containers', 'Documents', 'Billing', 'Exceptions', 'Commission', 'History'];

const NEXT_EVENT = {
  Created: 'ConfirmBooking', BookingConfirmed: 'VoyageDeparted',
  InTransit: 'VoyageArrived', Arrived: 'DeliveryConfirmed', Delivered: 'CloseJob',
};
const TRANSITION_LABEL = {
  ConfirmBooking: 'Confirm Booking', VoyageDeparted: 'Mark Departed',
  VoyageArrived: 'Mark Arrived', DeliveryConfirmed: 'Confirm Delivery', CloseJob: 'Close Job',
};
const PLACEHOLDER_TEXT = {
  Documents:  'Documents will be available in a future release (F-03).',
  Billing:    'Billing summary will be available in a future release (F-08).',
  Exceptions: 'Exception log will be available in a future release (F-18).',
};

class VdgDetailPanel extends LitElement {
  static properties = {
    shipment:        { type: Object },
    activeTab:       { type: String,  state: true },
    liveState:       { type: String,  state: true },
    transitionError: { type: String,  state: true },
    transitioning:   { type: Boolean, state: true },
    timeline:        { type: Array,   state: true },
    wasmReady:       { type: Boolean, state: true },
    notFound:        { type: Boolean, state: true },
    commissionEl:    { type: Object,  state: true },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.shipment = null; this.activeTab = 'Overview';
    this.liveState = null; this.transitionError = null;
    this.transitioning = false; this.timeline = null;
    this.wasmReady = false; this.notFound = false;
    this.commissionEl = null;
    this._requestId = INITIAL_REQUEST_ID; this._escListener = null;
    this._onWasmReady = () => {
      this.wasmReady = typeof window.__vdg_wasm?.get_entity_state === 'function';
      if (this.wasmReady && this.shipment && !this.liveState) {
        this._loadEntityState();
        if (this.activeTab === 'History') this._loadTimeline();
      }
    };
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('vdg:wasm-ready', this._onWasmReady);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('vdg:wasm-ready', this._onWasmReady);
    this._removeEscListener();
  }

  _loadCommission() {
    const repo = window.__vdg_repo;
    if (!repo || !this.shipment) return;
    // updateComplete ensures Lit has flushed the DOM before querying
    this.updateComplete.then(() => {
      const el = this.querySelector('#commission-tab-content');
      if (el) renderCommissionTab(el, this.shipment.ref, repo);
    });
  }

  // Public: open panel with row data
  open(rowData) {
    this.shipment = rowData; this.activeTab = 'Overview';
    this.liveState = null; this.transitionError = null;
    this.transitioning = false; this.timeline = null;
    this.notFound = false; this.commissionEl = null;
    this.wasmReady = typeof window.__vdg_wasm?.get_entity_state === 'function';
    this.removeAttribute('hidden');
    requestAnimationFrame(() => {
      this.classList.remove('translate-x-full');
      this.classList.add('translate-x-0');
    });
    this._removeEscListener();
    this._escListener = (e) => { if (e.key === 'Escape') this.close(); };
    document.addEventListener('keydown', this._escListener);
    if (this.wasmReady) this._loadEntityState();
  }

  // Public: close panel
  close() {
    this.classList.remove('translate-x-0');
    this.classList.add('translate-x-full');
    this._removeEscListener();
    setTimeout(() => {
      this.setAttribute('hidden', '');
      this.dispatchEvent(new CustomEvent('vdg:panel-closed', { bubbles: true, composed: true, detail: {} }));
    }, SLIDE_DURATION_MS);
  }

  _removeEscListener() {
    if (!this._escListener) return;
    document.removeEventListener('keydown', this._escListener);
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
        if (env.code === 'NOT_FOUND') this.notFound = true;
        else console.warn('[VDG] get_entity_state:', env); // DEV
      } catch { /* non-JSON — keep shipment.state */ }
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
    if (!this.wasmReady) { this.transitionError = 'WASM not available'; return; }
    if (!navigator.onLine) { this.transitionError = 'Offline — cannot apply transition'; return; }
    const prevState = this.liveState ?? this.shipment?.state;
    const event = NEXT_EVENT[prevState];
    if (!event) return;
    this.transitioning = true; this.transitionError = null;
    const myId = ++this._requestId;
    try {
      const result = await window.apply_fsm_event(this.shipment.ref, event);
      if (this._requestId !== myId) return;
      this.liveState = result; this.timeline = null;
      this._toast(`Transition applied: ${prevState} → ${result}`);
    } catch (err) {
      if (this._requestId !== myId) return;
      try { this.transitionError = guardMessage(JSON.parse(err.message)); }
      catch { this.transitionError = `Transition failed: ${err.message}`; }
    } finally { if (this._requestId === myId) this.transitioning = false; }
  }

  _toast(msg) {
    const t = document.createElement('div');
    t.className = 'fixed bottom-6 right-6 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg z-50';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2800);
  }

  _onTabClick(tab) {
    this.activeTab = tab;
    if (tab === 'History')    this._loadTimeline();
    if (tab === 'Commission') this._loadCommission();
  }

  _navigate(route) {
    this.dispatchEvent(new CustomEvent('vdg:navigate', { bubbles: true, composed: true, detail: { route } }));
  }

  render() {
    if (!this.shipment) return html``;
    const cur = this.liveState ?? this.shipment.state;
    return html`
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
        ${!this.wasmReady ? html`<div class="mx-4 mt-3 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs">Live data unavailable — WASM module not loaded</div>` : ''}
        ${this.notFound ? html`<div class="mx-4 mt-3 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-xs" style="color:${ERROR_COLOR}">Shipment ${this.shipment.ref} not found in local state</div>` : ''}
        <div class="flex border-b border-slate-200 shrink-0 overflow-x-auto scrollbar-thin">
          ${TABS.map(t => html`<button @click=${() => this._onTabClick(t)}
            class="px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${this.activeTab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}">${t}</button>`)}
        </div>
        <div class="flex-1 overflow-y-auto scrollbar-thin p-4">${this._renderContent(cur)}</div>
      </div>
    `;
  }

  _renderContent(cur) {
    const s = this.shipment;
    if (this.activeTab === 'Overview') return html`
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-500">State</span>
          <status-badge state=${cur} fsm="shipment"></status-badge>
        </div>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
          ${['lane','vessel','voyage','etd','eta','teu'].map(f => html`
            <div><dt class="text-slate-400 mb-0.5">${f.toUpperCase()}</dt><dd class="font-medium text-slate-800 font-mono">${s[f] ?? '—'}</dd></div>`)}
        </dl>
        ${this._renderChips(s)}
        ${this._renderButton(cur)}
      </div>`;
    if (this.activeTab === 'Containers') return html`
      <div class="flex items-center gap-2 text-sm">
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">${s.teu ?? 0} TEU</span>
        <span class="text-slate-400 text-xs">Container list available in a future release (F-03).</span>
      </div>`;
    if (this.activeTab === 'History')    return this._renderHistory();
    if (this.activeTab === 'Commission') return html`<div id="commission-tab-content"><p class="text-xs text-slate-400">Loading…</p></div>`;
    return html`<p class="text-xs text-slate-400">${PLACEHOLDER_TEXT[this.activeTab] ?? ''}</p>`;
  }

  _renderChips(s) {
    const hasVoyage = s.voyage != null;
    return html`
      <div class="flex flex-wrap gap-2 pt-1">
        <button ?disabled=${!hasVoyage} @click=${() => hasVoyage && this._navigate(`/voyages/${s.voyage}`)}
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${hasVoyage ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer' : 'bg-slate-50 text-slate-400 cursor-default'}">
          <svg viewBox="0 0 24 24" class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l1-4 5-1 2-6 2 6 5 1 1 4H3z"/></svg>
          ${hasVoyage ? `${s.vessel} / ${s.voyage}` : 'Unassigned'}
        </button>
        <button @click=${() => this._navigate(`/customers/${encodeURIComponent(s.customer)}`)}
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer">
          <svg viewBox="0 0 24 24" class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          ${s.customer}
        </button>
      </div>`;
  }

  _renderButton(cur) {
    if (cur === 'Closed') return html`<button disabled class="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed">Job Closed</button>`;
    const event = NEXT_EVENT[cur];
    if (!event) return html``;
    const offline = !navigator.onLine;
    const label = `${offline ? '(Offline) ' : ''}${TRANSITION_LABEL[event]}`;
    const can = this.wasmReady && !this.notFound;
    return html`
      <div class="mt-4">
        <button @click=${() => this._applyTransition()} ?disabled=${!can || this.transitioning}
          title=${!this.wasmReady ? 'WASM not available' : ''}
          class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
          ${this.transitioning ? 'Applying…' : `→ ${label}`}
        </button>
        ${this.transitionError ? html`<p class="mt-2 text-xs" style="color:${ERROR_COLOR}">${this.transitionError}</p>` : ''}
      </div>`;
  }

  _renderHistory() {
    if (!this.wasmReady) return html`<p class="text-xs text-slate-400">Transition history unavailable</p>`;
    if (this.timeline === null) return html`<p class="text-xs text-slate-400">Loading…</p>`;
    if (!this.timeline.length) return html`<p class="text-xs text-slate-400">No transitions recorded yet</p>`;
    return html`<div>${this.timeline.map((e, i) => html`
      <vdg-timeline-entry .entry=${e} ?last=${i === this.timeline.length - 1}></vdg-timeline-entry>`)}</div>`;
  }
}

customElements.define('vdg-detail-panel', VdgDetailPanel);
