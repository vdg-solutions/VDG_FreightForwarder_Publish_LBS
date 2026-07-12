// Lit component — <vdg-kanban-board>

import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';
import { getActiveSalesReps } from '../operators/sales-registry.js';
import { t } from '../i18n/index.js';

const KANBAN_STATES           = ['Created','BookingConfirmed','InTransit','Arrived','Delivered','Closed'];
const KANBAN_COLUMN_WIDTH_PX  = 280;
const TOUCH_MODE_BREAKPOINT   = 768; // F-14-16: touch at mobile widths
const FALLBACK_BORDER_COLOR   = 'border-slate-300';
const VALID_NEXT = {
  Created:           ['BookingConfirmed'],
  BookingConfirmed:  ['InTransit'],
  InTransit:         ['Arrived'],
  Arrived:           ['Delivered'],
  Delivered:         ['Closed'],
  Closed:            [],
};

function fmtNum(n) {
  if (!n && n !== 0) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

class VdgKanbanBoard extends LitElement {
  static properties = {
    shipments:    { type: Array  },
    filter:       { type: Object },
    columns:      { type: Array  }, // override KANBAN_STATES for air/all mode
    mode:         { type: String }, // 'Sea'|'Air'|'All' — badge shown when 'All'
    _selected:    { type: Object, state: true },
    _dragging:    { type: String, state: true },
    _pending:     { type: Object, state: true },
    _moveMenuId:  { type: String, state: true }, // touch mode: open move-to menu
    _touchMode:   { type: Boolean, state: true },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.shipments   = [];
    this.filter      = {};
    this.columns     = null;
    this.mode        = 'All';
    this._selected   = new Set();
    this._dragging   = null;
    this._pending    = new Set();
    this._moveMenuId = null;
    this._touchMode  = window.innerWidth < TOUCH_MODE_BREAKPOINT || navigator.maxTouchPoints > 0;
    this._colorMap   = new Map(); // prefix → border-color class
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
      console.error('[kanban-board] color load failed:', err); // DEV
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._onUserChange = (e) => {
      if (e.detail?.kind === 'user') this._loadColors();
    };
    window.addEventListener('vdg:entity-changed', this._onUserChange);
    this._onLocale = () => this.requestUpdate();
    window.addEventListener('vdg:locale-changed', this._onLocale);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._onUserChange) window.removeEventListener('vdg:entity-changed', this._onUserChange);
    if (this._onLocale) window.removeEventListener('vdg:locale-changed', this._onLocale);
  }

  _filtered() {
    return this.shipments.filter((s) => {
      if (this.filter.sales_rep && (s.sales_rep || s.SalesRep) !== this.filter.sales_rep) return false;
      if (this.filter.customer  && (s.customer  || s.Customer)  !== this.filter.customer)  return false;
      if (this.filter.state     && (s.state     || s.State)     !== this.filter.state)     return false;
      return true;
    });
  }

  _byState(state) {
    return this._filtered().filter((s) => (s.state || s.State) === state);
  }

  _onDragStart(e, id) {
    this._dragging = id;
    e.dataTransfer.effectAllowed = 'move';
  }

  _onDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }

  _onDrop(e, toState) {
    e.preventDefault();
    const id = this._dragging;
    this._dragging = null;
    if (!id) return;

    const ship   = this.shipments.find((s) => s.id === id);
    const from   = ship?.state || ship?.State;
    if (!from || from === toState) return;

    // B1: WASM FSM guard; fallback to VALID_NEXT if WASM unavailable
    const wasm = window.__vdg_wasm;
    let allowed;
    if (wasm?.check_quotation_transition) {
      allowed = wasm.check_quotation_transition(from, toState);
    } else {
      // fallback if WASM unavailable
      const validTargets = VALID_NEXT[from] || [];
      allowed = validTargets.includes(toState);
    }
    if (!allowed) {
      this.dispatchEvent(new CustomEvent('vdg:toast', {
        bubbles: true, composed: true,
        detail: { type: 'error', message: `Cannot move ${from} → ${toState}` },
      }));
      return;
    }

    this._pending = new Set([...this._pending, id]);
    this.dispatchEvent(new CustomEvent('vdg:transition-request', {
      bubbles: true, composed: true,
      detail: { id, from, to: toState },
    }));
  }

  _onMoveRequest(id, toState) {
    this._moveMenuId = null;
    const ship = this.shipments.find((s) => s.id === id);
    const from = ship?.state || ship?.State;
    if (!from) return;
    // reuse existing drop logic via synthetic call
    const fakeEvent = { preventDefault: () => {} };
    this._dragging = id;
    this._onDrop(fakeEvent, toState);
  }

  _renderMoveMenu(id) {
    const ship   = this.shipments.find((s) => s.id === id);
    const from   = ship?.state || ship?.State;
    const targets = VALID_NEXT[from] || [];
    if (!targets.length) return '';
    return html`
      <div class="absolute left-0 top-full z-20 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px]"
           @click="${(e) => e.stopPropagation()}">
        ${targets.map((targetState) => html`
          <button class="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700"
                  @click="${() => this._onMoveRequest(id, targetState)}">
            → ${t('shipment.status.' + targetState)}
          </button>`)}
        <button class="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-slate-50"
                @click="${() => { this._moveMenuId = null; }}">Cancel</button>
      </div>`;
  }

  _onCardClick(e, id) {
    if (e.shiftKey) {
      const next = new Set(this._selected);
      next.has(id) ? next.delete(id) : next.add(id);
      this._selected = next;
      this.dispatchEvent(new CustomEvent('vdg:selection-changed', {
        bubbles: true, composed: true, detail: { ids: [...next] },
      }));
    } else {
      this.dispatchEvent(new CustomEvent('vdg:card-click', {
        bubbles: true, composed: true, detail: { id },
      }));
    }
  }

  _renderCard(s) {
    const id        = s.id;
    const ref       = s.shipment_ref || s.ShipmentRef || id;
    const customer  = s.customer     || s.Customer     || '—';
    const pol       = s.pol          || s.POL          || '?';
    const pod       = s.pod          || s.POD          || '?';
    const etd       = s.etd          || s.ETD          || '';
    const eta       = s.eta          || s.ETA          || '';
    const sales     = s.sales_rep    || s.SalesRep     || '';
    const margin    = s.margin_pct   ?? null;
    const salesCls  = this._colorMap.get((sales || '').toUpperCase()) || FALLBACK_BORDER_COLOR;
    const pendingCls= this._pending.has(id) ? 'opacity-70 animate-pulse' : '';
    const selCls    = this._selected.has(id) ? 'ring-2 ring-blue-400' : '';

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
          <span>ETD ${etd?.slice(0, 10) || '—'}</span>
          <span>ETA ${eta?.slice(0, 10) || '—'}</span>
        </div>
        ${margin !== null ? html`
          <div class="mt-1 text-[10px] font-medium ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}">
            Margin ${margin.toFixed(1)}%
          </div>` : ''}
        ${sales ? html`<div class="text-[10px] text-slate-400 mt-0.5">${sales}</div>` : ''}
        ${this.mode === 'All' && s.mode ? html`
          <span class="text-[9px] font-bold px-1 rounded mt-1 inline-block ${s.mode === 'air'
            ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}">
            ${s.mode === 'air' ? 'AIR' : 'SEA'}
          </span>` : ''}
        ${this._touchMode && (VALID_NEXT[s.state || s.State] || []).length ? html`
          <button class="mt-2 w-full text-[10px] text-blue-600 bg-blue-50 rounded py-1 text-center"
                  @click="${(e) => { e.stopPropagation(); this._moveMenuId = this._moveMenuId === id ? null : id; }}">
            Move to…
          </button>
          <div class="relative">${this._moveMenuId === id ? this._renderMoveMenu(id) : ''}</div>` : ''}
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
          <span class="text-xs font-semibold text-slate-700">${t('shipment.status.' + state)}</span>
          <span class="text-[10px] bg-slate-200 text-slate-600 rounded-full px-2 py-0.5">
            ${cards.length}
          </span>
        </div>
        <div class="p-2 min-h-[120px]">
          ${cards.map((s) => this._renderCard(s))}
          ${cards.length === 0 ? html`
            <div class="text-center text-[11px] text-slate-300 py-8">Empty</div>` : ''}
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
}

customElements.define('vdg-kanban-board', VdgKanbanBoard);
export { KANBAN_STATES, KANBAN_COLUMN_WIDTH_PX, VALID_NEXT };
