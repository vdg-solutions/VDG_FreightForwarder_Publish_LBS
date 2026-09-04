// sales-new-form.js — 4-section shipment form orchestrator (F-15-27)

import { t } from '../../../kernel/core_abstractions/i18n/index.js';
import { ROLE_MANAGER } from '../../../ui/core_abstractions/roles.js';
import { currentUserRoles } from '../../core_abstractions/ports/governance/route-guard.js';
import { saveDraft } from './sales-new/draft-manager.js';
import { todayLocal } from '../../../kernel/core_abstractions/util/today-local.js';
export { shipmentToDraft } from './sales-new-form/pnl-vertical-autofill.js';
import { sectionAHtml } from './sales-new-form/section-header.js';
import { wireHeaderSection } from './sales-new-form/section-header-wiring.js';
import { sectionBHtml, collectLines } from './sales-new-form/section-lines.js';
import { computeQuoteTotals } from '../../core_abstractions/ports/flows/quote-totals.js';
import { wireLinesSection } from './sales-new-form/section-lines-wiring.js';
import { sectionCHtml, wireCommissionSection, collectCommission }
  from './sales-new-form/section-commission.js';
import { sectionDHtml, wireWaterfallSection, renderWaterfall, collectWaterfallOverrides }
  from './sales-new-form/section-waterfall.js';
import { docsExtHtml, DOCS_EXT_FIELDS, wireCargoItemsTable, collectCargoItems,
         wireContainersTable, collectContainers } from './sales-new-form/section-docs-ext.js';
import { wireQuoteAttach } from './sales-new-form/quote-attach.js';
import { renderActionBar } from './sales-new-form/action-bar.js';
import { marginPct } from '../../core_abstractions/ports/manager/margin-pct.js';
import { initPhaseScreens } from './sales-new-form/phase-screens.js';
export { jumpToFirstError } from './sales-new-form/phase-screens.js';
import { summarizeLineCurrencies, resolveHeaderCurrency } from './sales-new-form/pnl-line-fx.js';
import { mountDateHints } from '../util/date-input-hint.js';

const AUTOSAVE_DELAY_MS = 1500;

