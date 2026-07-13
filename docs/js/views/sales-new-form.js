// sales-new-form.js — 4-section NI form orchestrator (F-15-27)

import { t } from '../i18n/index.js';
import { saveDraft } from './sales-new/draft-manager.js';
export { PNL_VERTICAL_AUTOFILL_KEY, niDtoToDraft, shipmentToDraft } from './sales-new-form/pnl-vertical-autofill.js';
import { sectionAHtml, wireHeaderSection } from './sales-new-form/section-header.js';
import { sectionBHtml, wireLinesSection, collectLines, sumVndPay, sumVndCollect }
  from './sales-new-form/section-lines.js';
import { sectionCHtml, wireCommissionSection, collectCommission }
  from './sales-new-form/section-commission.js';
import { sectionDHtml, wireWaterfallSection, renderWaterfall, collectWaterfallOverrides }
  from './sales-new-form/section-waterfall.js';
import { resolveSalesSharePct } from './sales-new-form/waterfall-math.js';

const AUTOSAVE_DELAY_MS = 1500;

export async function renderForm(root, opts = {}) {
  const { customers = [], salesRepId = '', userConfig = null, draft = null,
          mode = 'create', fxRepo = null } = opts;
  const isEdit    = mode === 'edit';
  // F-29-01 AC-06: doc date for fx_date defaults — persisted transaction_date on edit, today on create
  const docDate   = draft?.transaction_date || new Date().toISOString().slice(0, 10);
  const isManager = window.__vdg_current_user?.role === 'Manager';
  const d = draft ? { ...draft } : {};
  if (!d.sales_rep && salesRepId) d.sales_rep = salesRepId;

  // Annotate draft with rule label for display
  if (!isManager && userConfig?.sales_share_pct != null) {
    d._rule_label = `${userConfig.sales_share_pct}% sales`;
    d.sales_share_pct_override = d.sales_share_pct_override ?? userConfig.sales_share_pct;
  }

  const formTitle    = isEdit ? 'Edit P&L' : 'Create New PNL';
  const formSubtitle = isEdit ? 'Update existing shipment' : 'Canonical 4-section form';

  root.innerHTML = `
    <div class="p-6 max-w-[1100px] mx-auto space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xl font-semibold text-slate-900">${formTitle}</div>
          <div class="text-xs text-slate-500 mt-0.5">${formSubtitle}</div>
        </div>
        <div class="w-64">
          <upload-zone id="ni-upload-zone" accept=".xlsx, .xls"></upload-zone>
        </div>
      </div>
      <form id="ni-form" class="space-y-4">
        ${sectionAHtml(d, customers)}
        ${sectionBHtml(d)}
        ${sectionCHtml(d)}
        ${sectionDHtml(d, { isManager })}
        <div id="ni-form-errors"
          class="hidden text-xs text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
        </div>
        ${_renderActionBar(d.publish_state)}
      </form>
    </div>`;

  const onChanged = () => _recomputeWaterfall(root, userConfig);

  wireHeaderSection(root, onChanged);
  wireLinesSection(root, onChanged, salesRepId, fxRepo, docDate);
  wireCommissionSection(root, onChanged);
  wireWaterfallSection(root, onChanged);

  _recomputeWaterfall(root, userConfig);

  // autosave draft only in create mode — edit data must not pollute localStorage draft
  if (!isEdit) {
    let autosaveTimer = null;
    root.querySelector('#ni-form')?.addEventListener('input', () => {
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(() => saveDraft(collectFormState(root)), AUTOSAVE_DELAY_MS);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') saveDraft(collectFormState(root));
    });
  }
}

export function collectFormState(root) {
  const g = (name) => root.querySelector(`[name=${name}]`)?.value || '';
  return {
    mode:             g('mode') || 'SEA',
    mbl:              g('mbl'),
    hbl:              g('hbl'),
    job_file_no:      g('job_file_no'),
    product:          g('product'),
    sales_rep:        g('sales_rep'),
    customer:         g('customer'),
    shipper:          g('shipper'),
    consignee:        g('consignee'),
    contact_person:   g('contact_person'),
    vessel:           g('vessel'),
    carrier:          g('carrier'),
    etd:              g('etd'),
    eta:              g('eta'),
    pol:              g('pol'),
    pod:              g('pod'),
    volume:           g('volume'),
    roe_buying:       g('roe_buying'),
    roe_selling:      g('roe_selling'),
    currency:         g('currency'),
    // air fields
    weight_actual_kg: g('weight_actual_kg'),
    dim_l_cm:         g('dim_l_cm'),
    dim_w_cm:         g('dim_w_cm'),
    dim_h_cm:         g('dim_h_cm'),
    pieces:           g('pieces'),
    uld_type:         g('uld_type'),
    flight_no:        g('flight_no'),
    origin_iata:      g('origin_iata'),
    dest_iata:        g('dest_iata'),
    chargeable_kg:    g('chargeable_kg'),
    lines:            collectLines(root),
    commission_lines: collectCommission(root),
    sales_share_pct_override: collectWaterfallOverrides(root).sales_share_pct_override,
  };
}

