// compose-ui/data-sales.js — binds the sales ports to the wasm freight_app exports.
//
// Sibling of composeData(); split out because the sales lane owns it end to end. Nothing here
// decides anything: it renames fields across the boundary and turns a refusal into a throw, which
// is the ui's convention, not a rule.

import { bindSalesReads } from '../../implementations/ui/core_abstractions/ports/data/sales-reads.js';
import { bindShipmentSubmit } from '../../implementations/ui/core_abstractions/ports/data/shipment-submit.js';

/// `deps` = { wasm } — the freight_app export surface, the same object composeData() receives.
export function bindSalesData({ wasm }) {
  const rows = (reply) => {
    if (!reply.ok) throw new Error(reply.error || 'the read failed');
    return reply.rows;
  };
  const record = (reply) => {
    if (!reply.ok) throw new Error(reply.error || 'the read failed');
    return reply.record;
  };

  bindSalesReads({
    listCustomerMasters: async () => rows(await wasm.sales_customer_masters({})),
    listCarrierMasters:  async () => rows(await wasm.sales_carrier_masters({})),
    listWeightUnitCodes: async () => (await wasm.sales_weight_unit_codes({})).codes,
    listContainerTypeOptions: async () => rows(await wasm.sales_container_type_options({})),
    getRepProfile: async (salesRepId) =>
      record(await wasm.sales_rep_profile({ sales_rep_id: salesRepId ?? null })),
    getCommissionRuleAssignment: async (salesRepId) =>
      record(await wasm.sales_commission_rule_assignment({ sales_rep_id: salesRepId ?? null })),
    getShipmentCommissionSnapshot: async (shipmentRef) =>
      record(await wasm.sales_shipment_commission_snapshot({ id: shipmentRef ?? null })),
    listCommissionEntriesFor: async (shipmentRef) =>
      rows(await wasm.sales_commission_entries_for({ id: shipmentRef ?? null })),
    salesShareTotal: async (shipmentRefs) =>
      (await wasm.sales_share_total({ shipment_refs: shipmentRefs || [] })).total,
    listPnlLines:         async () => rows(await wasm.sales_pnl_lines({})),
    listPnlLinesFor:      async (shipmentRef) => rows(await wasm.sales_pnl_lines_for({ id: shipmentRef ?? null })),
    listQuotations:       async () => rows(await wasm.sales_quotations({})),
    getQuotation:         async (id) => record(await wasm.sales_quotation({ id: id ?? null })),
    listBillingRecords:   async () => rows(await wasm.sales_billing_records({})),
    listDemdetInstances:  async () => rows(await wasm.sales_demdet_instances({})),
    listAirRateCards:     async () => rows(await wasm.sales_air_rate_cards({})),
    readDocumentSources: async () => {
      const reply = await wasm.sales_document_sources({});
      if (!reply.ok) throw new Error('the read failed');
      return {
        documents:            reply.documents,
        shippingInstructions: reply.shipping_instructions,
        arrivalNotices:       reply.arrival_notices,
        releaseOrders:        reply.release_orders,
      };
    },
    customerForNote: async (nameOrId) =>
      record(await wasm.sales_customer_for_note({ name: nameOrId ?? null })),
    createCustomerDraft: async (name) => {
      const reply = await wasm.sales_create_customer_draft({ name: name ?? null });
      if (!reply.ok) throw new Error(reply.error || 'the customer could not be created');
      return { created: reply.created, record: reply.record };
    },
  });

  bindShipmentSubmit({
    // The direction rule is wasm's; the mint itself is the store's own repo method, which is why
    // this is the one call here that still takes `repo`.
    mintShipmentRef: async (repo, direction, salesRepId) => {
      if (!repo?.mint_shipment_ref) throw new Error('WASM repo not ready');
      const { prefix } = wasm.sales_ref_prefix({ direction: direction ?? null });
      return await repo.mint_shipment_ref(prefix, String(salesRepId || ''));
    },
    resolveJobNo: async ({ formJobNo = null, priorJobNo = null, ownRef = null, salesRepId = null } = {}) =>
      (await wasm.sales_resolve_job_no({
        form_job_no: formJobNo, prior_job_no: priorJobNo, own_ref: ownRef, sales_rep_id: salesRepId,
      })).job_no,
    // A refusal here THROWS, the way putShipment does: the heal re-saves the record, and a save the
    // period gate or the licence refused is the same failure whichever call made it.
    healJobNoCollision: async (shipment, salesRepId) => {
      const reply = await wasm.sales_heal_job_no({ shipment, sales_rep_id: salesRepId ?? null });
      if (!reply.ok) throw new Error(reply.error || 'the job number could not be healed');
      return reply.shipment;
    },
    nextLedgerVersion: (priorVersion = null) =>
      wasm.sales_ledger_version({ prior_version: priorVersion == null ? null : Number(priorVersion) }).version,
    resolvePublishState: (priorPublishState, publish) => {
      const reply = wasm.sales_publish_state({ prior_publish_state: priorPublishState ?? null, publish });
      if (!reply.ok) throw new Error(reply.error || 'the publish state was refused');
      return reply.publish_state;
    },
    submissionErrorKeys: (state) => wasm.sales_validate_submission({ state: state || {} }).error_keys,
    writeSideRecords: async ({
      shipmentRef, commissionLines = [], pnlLines = [], ledgerVersion, occurredAt, createdBy = null, freshRef = false,
    }) => await wasm.sales_write_side_records({
      shipment_ref: shipmentRef,
      commission_lines: commissionLines,
      pnl_lines: pnlLines,
      ledger_version: ledgerVersion,
      occurred_at: occurredAt,
      created_by: createdBy,
      fresh_ref: freshRef,
    }),
  });
}