export async function renderForm(root, opts = {}) {
  const { customers = [], excludedRepCount = 0, salesRepId = '', userConfig = null, draft = null,
          mode = 'create', fxRepo = null, jobNo = null, defaultCurrency = null,
          revenueVisible = true, reps = [], editRef = null, carriers = [], shipments = [],
          weightUnits = [] } = opts;
  const isEdit    = mode === 'edit';
  // F-29-01 AC-06: doc date for fx_date defaults — persisted transaction_date on edit, today on create
  const docDate   = draft?.transaction_date || todayLocal();
  // #28: display toggle (which waterfall rows to show), reading the SET the auth gate resolved —
  // not a single-field string compare, and not an authority gate (route-guard owns those).
  const isManager = currentUserRoles().includes(ROLE_MANAGER);
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
  // Book currency (owner correction, 2026-08-28): the workspace's book currency, not a
  // hardcoded VND — no per-document memory, always today's accounting default (period-scoped
  // freezing is a separate, larger design, not this fix). Every mục-B/mục-C passthrough check
  // compares against THIS, not against d.currency (a saved job may show one currency while the
  // book books another).
  d.book_currency = resolveHeaderCurrency(null, defaultCurrency);

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

  // native constraint validation used to block submit on an incomplete closing_si/closing_cy
  // datetime-local with a browser tooltip and no submit event at all, leaving whatever error
  // banner a prior attempt painted stuck on screen. novalidate hands the gate entirely to
  // validateShipmentForm — collectFormState reads badInput below so nothing gets silently dropped.
  root.innerHTML = `
    <div class="p-6 max-w-6xl mx-auto space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xl font-semibold text-slate-900">${formTitle}</div>
          <div class="text-xs text-slate-500 mt-0.5">${formSubtitle}</div>
        </div>
      </div>
      <div id="phase-timeline"></div>
      <form id="shipment-form" class="space-y-4" novalidate>
        <input type="hidden" name="book_currency" value="${d.book_currency}" />
        ${sectionAHtml(d, customers, reps, { carriers, shipments, weightUnits, excludedRepCount })}
        ${sectionBHtml(d)}
        ${revenueVisible ? sectionCHtml(d) : ''}
        ${revenueVisible ? sectionDHtml(d, { isManager }) : ''}
        <div id="shipment-currency-summary" class="hidden text-[11px] text-slate-500 px-1"></div>
        <div id="shipment-form-errors"
          class="hidden text-xs text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
        </div>
        ${renderActionBar(d.publish_state)}
      </form>
    </div>`;

  // E-39: the extra booking/docs cells join section A's grid, then the 4 phase screens partition
  // the whole form. The opening screen follows the phase the job is in (F-39-03).
  root.querySelector('#sec-a-body .grid')?.insertAdjacentHTML('beforeend', docsExtHtml(d));
  initPhaseScreens(root, { state: d.state || 'Created' });
  mountDateHints(root);

  const onChanged = () => _recomputeWaterfall(root, userConfig);

  wireHeaderSection(root, onChanged);
  wireCargoItemsTable(root, onChanged);
  wireContainersTable(root, onChanged);
  wireLinesSection(root, onChanged, salesRepId, fxRepo, docDate);
  // F-41-02: the job-side quote door — options, one-job-per-quote guard, auto-rating.
  wireQuoteAttach(root, { repo: typeof window !== 'undefined' ? window.__vdg_repo : null,
                          fxRepo, docDate, ownRef: editRef, onChanged });
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
    const form = root.querySelector('#shipment-form');
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

// datetime-local reports '' for BOTH "left blank" and "typed something the browser can't parse"
// (e.g. date+hour+minute filled, AM/PM segment left empty) — .value alone can't tell them apart.
// .validity.badInput is the only signal that distinguishes garbage-in-the-box from empty-box, and
// it must survive into the state object or a malformed closing_si/closing_cy silently saves as
// blank once novalidate stops the browser from refusing the submit itself.
const badInput = (root, name) => !!root.querySelector(`[name=${name}]`)?.validity?.badInput;

export function collectFormState(root) {
  const g = (name) => root.querySelector(`[name=${name}]`)?.value || '';
  const jobNo  = g('job_no') || null;
  const hasHbl = root.querySelector('[name=has_hbl]')?.checked || false;
  return {
    quote_id:         g('quote_id') || null,
    mode:             g('mode') || 'SEA',
    mbl:              g('mbl'),
    // F-32-01 QA rework DEFECT-01: hbl must be derived HERE, not only in buildShipment —
    // validateShipmentForm's save-gate runs on this state before buildShipment ever sees it.
    job_no:           jobNo,
    has_hbl:          hasHbl,
    hbl:              hasHbl ? jobNo : null,
    job_file_no:      g('job_file_no'),
    product:          g('product'),
    // E-43: this key was MISSING while `validateShipmentForm` refuses to publish without it, so
    // `state.direction` was always undefined and EVERY publish failed with "Chưa chọn chiều
    // xuất/nhập" — including jobs whose hidden `direction` input plainly held `export`. Nothing
    // could ever reach the ledger; measured live on two shipments that had every other field.
    direction:        g('direction'),
    sales_rep:        g('sales_rep'),
    customer:         g('customer'),
    shipper:          g('shipper'),
    shipper_address:  g('shipper_address'),
    consignee:        g('consignee'),
    consignee_address: g('consignee_address'),
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
    book_currency:    g('book_currency'),
    // air fields
    weight_actual:    g('weight_actual'),
    weight_uom:       g('weight_uom'),
    dim_l_cm:         g('dim_l_cm'),
    dim_w_cm:         g('dim_w_cm'),
    dim_h_cm:         g('dim_h_cm'),
    pieces:           g('pieces'),
    package_type:     g('package_type'),
    uld_type:         g('uld_type'),
    flight_no:        g('flight_no'),
    origin_iata:      g('origin_iata'),
    dest_iata:        g('dest_iata'),
    chargeable_kg:    g('chargeable_kg'),
    lines:            collectLines(root),
    commission_lines: collectCommission(root),
    sales_share_pct_override: collectWaterfallOverrides(root).sales_share_pct_override,
    cargo_items:      collectCargoItems(root),
    containers:       collectContainers(root),
    // E-39: booking/docs ext fields — one list (section-docs-ext.js), so collector cannot drift
    ...Object.fromEntries(DOCS_EXT_FIELDS.map((n) => [n, g(n)])),
    // the only two datetime-local fields in the form — see badInput() above
    closing_si_bad_input: badInput(root, 'closing_si'),
    closing_cy_bad_input: badInput(root, 'closing_cy'),
  };
}

// F-41-01 publish-vs-save gate moved to its own module (350-line cap); re-exported so every
// existing importer of validateShipmentForm keeps resolving through this file.
export { validateShipmentForm } from './sales-new-form/validate-shipment-form.js';

// Plain read-out of which currencies the entered lines use — no header comparison. The old FR-05
// warning compared every line cell against the header, so it fired on a blank form and reported
// cells while saying "dòng"; the count is what people actually wanted to see.
function _renderCurrencySummary(root, summary) {
  const el = root.querySelector('#shipment-currency-summary');
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

  // Σvnd_pay / Σvnd_collect / mục C net + the POL/POD split — one wasm call (F-15-27
  // quote_totals), never resummed per widget so the KPI cards and waterfall can't drift apart.
  const {
    sumReceipt: sr, sumPayment: sp, commissionTotal: cat,
    polReceiptSum, podReceiptSum, polPaymentSum, podPaymentSum,
  } = computeQuoteTotals(lines, commissionLines.map((l) => l.net_after_tax || 0));

  const share = window.__vdg_wasm.commission_resolve_sales_share_pct(
    overrides.sales_share_pct_override,
    userConfig?.sales_share_pct ?? null
  );

  // Waterfall math lives in WASM (single source of truth). Preview keeps signed
  // loss → clamp_negatives=false. margin=receipt-payment, com=Section C net.
  const w  = window.__vdg_wasm.commission_waterfall(sr - sp, cat, share, false);
  const wf = { margin: w.margin, tax20: w.tndn, gp: w.net_after, finalProfit: w.lbs_share };

  renderWaterfall(root, {
    sumReceipt: sr, sumPayment: sp,
    margin: wf.margin, tax20: wf.tax20,
    gp: wf.gp, finalProfit: wf.finalProfit,
    salesSharePct: share,
    polReceiptSum, podReceiptSum, polPaymentSum, podPaymentSum,
  });

  // UX Enhancement: Update Section B Quick KPI Stats Cards
  const qPay = root.querySelector('#quick-total-pay');
  const qCol = root.querySelector('#quick-total-collect');
  const qMar = root.querySelector('#quick-margin');
  const qPct = root.querySelector('#quick-margin-pct');
  const fmt = (v) => v ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '0';
  if (qPay) qPay.textContent = fmt(sp);
  if (qCol) qCol.textContent = fmt(sr);
  if (qMar) {
    // wf.margin IS sr - sp: commission_waterfall received that exact value as margin_vnd.
    qMar.textContent = fmt(wf.margin);
    if (wf.margin < 0) {
      qMar.className = 'text-sm font-bold text-red-600 mt-0.5';
    } else if (wf.margin > 0) {
      qMar.className = 'text-sm font-bold text-emerald-700 mt-0.5';
    } else {
      qMar.className = 'text-sm font-semibold text-slate-900 mt-0.5';
    }
  }
  if (qPct) {
    if (sr > 0) {
      const pct = marginPct(wf.margin, sr);
      qPct.textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
      qPct.className = `text-sm font-bold ${pct >= 0 ? 'text-emerald-700' : 'text-red-600'} mt-0.5`;
    } else {
      qPct.textContent = '—';
      qPct.className = 'text-sm font-semibold text-slate-900 mt-0.5';
    }
  }
}