// → string[] (empty = valid); negative margin is NOT a blocker (AC-03)
export function validateNiForm(state) {
  const errs = [];
  if (!state.mbl && !state.hbl && !state.job_file_no) {
    errs.push(t('sales_new.validation.no_bill'));
  }
  if (!state.customer) {
    errs.push(t('sales_new.validation.no_customer'));
  }
  const hasLine = (state.lines || []).some((l) => l.vnd_pay > 0 || l.vnd_collect > 0);
  if (!hasLine) {
    errs.push(t('sales_new.validation.no_lines'));
  }
  // F-29-01 AC-05: amount without currency, or non-VND without fx_rate — hard block per side
  let lineCurrencyMissing = false;
  let lineFxMissing       = false;
  for (const l of state.lines || []) {
    if (l.buy_amt && !l.buy_currency)   lineCurrencyMissing = true;
    if (l.sell_amt && !l.sell_currency) lineCurrencyMissing = true;
    if (l.buy_currency && l.buy_currency !== 'VND' && l.buy_amt && !l.buy_fx_rate) {
      lineFxMissing = true;
    }
    if (l.sell_currency && l.sell_currency !== 'VND' && l.sell_amt && !l.sell_fx_rate) {
      lineFxMissing = true;
    }
  }
  if (lineCurrencyMissing) errs.push(t('sales_new.validation.line_currency_required'));
  if (lineFxMissing)       errs.push(t('sales_new.validation.line_fx_required'));
  return errs;
}

function _renderActionBar(publishState) {
  if (publishState === 'published') {
    return `
      <div class="flex gap-3 pt-2">
        <button type="button" disabled
          class="px-5 py-2 bg-emerald-100 text-emerald-800 text-sm font-medium rounded-lg flex items-center gap-2 cursor-not-allowed">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          ${t('sales_new.action.published')}
        </button>
      </div>`;
  }
  
  if (publishState === 'publish_pending') {
    return `
      <div class="flex gap-3 pt-2">
        <button type="button" disabled
          class="px-5 py-2 bg-blue-100 text-blue-800 text-sm font-medium rounded-lg flex items-center gap-2 cursor-not-allowed">
          <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          ${t('sales_new.action.publishing')}
        </button>
      </div>`;
  }

  // default: draft / undefined
  return `
    <div class="flex gap-3 pt-2">
      <button type="submit" data-intent="save" id="ni-save-btn"
        class="px-4 py-2 border border-slate-300 text-sm text-slate-700 rounded-lg hover:bg-slate-50">
        ${t('sales_new.action.save')}
      </button>
      <button type="submit" data-intent="publish" id="ni-publish-btn"
        class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
        ${t('sales_new.action.publish')}
      </button>
    </div>`;
}

function _recomputeWaterfall(root, userConfig) {
  const lines           = collectLines(root);
  const commissionLines = collectCommission(root);
  const overrides       = collectWaterfallOverrides(root);

  const sr  = sumVndCollect(lines);
  const sp  = sumVndPay(lines);
  // AC-07: sum all commission rows' net_after_tax
  const cat = commissionLines.reduce((s, l) => s + (l.net_after_tax || 0), 0);

  const share = resolveSalesSharePct(
    overrides.sales_share_pct_override,
    userConfig?.sales_share_pct ?? null
  );

  // Waterfall math lives in WASM (single source of truth). Preview keeps signed
  // loss → clamp_negatives=false. margin=receipt-payment, com=Section C net.
  const w  = window.__vdg_wasm.commission_waterfall(sr - sp, cat, share, false);
  const wf = { margin: w.margin, tax20: w.tndn, gp: w.net_after, finalProfit: w.lbs_share };

  const polReceiptSum = lines.filter((l) => l.pol_pod_side === 'POL')
    .reduce((s, l) => s + l.vnd_collect, 0);
  const podReceiptSum = lines.filter((l) => l.pol_pod_side === 'POD')
    .reduce((s, l) => s + l.vnd_collect, 0);
  const polPaymentSum = lines.filter((l) => l.pol_pod_side === 'POL')
    .reduce((s, l) => s + l.vnd_pay, 0);
  const podPaymentSum = lines.filter((l) => l.pol_pod_side === 'POD')
    .reduce((s, l) => s + l.vnd_pay, 0);

  renderWaterfall(root, {
    sumReceipt: sr, sumPayment: sp,
    margin: wf.margin, tax20: wf.tax20,
    gp: wf.gp, finalProfit: wf.finalProfit,
    salesSharePct: share,
    polReceiptSum, podReceiptSum, polPaymentSum, podPaymentSum,
  });
}
