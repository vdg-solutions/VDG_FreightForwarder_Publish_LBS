// Lit component — <vdg-commission-slip> — print-only payment slip

import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';
import { t } from '../i18n/index.js';
import { resolveSalesRepLabel } from '../util/sales-rep-i18n.js';

const COMPANY_NAME = 'VDG FREIGHT FORWARDER';

function fmtNum(n) {
  return Number(n ?? 0).toLocaleString('vi-VN');
}

class VdgCommissionSlip extends LitElement {
  static properties = {
    data: { type: Object },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.data = null;
  }

  connectedCallback() {
    super.connectedCallback();
    // print after first render
    queueMicrotask(() => {
      window.print();
      const onDone = () => {
        this.remove();
        window.removeEventListener('afterprint', onDone);
      };
      window.addEventListener('afterprint', onDone);
    });
  }

  render() {
    const d    = this.data || {};
    const date = new Date().toLocaleDateString('vi-VN');
    const currentUser = typeof window !== 'undefined' ? window.__vdg_current_user : null;
    const salesRep = resolveSalesRepLabel(d.sales_rep || '', currentUser, t) || '—';

    return html`
      <style>
        @media screen { .print-only { display: none !important; } }
        @media print  { .print-only { display: block !important; } }
      </style>
      <div class="print-only" style="font-family:sans-serif;padding:32px;max-width:600px;margin:0 auto;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:18px;font-weight:700;letter-spacing:1px;">${COMPANY_NAME}</div>
          <div style="font-size:13px;color:#555;margin-top:4px;">${t('commission.slip.title')}</div>
          <div style="font-size:12px;color:#888;margin-top:2px;">${t('commission.slip.print_date')} ${date}</div>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tbody>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:8px 4px;color:#64748b;width:50%;">${t('commission.slip.sales_rep')}</td>
              <td style="padding:8px 4px;font-weight:600;">${salesRep}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:8px 4px;color:#64748b;">${t('commission.slip.period')}</td>
              <td style="padding:8px 4px;font-weight:600;">${d.period || '—'}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:8px 4px;color:#64748b;">${t('commission.slip.gross_margin')}</td>
              <td style="padding:8px 4px;">${fmtNum(d.margin)}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:8px 4px;color:#64748b;">${t('commission.slip.commission_rate')}</td>
              <td style="padding:8px 4px;">${d.commission_pct ?? 10}%</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:8px 4px;color:#64748b;">${t('commission.slip.commission')}</td>
              <td style="padding:8px 4px;">${fmtNum(d.commission)}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:8px 4px;color:#64748b;">${t('commission.slip.advances')}</td>
              <td style="padding:8px 4px;">${fmtNum(d.advances)}</td>
            </tr>
            <tr>
              <td style="padding:8px 4px;color:#0f172a;font-weight:700;">${t('commission.slip.net_payable')}</td>
              <td style="padding:8px 4px;font-weight:700;font-size:14px;">${fmtNum(d.net_payable)}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:40px;display:flex;justify-content:flex-end;">
          <div style="text-align:center;min-width:200px;">
            <div style="font-size:12px;color:#64748b;">${t('commission.signature_label')} _______________</div>
          </div>
        </div>
      </div>`;
  }
}

customElements.define('vdg-commission-slip', VdgCommissionSlip);
