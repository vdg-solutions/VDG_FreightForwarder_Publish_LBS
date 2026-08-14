// sales-new-form.js — 4-section NI form orchestrator (F-15-27)

import { t } from '../i18n/index.js';
import { saveDraft } from './sales-new/draft-manager.js';
import { todayLocal } from '../util/today-local.js';
export { shipmentToDraft } from './sales-new-form/pnl-vertical-autofill.js';
import { sectionAHtml, wireHeaderSection } from './sales-new-form/section-header.js';
import { sectionBHtml, wireLinesSection, collectLines, sumVndPay, sumVndCollect }
  from './sales-new-form/section-lines.js';
import { sectionCHtml, wireCommissionSection, collectCommission }
  from './sales-new-form/section-commission.js';
import { sectionDHtml, wireWaterfallSection, renderWaterfall, collectWaterfallOverrides }
  from './sales-new-form/section-waterfall.js';
import { docsExtHtml, DOCS_EXT_FIELDS } from './sales-new-form/section-docs-ext.js';
import { initPhaseScreens } from './sales-new-form/phase-screens.js';
export { jumpToFirstError } from './sales-new-form/phase-screens.js';
import { resolveSalesSharePct } from './sales-new-form/waterfall-math.js';
import { summarizeLineCurrencies, DEFAULT_HEADER_CURRENCY } from './sales-new-form/pnl-line-fx.js';
import { computeVndInvariant } from './sales-new-form/pnl-save-validations.js';

const AUTOSAVE_DELAY_MS = 1500;

/// Thin call into the Rust rule. The bridge is up by the time a view renders (repo-init awaits
/// wasm); DEFAULT_HEADER_CURRENCY is the same literal workspace_config.rs falls back to, so a
/// missing bridge yields the identical answer rather than a JS-side decision.
function resolveHeaderCurrency(saved, configuredDefault) {
  const bridge = window.workspace_header_currency;
  if (typeof bridge !== 'function') return saved || configuredDefault || DEFAULT_HEADER_CURRENCY;
  return bridge(saved || '', configuredDefault || '');
}

export async function renderForm(root, opts = {}) {
  const { customers = [], salesRepId = '', userConfig = null, draft = null,
          mode = 'create', fxRepo = null, jobNo = null, defaultCurrency = null,
          revenueVisible = true } = opts;
  const isEdit    = mode === 'edit';
  // F-29-01 AC-06: doc date for fx_date defaults — persisted transaction_date on edit, today on create
  const docDate   = draft?.transaction_date || todayLocal();
  // #28: display toggle (which waterfall rows to show), reading the SET the auth gate resolved —
  // not a single-field string compare, and not an authority gate (route-guard owns those).
  const isManager = (window.__vdg_current_user?.roles || []).includes('Manager');
  // F-37-06: `revenueVisible` comes from the CALLER, which is the thing that did the read - the
  // receipt is non-enumerable on purpose (it must never be persisted), so it does not survive
  // the spread into a draft. Passing it explicitly is also the honest shape: this module is
  // told what was readable, it does not infer it.
  // The commission and waterfall sections exist when the SELL SIDE could be read, and not
  // otherwise. Deliberately not `if (role === 'CS')` — that would put the wall back in the UI where
  // it enforces nothing, since the bytes have already reached the client. CS gets no revenue
  // section for the same reason CS gets no revenue: the folder was never granted, so the record
  // came back without one. A new job (no stored record yet) counts as visible — the rep typing it
  // is about to supply the figures.
  const d = draft ? { ...draft } : {};
  if (!d.sales_rep && salesRepId) d.sales_rep = salesRepId;

  // Which currency the header opens in is a business rule, so Rust decides it
  // (boundary/workspace_config.rs::header_currency): a saved P&L keeps its own, a new one takes
  // accounting's default, an unofferable default degrades to the fallback. Resolved BEFORE section
  // B renders, because the rows seed their currency cells off this same value — passing '' here
  // sent them down their own VND fallback while the header select showed USD.
  d.currency = resolveHeaderCurrency(d.currency, defaultCurrency);

  // F-32-01 AC-01/AC-07: Job No is resolved by the caller (render()'s bounded personalization
  // load, same PERSONALIZATION_LOAD_TIMEOUT_MS ceiling as customers/userConfig — F-19-29) and
  // handed in via opts.jobNo. Edit mode carries the persisted job_no through the draft
  // (shipmentToDraft) — never regenerated on re-open.
  if (!isEdit && !d.job_no) d.job_no = jobNo;

  // Annotate draft with rule label for display
  if (!isManager && userConfig?.sales_share_pct != null) {
    d._rule_label = `${userConfig.sales_share_pct}% sales`;
    d.sales_share_pct_override = d.sales_share_pct_override ?? userConfig.sales_share_pct;
  }

  // F-32-01 QA rework DEFECT-03: keyed through t() — the ternary-assigned-to-const shape
  // evaded the detector (only the interpolated ${formTitle}/${formSubtitle} vars were scanned).
  const formTitle    = isEdit ? t('sales_new.form.edit_title') : t('sales_new.form.create_title');
  const formSubtitle = isEdit ? t('sales_new.form.edit_subtitle') : t('sales_new.form.create_subtitle');

  root.innerHTML = `
    <div class="p-6 max-w-[1100px] mx-auto space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xl font-semibold text-slate-900">${formTitle}</div>
          <div class="text-xs text-slate-500 mt-0.5">${formSubtitle}</div>
        </div>
      </div>
      <form id="ni-form" class="space-y-4">
        ${sectionAHtml(d, customers)}
        ${sectionBHtml(d)}
        ${revenueVisible ? sectionCHtml(d) : ''}
        ${revenueVisible ? sectionDHtml(d, { isManager }) : ''}
        <div id="ni-currency-summary" class="hidden text-[11px] text-slate-500 px-1"></div>
        <div id="ni-form-errors"
          class="hidden text-xs text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
        </div>
        ${_renderActionBar(d.publish_state)}
      </form>
    </div>`;

  // E-39: the extra booking/docs cells join section A's grid, then the 4 phase screens partition
  // the whole form. The opening screen follows the phase the job is in (F-39-03).
  root.querySelector('#sec-a-body .grid')?.insertAdjacentHTML('beforeend', docsExtHtml(d));
  initPhaseScreens(root, { state: d.state || 'Created' });

  const onChanged = () => _recomputeWaterfall(root, userConfig);

  wireHeaderSection(root, onChanged);
  wireLinesSection(root, onChanged, salesRepId, fxRepo, docDate);
  if (revenueVisible) {
    wireCommissionSection(root, onChanged, fxRepo, docDate);
    wireWaterfallSection(root, onChanged);
    _recomputeWaterfall(root, userConfig);
  }

  // autosave draft only in create mode — edit data must not pollute localStorage draft
  if (!isEdit) {
    let autosaveTimer = null;
    // B-40-01-02: a pristine form must never mint a draft — opening the screen and switching
    // tabs used to store an all-blank draft, so the next visit greeted the rep with
    // "Bản nháp đã khôi phục" over nothing.
    let dirty = false;
    const form = root.querySelector('#ni-form');
    form?.addEventListener('input', () => {
      dirty = true;
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(() => {
        if (form.isConnected) saveDraft(collectFormState(root));
      }, AUTOSAVE_DELAY_MS);
    });
    // submit clears the draft upstream — a still-pending timer must not resurrect it
    form?.addEventListener('submit', () => clearTimeout(autosaveTimer));
    const onHidden = () => {
      // this render's form is gone → retire the listener instead of saving a stale copy
      if (!form || !form.isConnected) { document.removeEventListener('visibilitychange', onHidden); return; }
      if (dirty && document.visibilityState === 'hidden') saveDraft(collectFormState(root));
    };
    document.addEventListener('visibilitychange', onHidden);
  }
}

