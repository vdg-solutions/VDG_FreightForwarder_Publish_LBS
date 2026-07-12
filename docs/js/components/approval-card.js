// Lit component — <vdg-approval-card>

import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';
import { getActiveSalesReps } from '../operators/sales-registry.js';
import { t } from '../i18n/index.js';

const SWIPE_THRESHOLD_PX   = 60; // F-14-16: min swipe distance for action

const APPROVAL_TYPE_COLORS = {
  QuoteOverride:    'bg-amber-100 text-amber-700',
  CreditOverride:   'bg-red-100 text-red-700',
  RefundCredit:     'bg-orange-100 text-orange-700',
  MasterMerge:      'bg-purple-100 text-purple-700',
  SalesOnboarding:  'bg-blue-100 text-blue-700',
  DemDetWaiver:     'bg-teal-100 text-teal-700',
  PeriodClose:      'bg-slate-100 text-slate-700',
  CommissionPayout: 'bg-green-100 text-green-700',
};
const APPROVAL_SLA_HOURS   = 24;
const ANIMATE_OUT_MS       = 300;

function relativeTime(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ageHours(isoStr) {
  return (Date.now() - new Date(isoStr).getTime()) / 3_600_000;
}

function fmtNum(n) {
  if (!n && n !== 0) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return n.toLocaleString();
}

class VdgApprovalCard extends LitElement {
  static properties = {
    item:        { type: Object },
    _expanded:   { type: Boolean, state: true },
    _comment:    { type: String,  state: true },
    _delegateTo: { type: String,  state: true },
    _animOut:    { type: Boolean, state: true },
    _action:     { type: String,  state: true },
    _swipeHint:  { type: String,  state: true }, // 'approve' | 'reject' | null
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.item         = null;
    this._expanded    = false;
    this._comment     = '';
    this._delegateTo  = '';
    this._animOut     = false;
    this._action      = '';
    this._swipeHint   = null;
    this._touchStartX = 0;
    this._repsList    = []; // loaded from registry
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadReps();
  }

  async _loadReps() {
    const repo = window.__vdg_repo;
    if (!repo) return;
    try {
      this._repsList   = await getActiveSalesReps(repo);
      this._delegateTo = this._repsList[0]?.prefix || '';
      this.requestUpdate();
    } catch (err) {
      console.error('[approval-card] rep load failed:', err); // DEV
    }
  }

  _onTouchStart(e) {
    this._touchStartX = e.changedTouches[0].clientX;
  }

  _onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - this._touchStartX;
    this._swipeHint = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    if (dx > 0) {
      this._expand('Approve');
    } else {
      this._expand('Rejected');
    }
  }

  _onTouchMove(e) {
    const dx = e.changedTouches[0].clientX - this._touchStartX;
    if (Math.abs(dx) >= SWIPE_THRESHOLD_PX) {
      this._swipeHint = dx > 0 ? 'approve' : 'reject';
    } else {
      this._swipeHint = null;
    }
  }

  _expand(action) {
    this._action   = action;
    this._comment  = '';
    this._expanded = action !== 'Delegate';
    if (action === 'Delegate') this._delegateTo = this._repsList[0]?.prefix || '';
    this.requestUpdate();
  }

  _animateOut(then) {
    this._animOut = true;
    setTimeout(then, ANIMATE_OUT_MS);
  }

  _submit() {
    const { _action: action, _comment: comment } = this;
    if (action === 'Rejected' && !comment.trim()) return;

    const decision = {
      decision: action === 'Approve' ? 'Approved' : action,
      comment:  comment.trim(),
      delegated_to: action === 'Delegate' ? this._delegateTo : undefined,
    };

    if (action !== 'NeedInfo') {
      this._animateOut(() => {
        this.dispatchEvent(new CustomEvent('vdg:approval-decision', {
          bubbles: true, composed: true,
          detail: { approval_request_id: this.item.id, ...decision },
        }));
      });
    } else {
      this.dispatchEvent(new CustomEvent('vdg:approval-decision', {
        bubbles: true, composed: true,
        detail: { approval_request_id: this.item.id, ...decision },
      }));
      this._expanded = false;
    }
  }

  _renderActions() {
    if (!this._expanded && this._action !== 'Delegate') {
      return html`
        <div class="mt-3 flex flex-wrap gap-2">
          <button @click="${() => this._expand('Approve')}"
                  class="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            ${t('approval.action.approve')}
          </button>
          <button @click="${() => this._expand('Rejected')}"
                  class="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
            ${t('approval.action.reject')}
          </button>
          <button @click="${() => this._expand('NeedInfo')}"
                  class="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
            ${t('approval.action.need_info')}
          </button>
          <button @click="${() => this._expand('Delegate')}"
                  class="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
            ${t('approval.action.delegate')}
          </button>
        </div>`;
    }

    if (this._action === 'Delegate') {
      return html`
        <div class="mt-3 flex items-center gap-2">
          <select @change="${(e) => { this._delegateTo = e.target.value; }}"
                  class="text-xs border border-slate-200 rounded px-2 py-1">
            ${this._repsList.map((r) => html`<option value="${r.prefix}">${r.name}</option>`)}
          </select>
          <button @click="${() => this._submit()}"
                  class="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg">${t('approval.action.delegate')}</button>
          <button @click="${() => { this._action = ''; }}"
                  class="px-2 py-1.5 text-xs text-slate-500">Cancel</button>
        </div>`;
    }

    const needComment = this._action === 'Rejected';
    const canSubmit   = !needComment || this._comment.trim().length > 0;
    const label = this._action === 'Approve' ? t('approval.action.approve') : this._action === 'Rejected' ? t('approval.action.reject') : t('approval.action.need_info');
    const btnCls      = this._action === 'Approve'
      ? 'bg-emerald-600 hover:bg-emerald-700'
      : this._action === 'Rejected'
        ? 'bg-red-600 hover:bg-red-700'
        : 'bg-slate-600 hover:bg-slate-700';

    return html`
      <div class="mt-3 space-y-2">
        <textarea
          placeholder="${needComment ? 'Comment required' : 'Optional comment…'}"
          rows="2"
          class="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 resize-none"
          @input="${(e) => { this._comment = e.target.value; }}"
        ></textarea>
        <div class="flex gap-2">
          <button
            ?disabled="${!canSubmit}"
            @click="${() => this._submit()}"
            class="px-3 py-1.5 text-xs text-white rounded-lg ${btnCls}
                   disabled:opacity-40 disabled:cursor-not-allowed"
          >${label}</button>
          <button @click="${() => { this._expanded = false; this._action = ''; }}"
                  class="px-2 py-1.5 text-xs text-slate-500">Cancel</button>
        </div>
      </div>`;
  }

  render() {
    const item = this.item;
    if (!item) return html``;
    const typeCls  = APPROVAL_TYPE_COLORS[item.type] || 'bg-slate-100 text-slate-700';
    const age      = ageHours(item.requested_at);
    const overdue  = age > APPROVAL_SLA_HOURS;

    const swipeCls = this._swipeHint === 'approve'
      ? 'ring-2 ring-emerald-400 bg-emerald-50/30'
      : this._swipeHint === 'reject'
        ? 'ring-2 ring-red-400 bg-red-50/30'
        : '';

    return html`
      <div
        class="bg-white rounded-xl border border-slate-200 p-4 transition-all ${swipeCls}"
        style="${this._animOut ? 'opacity:0;height:0;overflow:hidden;margin:0;padding:0;' : ''}"
        @touchstart="${(e) => this._onTouchStart(e)}"
        @touchmove="${(e) => this._onTouchMove(e)}"
        @touchend="${(e) => this._onTouchEnd(e)}"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="px-2 py-0.5 rounded text-[11px] font-medium ${typeCls}">${item.type}</span>
            ${overdue ? html`
              <span class="px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 text-red-700">
                SLA overdue
              </span>` : ''}
          </div>
          <span class="text-[11px] text-slate-400 whitespace-nowrap">
            ${relativeTime(item.requested_at)} · ${Math.round(age)}h
          </span>
        </div>

        <div class="mt-2 text-xs text-slate-700">
          <span class="font-medium">${item.requester}</span>
          ${item.target_kind ? html` → <span class="font-mono">${item.target_kind}:${item.target_id}</span>` : ''}
        </div>

        ${item.amount_impact ? html`
          <div class="mt-1 text-xs text-slate-600">
            Impact: <span class="font-semibold text-slate-800">${fmtNum(item.amount_impact)} VND</span>
          </div>` : ''}

        ${item.comment ? html`
          <div class="mt-1 text-[11px] text-slate-500 italic">${item.comment}</div>` : ''}

        ${this._renderActions()}
      </div>`;
  }
}

customElements.define('vdg-approval-card', VdgApprovalCard);
export { APPROVAL_TYPE_COLORS, APPROVAL_SLA_HOURS };
