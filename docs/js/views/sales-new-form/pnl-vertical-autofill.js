// pnl-vertical-autofill.js — vertical PNL DTO ↔ 4-section form draft converters (AC-05, AC-06)

import { currentLocale }   from '../../i18n/index.js';
import { kindI18nLabel }   from '../../util/kind-i18n.js';
import { KIND_LIST, classifyKind } from './section-lines.js';

export const PNL_VERTICAL_AUTOFILL_KEY = 'ni_autofill_pending';

// Mirrors Rust LineCategory::category_for (src/boundary/pnl_line.rs) — 8 Revenue variants;
// anything else out of the 18 LineSubType values is Expense. Revenue → vnd_collect, Expense → vnd_pay.
const PNL_REVENUE_SUBTYPES = [
  'FreightRevenue', 'SurchargeRevenue', 'HandlingFeeRevenue', 'CustomsRevenue',
  'DocumentationRevenue', 'InsuranceRevenue', 'RebateReceived', 'MiscOperatingRevenue',
];

// AC-09: prefer shipment.commission_lines; fall back to old CR1 entry as 1 Line row
function _resolveCommissionLines(shipment, ce) {
  if (shipment.commission_lines?.length > 0) return shipment.commission_lines;
  if (ce?.gross_amount > 0) {
    return [{
      kind:          'Line',
      amount_fx:     ce.gross_amount          || 0,
      currency:      'VND',
      fx_rate:       ce.fx_rate_commission    || 1,
      bank_fee:      ce.bank_charge           || 0,
      tncn_pct:      15,
      tncn_amount:   ce.personal_tax_15       || 0,
      net_after_tax: ce.net_amount            || 0,
      tncn_manual:   ce.tax15_manual_override || false,
    }];
  }
  return [];
}

function _str(v) { return Array.isArray(v) ? (v[0] || '') : (v || ''); }

/**
 * niDtoToDraft — maps { shipment, commission_entries } returned by import_legacy_pnl_wasm
 * to the draft shape consumed by renderForm (AC-05).
 * @param {{ shipment: object, commission_entries: Array }} pair
 * @returns {object} draft
 */
export function niDtoToDraft(pair) {
  const s = pair.shipment || {};
  const ce = (pair.commission_entries || []).find((e) => e.kind === 'CustomerRebate') || {};
  const mblDoc = (s.documents || []).find((d) => d.kind === 'Mbl');
  const hblDoc = (s.documents || []).find((d) => d.kind === 'Hbl');

  return {
    _autofilled: true,
    mbl:       mblDoc?.number        || '',
    hbl:       hblDoc?.number        || '',
    customer:  _str(s.customer),
    shipper:   _str(s.shipper),
    consignee: _str(s.consignee),
    vessel:    s.vessel              || '',
    carrier:   s.carrier             || '',
    etd:       s.etd                 || '',
    eta:       s.eta                 || '',
    pol:       s.pol                 || '',
    pod:       s.pod                 || '',
    roe_selling: s.fx_rate_at_txn?.rate || '',
    currency:  s.job_currency        || 'USD',
    lines: (s.pnl_lines || []).map((ln) => {
      const rawSubtype   = ln.subtype || '';
      const kindInList   = rawSubtype ? KIND_LIST.includes(rawSubtype) : false;
      // AC-06: use KIND_LIST-compatible kind; use i18n label as description (rawDesc discarded)
      const effectiveKind = kindInList ? rawSubtype : classifyKind(ln.description || '');
      // D-01: real WASM DTO carries one amount pair per line (amount / amount_in_job_ccy),
      // no buying_*/selling_* split — side is derived from subtype category instead.
      const isRevenue = PNL_REVENUE_SUBTYPES.includes(rawSubtype);
      const qty       = Number(ln.quantity)              || 0;
      const nativeAmt = Number(ln.amount?.amount)         || 0;
      const vndAmt    = Number(ln.amount_in_job_ccy?.amount) || 0;
      // F-29-01 §5: to_canonical.rs::make_line always emits Currency::Vnd, fx_rate=1 —
      // carry that forward so a freshly-imported row satisfies the AC-05 save gate untouched.
      const importFxDate = s.etd || new Date().toISOString().slice(0, 10);
      return {
        desc:        kindI18nLabel(effectiveKind, currentLocale()),
        kind:        effectiveKind,
        buy_qty:     isRevenue ? 0 : qty,
        buy_unit:    '',
        buy_amt:     isRevenue ? 0 : nativeAmt,
        buy_currency: 'VND',
        buy_fx_rate:  1,
        buy_fx_date:  importFxDate,
        vnd_pay:     isRevenue ? 0 : vndAmt,
        sell_qty:    isRevenue ? qty : 0,
        sell_unit:   '',
        sell_amt:    isRevenue ? nativeAmt : 0,
        sell_currency: 'VND',
        sell_fx_rate:  1,
        sell_fx_date:  importFxDate,
        vnd_collect: isRevenue ? vndAmt : 0,
        pol_pod_side: ln.pol_pod_side        || 'N/A',
      };
    }),
    // AC-09: NI parse → 1 Line row back-compat
    commission_lines: ce?.gross_amount > 0 ? [{
      kind:          'Line',
      amount_fx:     ce.gross_amount || 0,
      currency:      'VND',
      fx_rate:       1,
      bank_fee:      0,
      tncn_pct:      15,
      tncn_amount:   ce.tax_amount   || 0,
      net_after_tax: ce.net_amount   || 0,
      tncn_manual:   false,
    }] : [],
  };
}

