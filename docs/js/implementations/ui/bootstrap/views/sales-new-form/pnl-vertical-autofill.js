// pnl-vertical-autofill.js — shipment↔4-section form draft converters (AC-06)

// AC-09: prefer shipment.commission_lines; fall back to old CR1 entry as 1 Line row
import { todayLocal } from '../../../../kernel/core_abstractions/util/today-local.js';

function _resolveCommissionLines(shipment, ce) {
  if (shipment.commission_lines?.length > 0) return shipment.commission_lines;
  if (ce?.gross_amount > 0) {
    // F-29-02 §5: same importFxDate pattern the legacy vertical-import path used (etd ||
    // today) — VND-locked shim still gets a sane fx_date.
    const importFxDate = shipment.etd || todayLocal();
    return [{
      kind:          'Line',
      amount_fx:     ce.gross_amount          || 0,
      currency:      'VND',
      fx_rate:       ce.fx_rate_commission    || 1,
      fx_date:       importFxDate,
      bank_fee:      ce.bank_charge           || 0,
      tncn_pct:      15,
      tncn_amount:   ce.personal_tax_15       || 0,
      net_after_tax: ce.net_amount            || 0,
      tncn_manual:   ce.tax15_manual_override || false,
    }];
  }
  return [];
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
    quote_id:     s.quote_id              ?? null,
    mbl:          s.mbl                   || '',
    hbl:          s.hbl                   || '',
    // F-32-01: carry the persisted Job No / HBL-linkage flag through the edit round-trip —
    // renderForm only generates a fresh job_no when the draft has none (create-mount path).
    job_no:       s.job_no                || '',
    has_hbl:      Boolean(s.do_no),
    job_file_no:  s.job_file_no           || '',
    // E-39: product is its own persisted field now; commodity_description only feeds the free-text
    // commodity input. Legacy records (no product) fall back to the old commodity read so the
    // select is not silently blanked on old jobs whose commodity happened to hold an option value.
    product:      s.product               || s.commodity_description || '',
    commodity:    s.commodity_description || '',
    // E-39: carry the LIFECYCLE STATE through the edit round-trip — phase timeline + phase screens
    // open at the phase the job is actually in, not at Created.
    state:        s.state                 || '',
    booking_no:         s.booking_no         || '',
    container_qty:      s.container_qty      ?? '',
    reefer_temp:        s.reefer_temp        || '',
    reefer_vent:        s.reefer_vent        || '',
    closing_si:         s.closing_si         || '',
    closing_cy:         s.closing_cy         || '',
    empty_pickup_depot: s.empty_pickup_depot || '',
    full_return_depot:  s.full_return_depot  || '',
    place_of_receipt:   s.place_of_receipt   || '',
    place_of_delivery:  s.place_of_delivery  || '',
    notify_party:       s.notify_party       || '',
    for_delivery:       s.for_delivery       || '',
    seal_no:            s.seal_no            || '',
    freight_terms:      s.freight_terms      || '',
    doc_type:           s.doc_type           || '',
    volume_cbm:         s.volume_cbm         ?? '',
    atd:                s.atd                || '',
    // F-41-03: phase evidence — an edit that dropped these would untick the timeline
    ata:                s.ata                || '',
    customs_cleared_at: s.customs_cleared_at || '',
    haulage_signed_at:  s.haulage_signed_at  || '',
    do_released_at:     s.do_released_at     || '',
    cargo_released_at:  s.cargo_released_at  || '',
    billing_paid_at:    s.billing_paid_at    || '',
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
    cargo_items: s.cargo_items || [],
    containers: s.containers || [],
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
    buy_fx_rate:   ln.buying_fx_rate  || (buyCurrency === 'VND'  ? 1 : ''),
    buy_fx_date:   ln.buying_fx_date  || '',
    vnd_pay:     ln.buying_vnd_pay       || 0,
    sell_qty:    ln.selling_qty          || 0,
    sell_unit:   ln.selling_unit         || '',
    sell_amt:    ln.selling_amount       || 0,
    sell_currency: sellCurrency,
    sell_fx_rate:  ln.selling_fx_rate || (sellCurrency === 'VND' ? 1 : ''),
    sell_fx_date:  ln.selling_fx_date || '',
    vnd_collect: ln.selling_vnd_collect  || 0,
    pol_pod_side: ln.pol_pod_side        || 'N/A',
  };
}
