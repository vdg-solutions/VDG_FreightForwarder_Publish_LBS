// validate-shipment-form.js — the shipment form's save/publish gate, split out of sales-new-form.js at the
// 350-line cap. Pure: a state object in, an array of message strings out. No DOM, no repo, so
// the publish rules can be read (and tested) without standing the form up.

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { computeVndInvariant } from './pnl-save-validations.js';

// → string[] (empty = valid); negative margin is NOT a blocker (AC-03)
//
// F-41-01: two gates are PUBLISH gates, not save gates. CS opens the job at the booking window,
// before any B/L number or charge line exists — blocking that save blocked the whole CS-first
// flow the process is built on. Publish is the handover to Accounting, which is where a job
// without a bill number or a single line stops being a working file and starts being a mistake.
// Default publish:true keeps every existing caller/test on the strict path.
export function validateShipmentForm(state, { publish = true } = {}) {
  const errs = [];
  if (publish && !state.mbl && !state.hbl && !state.job_file_no) {
    errs.push(t('sales_new.validation.no_bill'));
  }
  if (!state.customer) {
    errs.push(t('sales_new.validation.no_customer'));
  }
  // novalidate (sales-new-form.js) hands the browser's own datetime-local refusal over to this
  // gate — badInput means the box holds unparseable input (e.g. date+hour+minute typed, AM/PM
  // segment left empty), which is NOT the same as an untouched field. Blocks on save too, not
  // only publish: a badInput box must never save silently as blank.
  if (state.closing_si_bad_input) {
    errs.push(t('sales_new.validation.closing_si_incomplete'));
  }
  if (state.closing_cy_bad_input) {
    errs.push(t('sales_new.validation.closing_cy_incomplete'));
  }
  // The job's owner must exist from birth: the revenue fork, the publish fork and the Job No
  // namespace are all addressed by it — an unattributed save writes into nobody's folders.
  if (!state.sales_rep) {
    errs.push(t('sales_new.validation.no_sales_rep'));
  }
  // F-41-07: the customs checklist row is keyed on direction, so a job saved without one can
  // never leave Arrived on its own evidence. Only blocks on publish — a booking-window draft may
  // legitimately not know yet — and only bites when the product did not already settle it.
  if (publish && !state.direction) {
    errs.push(t('sales_new.validation.no_direction'));
  }
  const hasLine = (state.lines || []).some((l) => l.vnd_pay > 0 || l.vnd_collect > 0);
  if (publish && !hasLine) {
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