/**
 * shipmentToDraft — maps a persisted shipment + commission_entry back to the draft
 * shape consumed by renderForm (AC-06 reload path).
 * @param {object}      shipment  repo record
 * @param {object|null} ce        commission_entry of kind CustomerRebate (${ref}-CR1)
 * @returns {object} draft
 */
export function shipmentToDraft(shipment, ce) {
  const s = shipment || {};
  return {
    mbl:          s.mbl                   || '',
    hbl:          s.hbl                   || '',
    job_file_no:  s.job_file_no           || '',
    product:      s.commodity_description || '',
    sales_rep:    s.sales_rep_id          || '',
    customer:     s.customer              || '',
    shipper:      s.shipper               || '',
    consignee:    s.consignee             || '',
    vessel:       s.vessel                || '',
    carrier:      s.carrier               || '',
    etd:          s.etd                   || '',
    eta:          s.eta                   || '',
    pol:          s.pol                   || '',
    pod:          s.pod                   || '',
    volume:       s.container_spec        || '',
    roe_buying:   s.roe_buying            ?? '',
    roe_selling:  s.roe_debit             ?? '',
    currency:     s.job_currency          || 'USD',
    // F-29-01 AC-06: doc date default for legacy fx_date fallback below AND the form's
    // new-row default — persisted date, not "today", so re-opening an old draft doesn't
    // silently shift its fx_date forward.
    transaction_date: s.transaction_date  || '',
    lines: (s.pnl_lines || []).map((ln) => _lineToDraft(ln, s)),
    // AC-09: back-compat shim — new commission_lines > old CR1 entry > empty
    commission_lines: _resolveCommissionLines(s, ce),
    sales_share_pct_override: s.sales_share_pct_override ?? null,
    publish_state: s.publish_state || 'draft',
  };
}

// F-29-01 §4: read-time fallback for pre-migration lines missing the new fields — NOT a
// persisted backfill (that's F-29-05, MG-01), just keeps old shipments openable without
// every legacy line instantly tripping the AC-05 save gate.
function _lineToDraft(ln, s) {
  const buyCurrency  = ln.buying_currency  || s.job_currency || 'VND';
  const sellCurrency = ln.selling_currency || s.job_currency || 'VND';
  return {
    desc:        ln.description          || '',
    kind:        ln.subtype              || '',
    buy_qty:     ln.buying_qty           || 0,
    buy_unit:    ln.buying_unit          || '',
    buy_amt:     ln.buying_amount        || 0,
    buy_currency:  buyCurrency,
    buy_fx_rate:   ln.buying_fx_rate  || (buyCurrency === 'VND'  ? 1 : (s.roe_buying || '')),
    buy_fx_date:   ln.buying_fx_date  || '',
    vnd_pay:     ln.buying_vnd_pay       || 0,
    sell_qty:    ln.selling_qty          || 0,
    sell_unit:   ln.selling_unit         || '',
    sell_amt:    ln.selling_amount       || 0,
    sell_currency: sellCurrency,
    sell_fx_rate:  ln.selling_fx_rate || (sellCurrency === 'VND' ? 1 : (s.roe_debit  || '')),
    sell_fx_date:  ln.selling_fx_date || '',
    vnd_collect: ln.selling_vnd_collect  || 0,
    pol_pod_side: ln.pol_pod_side        || 'N/A',
  };
}
