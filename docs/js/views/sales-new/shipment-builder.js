// shipment-builder.js — builds canonical Shipment object from 4-section form state
// Extracted from submit-orchestrator to enable unit testing without i18n deps (AC-08)

import { resolveShipmentState } from '../../util/shipment-state-resolver.js';
import { todayLocal } from '../../util/today-local.js';
import { pnlLineId } from '../../util/pnl-line-id.js';

const SOURCE_ORIGIN  = 'form-entry';
const PARSER_ID      = 'form-v1';
const PARSER_VERSION = '1';

// F-18-11: brand-new shipment starts here — matches the Rust entity's own default
// (Shipment::from_command → state: ShipmentState::Created), the most conservative
// "just captured, not yet booked" reading.
export const DEFAULT_INITIAL_STATE = 'Created';

/**
 * buildShipment — maps collected form state to the canonical Shipment repo record.
 * Does NOT embed commission data (PM OQ-c: no double-storage — AC-08).
 * @param {object} state      output of collectFormState()
 * @param {string} ref        generated shipment ref
 * @param {string} salesRepId current user id
 * @param {object} opts       opts.stateAliasRows — shipment-states registry rows (F-18-11)
 * @returns {object}
 * @throws {Error} when state.state resolves to no registered canonical code or alias (F-18-11 AC-01/02)
 */
export function buildShipment(state, ref, salesRepId, opts = {}) {
  const publishState = opts.publishState || 'published';

  // F-18-11: choke point — every shipment write (create/edit/batch) resolves through here.
  // status:'Open' literal retired (Q4); state is now the sole, real, canonical lifecycle field.
  const rawState  = state.state ?? DEFAULT_INITIAL_STATE;
  const resolvedState = resolveShipmentState(rawState, opts.stateAliasRows || []);
  if (!resolvedState) throw new Error(`Invalid shipment state: ${rawState}`);

  return {
    shipment_ref:          ref,
    quote_id:              state.quote_id || null,   // F-30-01: nullable back-ref to source quotation
    sales_rep_id:          salesRepId || null,
    state:                 resolvedState,
    publish_state:         publishState,
    open_date:             todayLocal(),
    transaction_date:      todayLocal(),
    job_file_no:           state.job_file_no           || null,
    customer:              state.customer               || null,
    shipper:               state.shipper               || null,
    consignee:             state.consignee             || null,
    notify_party:          state.notify_party          || null,
    mbl:                   state.mbl                   || null,
    // F-32-01: HBL present ⇒ HBL No = D/O No = Job No (auto-fill supersedes any typed value)
    job_no:                opts.jobNo                  || null,
    do_no:                 (state.has_hbl && opts.jobNo) ? opts.jobNo : null,
    hbl:                   state.has_hbl ? (opts.jobNo || null) : (state.hbl || null),
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
    // E-37: line_id is the join key between the two records a shipment is stored as (the buy side
    // travels with the envelope into _shared/shipments, the sell side stays in the rep's fork).
    // Same scheme as the materialized `pnl_line` rows, so one shipment has one line vocabulary.
    // shipment_split REFUSES a line without it rather than producing a half that cannot rejoin.
    pnl_lines:             state.lines
      ? state.lines.map((ln, i) => ({
          line_id:             ln.line_id || pnlLineId(ref, i + 1),
          subtype:             ln.kind || 'MiscOperatingExpense',
          description:         ln.desc,
          buying_qty:          ln.buy_qty,
          buying_unit:         ln.buy_unit,
          buying_amount:       ln.buy_amt,
          buying_currency:     ln.buy_currency  || null,
          buying_fx_rate:      ln.buy_fx_rate   || null,
          buying_fx_date:      ln.buy_fx_date   || null,
          buying_vnd_pay:      ln.vnd_pay,
          selling_qty:         ln.sell_qty,
          selling_unit:        ln.sell_unit,
          selling_amount:      ln.sell_amt,
          selling_currency:    ln.sell_currency || null,
          selling_fx_rate:     ln.sell_fx_rate  || null,
          selling_fx_date:     ln.sell_fx_date  || null,
          selling_vnd_collect: ln.vnd_collect,
          pol_pod_side:        ln.pol_pod_side,
        }))
      // The import path (pnl-commit-orchestrator) hands lines through already shaped; they still
      // need the join key, and stamping it here keeps ONE place that decides a line's identity.
      : (state.pnl_lines || []).map((ln, i) => ({ line_id: ln.line_id || pnlLineId(ref, i + 1), ...ln })),
    sales_share_pct_override: state.sales_share_pct_override ?? null,
    // AC-08: commission rows stored in shipment payload (F-15-59)
    commission_lines: (state.commission_lines || []).map((l) => ({
      kind:          l.kind          || 'Line',
      amount_fx:     l.amount_fx     || 0,
      currency:      l.currency      || 'USD',
      fx_rate:       l.fx_rate       || null,
      fx_date:       l.fx_date       || null,
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
      // F-29-04 VR-03 AC-06: fx-deviation confirmation audit trail
      fx_overrides:   state._fx_overrides || [],
    },
  };
}
