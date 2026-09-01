// validate-shipment-form.js — the shipment form's save/publish gate, split out of sales-new-form.js at the
// 350-line cap. Pure: a state object in, an array of message strings out. No DOM, no repo, so
// the publish rules can be read (and tested) without standing the form up.
//
// F-41-01/F-29-01 AC-05/F-29-02 AC-04/F-41-07/F-29-04 VR-02: every rule that used to live here
// moved to Rust (rulesets::shipment_publish_gate) — this is now a thin call over the wasm gate
// that renders the i18n keys it returns. No business rule is duplicated in JS.

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';

const wasm = () => globalThis.window?.__vdg_wasm || globalThis.__vdg_wasm;

// → string[] (empty = valid); negative margin is NOT a blocker (AC-03)
//
// F-41-01: two of the gate's rules are PUBLISH gates, not save gates. CS opens the job at the
// booking window, before any B/L number or charge line exists — blocking that save blocked the
// whole CS-first flow the process is built on. Publish is the handover to Accounting, which is
// where a job without a bill number or a single line stops being a working file and starts being
// a mistake. Default publish:true keeps every existing caller/test on the strict path.
export function validateShipmentForm(state, { publish = true } = {}) {
  const mod = wasm();
  if (typeof mod?.validate_shipment_gate !== 'function') {
    throw new Error('validate-shipment-form: wasm not ready — validate_shipment_gate missing');
  }
  const request = {
    publish,
    mbl: state.mbl || '',
    hbl: state.hbl || '',
    job_file_no: state.job_file_no || '',
    customer: state.customer || '',
    sales_rep: state.sales_rep || '',
    direction: state.direction || '',
    product: state.product || '',
    mode: state.mode || '',
    closing_si_bad_input: !!state.closing_si_bad_input,
    closing_cy_bad_input: !!state.closing_cy_bad_input,
    book_currency: state.book_currency || '',
    lines: state.lines || [],
    commission_lines: state.commission_lines || [],
  };
  const reply = mod.validate_shipment_gate(JSON.stringify(request));

  // `reply.errors` are i18n key SUFFIXES under sales_new.validation. — the gate decides WHICH
  // rules fired, this only renders them (same convention as the FX-deviation confirm dialog).
  const errs = reply.errors.map((key) => t(`sales_new.validation.${key}`));
  if (reply.vnd_mismatch) {
    const { expected, actual, delta } = reply.vnd_mismatch;
    errs.push(t('sales_new.validation.vnd_invariant')
      .replace('{expected}', expected).replace('{actual}', actual).replace('{delta}', delta));
  }
  return errs;
}