export function collectFormState(root) {
  const g = (name) => root.querySelector(`[name=${name}]`)?.value || '';
  const jobNo  = g('job_no') || null;
  const hasHbl = root.querySelector('[name=has_hbl]')?.checked || false;
  return {
    quote_id:         g('quote_id') || null,
    mode:             g('mode') || 'SEA',
    mbl:              g('mbl'),
    // F-32-01 QA rework DEFECT-01: hbl must be derived HERE, not only in buildShipment —
    // validateNiForm's save-gate runs on this state before buildShipment ever sees it.
    job_no:           jobNo,
    has_hbl:          hasHbl,
    hbl:              hasHbl ? jobNo : null,
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
    // E-39: booking/docs ext fields — one list (section-docs-ext.js), so collector cannot drift
    ...Object.fromEntries(DOCS_EXT_FIELDS.map((n) => [n, g(n)])),
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
  // F-29-02 AC-04: same hard block, extended to mục C commission rows
  for (const l of state.commission_lines || []) {
    if (l.amount_fx && !l.currency) lineCurrencyMissing = true;
    if (l.currency && l.currency !== 'VND' && l.amount_fx && !l.fx_rate) lineFxMissing = true;
  }
  if (lineCurrencyMissing) errs.push(t('sales_new.validation.line_currency_required'));
  if (lineFxMissing) {
    errs.push(t('sales_new.validation.line_fx_required'));
    errs.push(t('sales_new.validation.line_fx_no_rate_hint'));
  }

  // F-29-04 VR-02: defensive Σvnd invariant — carried per-line VND must match the recomputed sum
  const inv = computeVndInvariant(state);
  if (!inv.match) {
    errs.push(t('sales_new.validation.vnd_invariant')
      .replace('{expected}', inv.expected).replace('{actual}', inv.actual).replace('{delta}', inv.delta));
  }
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

// Plain read-out of which currencies the entered lines use — no header comparison. The old FR-05
// warning compared every line cell against the header, so it fired on a blank form and reported
// cells while saying "dòng"; the count is what people actually wanted to see.
function _renderCurrencySummary(root, summary) {
  const el = root.querySelector('#ni-currency-summary');
  if (!el) return;
  if (summary.length === 0) { el.classList.add('hidden'); return; }
  const items = summary.map((s) =>
    t('sales_new.currency_summary.item', { count: s.count, currency: s.currency }));
  el.textContent = `${t('sales_new.currency_summary.label')} ${items.join(' · ')}`;
  el.classList.remove('hidden');
}

function _recomputeWaterfall(root, userConfig) {
  const lines           = collectLines(root);
  const commissionLines = collectCommission(root);
  const overrides       = collectWaterfallOverrides(root);

  _renderCurrencySummary(root, summarizeLineCurrencies(lines, commissionLines));

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
