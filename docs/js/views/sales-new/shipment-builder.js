// shipment-builder.js — builds canonical Shipment object from 4-section form state
// Extracted from submit-orchestrator to enable unit testing without i18n deps (AC-08)

const SOURCE_ORIGIN  = 'form-entry';
const PARSER_ID      = 'form-v1';
const PARSER_VERSION = '1';

/**
 * buildShipment — maps collected form state to the canonical Shipment repo record.
 * Does NOT embed commission data (PM OQ-c: no double-storage — AC-08).
 * @param {object} state      output of collectFormState()
 * @param {string} ref        generated shipment ref
 * @param {string} salesRepId current user id
 * @returns {object}
 */
export function buildShipment(state, ref, salesRepId, opts = {}) {
  const publishState = opts.publishState || 'published';
  return {
    shipment_ref:          ref,
    sales_rep_id:          salesRepId || null,
    status:                'Open',
    publish_state:         publishState,
    open_date:             new Date().toISOString().slice(0, 10),
    transaction_date:      new Date().toISOString().slice(0, 10),
    job_file_no:           state.job_file_no           || null,
    customer:              state.customer               || null,
    shipper:               state.shipper               || null,
    consignee:             state.consignee             || null,
    notify_party:          state.notify_party          || null,
    mbl:                   state.mbl                   || null,
    hbl:                   state.hbl                   || null,
    doc_type:              state.doc_type              || null,
    mode:                  (state.mode || '').toLowerCase() || null,
    direction:             state.direction             || null,
    container_spec:        state.container_spec        || state.volume || null,
    // air fields
    airport_origin:        state.origin_iata           || null,
    airport_dest:          state.dest_iata             || null,
    chargeable_kg:         parseFloat(state.chargeable_kg)    || null,
    weight_actual_kg:      parseFloat(state.weight_actual_kg) || null,
    pieces:                parseInt(state.pieces, 10)         || null,
    uld_type:              state.uld_type              || null,
    flight_no:             state.flight_no             || null,
    pol:                   state.pol                   || null,
    pod:                   state.pod                   || null,
    etd:                   state.etd                   || null,
    eta:                   state.eta                   || null,
    carrier:               state.carrier               || null,
    vessel:                state.vessel                || null,
    handling_agent:        state.handling_agent        || null,
    freight_terms:         state.freight_terms         || null,
    commodity_description: state.commodity             || null,
    job_currency:          state.currency              || 'USD',
    roe_buying:            parseFloat(state.roe_buying) || null,
    roe_debit:             parseFloat(state.roe_debit)  || null,
    pnl_lines:             state.lines
      ? state.lines.map((ln) => ({
          subtype:             ln.kind || 'MiscOperatingExpense',
          description:         ln.desc,
          buying_qty:          ln.buy_qty,
          buying_unit:         ln.buy_unit,
          buying_amount:       ln.buy_amt,
          buying_vnd_pay:      ln.vnd_pay,
          selling_qty:         ln.sell_qty,
          selling_unit:        ln.sell_unit,
          selling_amount:      ln.sell_amt,
          selling_vnd_collect: ln.vnd_collect,
          pol_pod_side:        ln.pol_pod_side,
        }))
      : (state.pnl_lines || []),
    sales_share_pct_override: state.sales_share_pct_override ?? null,
    // AC-08: commission rows stored in shipment payload (F-15-59)
    commission_lines: (state.commission_lines || []).map((l) => ({
      kind:          l.kind          || 'Line',
      amount_fx:     l.amount_fx     || 0,
      currency:      l.currency      || 'USD',
      fx_rate:       l.fx_rate       || 1,
      bank_fee:      l.bank_fee      || 0,
      tncn_pct:      l.tncn_pct      || 0,
      tncn_amount:   l.tncn_amount   || 0,
      net_after_tax: l.net_after_tax || 0,
      tncn_manual:   l.tncn_manual   || false,
    })),
    provenance: {
      source_origin:  SOURCE_ORIGIN,
      parser_id:      PARSER_ID,
      parser_version: PARSER_VERSION,
      parsed_at:      new Date().toISOString(),
    },
  };
}
