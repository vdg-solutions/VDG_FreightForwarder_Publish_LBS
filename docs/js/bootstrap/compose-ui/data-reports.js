// compose-ui/data-reports.js — binds the ui's report-read port to the wasm freight_app exports.
//
// Split out of data.js because it is a different surface: data.js binds the shipment WRITE path
// (two records, a gate, a read receipt), this binds the manager report READS. One export per
// report, none of them naming a collection.
//
// No `repo` argument anywhere: these are new signatures, and the Rust use-cases hold the store
// port themselves (bootstrap/platform). Nothing here decides anything — the reply already IS the
// row set the screen renders; this file only unwraps it and renames the fields to the ui's
// camelCase vocabulary.
import { bindReportReads as bindPort } from '../../implementations/ui/core_abstractions/ports/data/report-reads.js';

/// The whole audit trail, for the callers that page through it themselves. `limit: 0` is "no
/// ceiling" on the Rust side.
const NO_LIMIT = 0;

/// A reply carries its failure inside it; the ui contract is a thrown error, so this is where the
/// two meet. A failed read must never reach a screen as an empty table — an empty AR grid and an
/// unreachable one look identical, and only one of them means nobody owes us anything.
function raise(reply) {
  if (!reply?.ok) throw new Error(reply?.error || 'the read failed');
  return reply;
}

function suggestion(row) {
  return {
    key:       row.key,
    pattern:   row.pattern,
    count:     row.count,
    salesPct:  row.sales_pct,
    recipient: row.recipient,
    kind:      row.kind,
  };
}

export function bindReportReads(wasm) {
  bindPort({
    // ── finance ──────────────────────────────────────────────────────────────
    cashFlowInputs: async () => {
      const reply = raise(await wasm.data_cash_flow_inputs({}));
      return { receivables: reply.receivables, costLines: reply.cost_lines, shipments: reply.shipments };
    },
    receivablesLedger: async () => raise(await wasm.data_receivables_ledger({})).rows,
    markReceivableFollowedUp: async (customer) => {
      raise(await wasm.data_mark_receivable_followed_up({ customer, note: null }));
    },
    addReceivableNote: async (customer, text) => {
      raise(await wasm.data_add_receivable_note({ customer, note: text }));
    },
    pnlReportInputs: async () => {
      const reply = raise(await wasm.data_pnl_report_inputs({}));
      return { shipments: reply.shipments, pnlLines: reply.pnl_lines };
    },
    periodCloseRecord: async (period) => raise(await wasm.data_period_close_record({ period })).record,

    // ── commission ───────────────────────────────────────────────────────────
    commissionBasisLines:    async () => raise(await wasm.data_commission_basis_lines({})).rows,
    settledCommissionPayouts: async () => raise(await wasm.data_commission_payouts({})).rows,
    commissionRuleEditorInputs: async () => {
      const reply = raise(await wasm.data_commission_rule_editor_inputs({}));
      return { users: reply.users, rules: reply.rules, entryAuthors: reply.entry_authors };
    },
    commissionRuleSuggestions: async () =>
      raise(await wasm.data_commission_rule_suggestions({})).suggestions.map(suggestion),
    promoteCommissionSuggestion: async ({ salesPct, recipient, kind = null, priority }) => {
      raise(await wasm.data_promote_commission_suggestion({
        sales_pct: salesPct, recipient, kind, priority,
      }));
    },
    saveCommissionRule: async (ruleId, rule) => {
      raise(await wasm.data_save_commission_rule({ rule_id: ruleId, rule }));
    },
    deleteCommissionRule: async (ruleId) => {
      raise(await wasm.data_delete_commission_rule({ rule_id: ruleId }));
    },

    // ── operations ───────────────────────────────────────────────────────────
    auditTrail: async (offset = 0, limit = NO_LIMIT) =>
      raise(await wasm.data_audit_trail({ offset, limit })).rows,
    pendingApprovals:    async () => raise(await wasm.data_pending_approvals({})).rows,
    approvalDecisionLog: async () => raise(await wasm.data_approval_decision_log({})).rows,
    exceptionCaseload:   async () => raise(await wasm.data_exception_caseload({})).rows,
    pipelineShipments:   async () => raise(await wasm.data_pipeline_shipments({})).rows,
    manifestFilings:     async () => raise(await wasm.data_manifest_filings({})).rows,
    salesProfiles:       async () => raise(await wasm.data_sales_profiles({})).rows,
    customer360Inputs: async () => {
      const reply = raise(await wasm.data_customer360_inputs({}));
      return {
        customers:   reply.customers,
        receivables: reply.receivables,
        exceptions:  reply.exceptions,
        quotations:  reply.quotations,
      };
    },
    /// -> the customer record AS WRITTEN, so the notes tab repaints from storage.
    appendCustomerNote: async (customerId, text) =>
      raise(await wasm.data_append_customer_note({ customer_id: customerId, note: text })).record,
    cassReconciliationInputs: async () => {
      const reply = raise(await wasm.data_cass_reconciliation_inputs({}));
      return { awbs: reply.awbs, airRates: reply.air_rates, carriers: reply.carriers };
    },
    suppressDuplicatePair: async (aId, bId) => {
      raise(await wasm.data_suppress_duplicate_pair({ a: aId, b: bId }));
    },
  });
}
