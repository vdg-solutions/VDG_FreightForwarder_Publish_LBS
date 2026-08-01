// section-waterfall.js — Section D: readonly profit waterfall + POL/POD accordion

import { t } from '../../i18n/index.js';

function fmtVnd(n) {
  if (n == null) return '—';
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 0 });
}

function wfRow(id, label, value) {
  return `
    <div class="flex items-center justify-between py-1.5 border-b border-slate-100">
      <span class="text-[10px] text-slate-500">${label}</span>
      <span id="${id}" class="text-sm font-semibold text-slate-900">${fmtVnd(value)}</span>
    </div>`;
}

export function sectionDHtml(draft = {}, opts = {}) {
  const o           = draft.sales_share_pct_override;
  const isManager   = opts.isManager ?? false;
  const ruleLabel   = draft._rule_label ? `(${draft._rule_label})` : '';
  return `
    <div id="sec-d-body" class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          ${t('sales_new.section.waterfall')}
        </div>
        <button type="button" id="polpod-toggle"
          class="text-xs text-slate-500 hover:text-slate-700">
          ${t('sales_new.waterfall.polpod_toggle')} &#9658;
        </button>
      </div>
      <div id="polpod-breakdown" class="hidden mb-3 p-2 bg-slate-50 rounded text-xs text-slate-600 grid grid-cols-2 gap-1">
        <div>${t('sales_new.waterfall.sum_receipt')} POL: <span id="wf-pol-receipt">—</span></div>
        <div>${t('sales_new.waterfall.sum_receipt')} POD: <span id="wf-pod-receipt">—</span></div>
        <div>${t('sales_new.waterfall.sum_payment')} POL: <span id="wf-pol-payment">—</span></div>
        <div>${t('sales_new.waterfall.sum_payment')} POD: <span id="wf-pod-payment">—</span></div>
      </div>
      ${wfRow('wf-sum-receipt', t('sales_new.waterfall.sum_receipt'), null)}
      ${wfRow('wf-sum-payment', t('sales_new.waterfall.sum_payment'), null)}
      <div id="wf-margin-row"
        class="flex items-center justify-between py-1.5 border-b border-slate-100">
        <span class="text-[10px] text-slate-500">
          ${t('sales_new.waterfall.margin')}
          <span id="margin-loss-badge"
            class="hidden ml-1 px-1 py-0.5 rounded text-[9px] font-bold bg-red-500 text-white">
            ${t('sales_new.waterfall.loss_badge')}
          </span>
        </span>
        <span id="wf-margin" class="text-sm font-semibold text-slate-900">—</span>
      </div>
      ${wfRow('wf-tax20',       t('sales_new.waterfall.tax20'),       null)}
      ${wfRow('wf-gp',          t('sales_new.waterfall.gp'),          null)}
      <div class="flex items-center justify-between py-1.5 border-b border-slate-100">
        <span class="text-[10px] text-slate-500">
          ${t('sales_new.waterfall.sales_share')}
          ${ruleLabel ? `<span class="ml-1 text-blue-500">${ruleLabel}</span>` : ''}
        </span>
        ${isManager
          ? `<input type="number" name="sales_share_pct_override" step="any" min="0" max="100"
              value="${o != null ? o : ''}" placeholder="—"
              class="w-20 border border-slate-200 rounded px-2 py-1 text-xs text-right" />`
          : `<span class="text-xs font-medium text-slate-700" id="wf-sales-pct">
               ${o != null ? o + '%' : '—'}
             </span>
             <input type="hidden" name="sales_share_pct_override" value="${o != null ? o : ''}" />`
        }
      </div>
      ${wfRow('wf-final-profit', t('sales_new.waterfall.final_profit'), null)}
    </div>`;
}

export function wireWaterfallSection(root, onWaterfallChanged) {
  root.querySelector('#polpod-toggle')?.addEventListener('click', () => {
    const bd  = root.querySelector('#polpod-breakdown');
    const btn = root.querySelector('#polpod-toggle');
    if (!bd) return;
    const hidden = bd.classList.toggle('hidden');
    if (btn) {
      btn.innerHTML = t('sales_new.waterfall.polpod_toggle') + (hidden ? ' &#9658;' : ' &#9660;');
    }
  });

  root.querySelector('[name=sales_share_pct_override]')?.addEventListener('input', () => {
    onWaterfallChanged?.();
  });
}

export function renderWaterfall(root, result) {
  const {
    sumReceipt   = 0, sumPayment   = 0, margin = 0,
    tax20        = 0, gp           = 0, finalProfit = 0,
    polReceiptSum  = 0, podReceiptSum  = 0,
    polPaymentSum  = 0, podPaymentSum  = 0,
  } = result;

  const setTxt = (id, val) => {
    const el = root.querySelector(`#${id}`);
    if (el) el.textContent = fmtVnd(val);
  };

  setTxt('wf-sum-receipt',  sumReceipt);
  setTxt('wf-sum-payment',  sumPayment);
  setTxt('wf-tax20',        tax20);
  setTxt('wf-gp',           gp);
  setTxt('wf-final-profit', finalProfit);
  setTxt('wf-pol-receipt',  polReceiptSum);
  setTxt('wf-pod-receipt',  podReceiptSum);
  setTxt('wf-pol-payment',  polPaymentSum);
  setTxt('wf-pod-payment',  podPaymentSum);

  // AC-03: margin < 0 → red loss flag + red row
  const marginEl  = root.querySelector('#wf-margin');
  const marginRow = root.querySelector('#wf-margin-row');
  const lossBadge = root.querySelector('#margin-loss-badge');

  if (marginEl) marginEl.textContent = fmtVnd(margin);

  if (margin < 0) {
    marginEl?.classList.add('text-red-600');
    marginEl?.classList.remove('text-slate-900');
    marginRow?.classList.add('bg-red-50', 'border-red-200');
    lossBadge?.classList.remove('hidden');
  } else {
    marginEl?.classList.remove('text-red-600');
    marginEl?.classList.add('text-slate-900');
    marginRow?.classList.remove('bg-red-50', 'border-red-200');
    lossBadge?.classList.add('hidden');
  }
}

export function collectWaterfallOverrides(root) {
  const raw    = root.querySelector('[name=sales_share_pct_override]')?.value;
  const parsed = (raw !== '' && raw != null) ? parseFloat(raw) : null;
  return { sales_share_pct_override: (parsed !== null && !isNaN(parsed)) ? parsed : null };
}
