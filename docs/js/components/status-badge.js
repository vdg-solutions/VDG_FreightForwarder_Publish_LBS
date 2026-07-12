import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';

const SHIPMENT_COLOR = {
  Created: ['bg-slate-100', 'text-slate-700'],
  BookingConfirmed: ['bg-blue-100', 'text-blue-700'],
  InTransit: ['bg-amber-100', 'text-amber-700'],
  Arrived: ['bg-emerald-100', 'text-emerald-700'],
  Delivered: ['bg-teal-100', 'text-teal-700'],
  Closed: ['bg-slate-800', 'text-white'],
};

const DOCUMENT_COLOR = {
  Draft: ['bg-slate-100', 'text-slate-700'],
  PendingApproval: ['bg-amber-100', 'text-amber-700'],
  Issued: ['bg-emerald-100', 'text-emerald-700'],
  Surrendered: ['bg-purple-100', 'text-purple-700'],
  Released: ['bg-teal-100', 'text-teal-700'],
  Cancelled: ['bg-red-100', 'text-red-700'],
};

const BILLING_COLOR = {
  DraftCosts: ['bg-slate-100', 'text-slate-700'],
  PendingInvoice: ['bg-amber-100', 'text-amber-700'],
  Billed: ['bg-blue-100', 'text-blue-700'],
  PartiallyPaid: ['bg-indigo-100', 'text-indigo-700'],
  Paid: ['bg-emerald-100', 'text-emerald-700'],
};

const EXCEPTION_COLOR = {
  Low: ['bg-yellow-100', 'text-yellow-700'],
  Medium: ['bg-orange-100', 'text-orange-700'],
  High: ['bg-red-100', 'text-red-700'],
  Critical: ['bg-red-700', 'text-white'],
};

const FAMILIES = {
  shipment: SHIPMENT_COLOR,
  document: DOCUMENT_COLOR,
  billing: BILLING_COLOR,
  exception: EXCEPTION_COLOR,
};

class VdgStatusBadge extends LitElement {
  static properties = {
    state: { type: String },
    fsm: { type: String },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.state = '';
    this.fsm = 'shipment';
  }

  render() {
    const family = FAMILIES[this.fsm] || SHIPMENT_COLOR;
    const [bg, fg] = family[this.state] || ['bg-slate-100', 'text-slate-600'];
    return html`
      <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium tracking-tight ${bg} ${fg}">
        <span class="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
        ${this.state}
      </span>
    `;
  }
}

customElements.define('status-badge', VdgStatusBadge);
