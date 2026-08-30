// compose-ui/flows.js — binds the ui's flows ports to the wasm freight_app exports.
// The delegates keep the names and signatures the views already call; the `repo` and `driveApi`
// arguments they still pass are ignored, because the use-case reaches storage through the
// platform now. Rules live behind `wasm.flows_*` — nothing here decides anything.
import { bindSalesRepDerivation } from '../../implementations/ui/core_abstractions/ports/flows/sales-rep-derivation.js';
import { bindAirRateCalculator } from '../../implementations/ui/core_abstractions/ports/flows/air-rate-calculator.js';
import { bindPnlGate } from '../../implementations/ui/core_abstractions/ports/flows/pnl-gate.js';
import { bindQuoteTotals } from '../../implementations/ui/core_abstractions/ports/flows/quote-totals.js';
import { bindNoteLines } from '../../implementations/ui/core_abstractions/ports/flows/note-lines.js';
import { bindFsmIngest } from '../../implementations/ui/core_abstractions/ports/flows/fsm-ingest.js';
import { bindFsmAutoAdvance } from '../../implementations/ui/core_abstractions/ports/flows/fsm-auto-advance.js';
import { bindJobNoGen } from '../../implementations/ui/core_abstractions/ports/flows/job-no-gen.js';
import { bindRepCodeRegistry } from '../../implementations/ui/core_abstractions/ports/flows/rep-code-registry.js';
import { bindSalesRegistry } from '../../implementations/ui/core_abstractions/ports/flows/sales-registry.js';
import { bindSalesAnalyticsCompute } from '../../implementations/ui/core_abstractions/ports/flows/sales-analytics-compute.js';
import { bindShipmentStateAliases } from '../../implementations/ui/core_abstractions/ports/flows/shipment-state-aliases.js';
import { bindShipmentStateMigrator } from '../../implementations/ui/core_abstractions/ports/flows/shipment-state-migrator.js';
import { bindShipmentVoidDelete } from '../../implementations/ui/core_abstractions/ports/flows/shipment-void-delete.js';
import { bindQuoteOrchestrator } from '../../implementations/ui/core_abstractions/ports/flows/quote-orchestrator.js';
import { bindQuoteVoidDelete } from '../../implementations/ui/core_abstractions/ports/flows/quote-void-delete.js';
import { bindApprovalOrchestrator } from '../../implementations/ui/core_abstractions/ports/flows/approval-orchestrator.js';
import { composeFlowsAdmin } from './flows-admin.js';
import { t } from '../../implementations/kernel/core_abstractions/i18n/index.js';
import { listUsers } from '../../implementations/storage/core_abstractions/user-directory.js';
import { ROLE_SALES_REP } from '../../implementations/kernel/core_abstractions/roles.js';

const ENTITY_CHANGED_EVENT = 'vdg:entity-changed';
const KIND_USER            = 'user';
const REASON_CANCELLED     = 'cancelled';
const EMPTY                = {};

export function composeFlows(wasm) {
  bindSalesRepDerivation({
    deriveSalesRep: ({ routeRep = null, draftRep = null, customerRep = null, selfRep = null } = {}) =>
      wasm.flows_derive_sales_rep({ route_rep: routeRep, draft_rep: draftRep, customer_rep: customerRep, self_rep: selfRep }).rep,
    selfRepCandidate: (roles, token) => wasm.flows_self_rep_candidate({ roles: roles || [], token: token ?? null }).rep,
    customerRepFor: (customerName, customers) =>
      wasm.flows_customer_rep({ customer_name: customerName ?? null, customers: customers || [] }).rep,
  });

  bindAirRateCalculator({
    computeChargeableKg: (actual, l, w, h) => wasm.flows_chargeable_kg({ actual, l, w, h }).chargeable_kg,
    computeFreight: (actual, l, w, h, breaks) => {
      const r = wasm.flows_air_calc({ actual, l, w, h, breaks: breaks || [] });
      return r.matched ? r.freight_total : null;
    },
    calcResult: (actual, l, w, h, breaks) => {
      const r = wasm.flows_air_calc({ actual, l, w, h, breaks: breaks || [] });
      return r.matched ? { chargeableKg: r.chargeable_kg, tier: r.tier, freightTotal: r.freight_total } : null;
    },
  });

  bindPnlGate({
    lineVnd: (amount, currency, fxRate, bookCurrency) => wasm.flows_pnl_line_vnd({
      amount: Number(amount) || 0, currency: currency || '', fx_rate: Number(fxRate) || 0, book_currency: bookCurrency || '',
    }).vnd,
    vndInvariant: (lines, commissionNetAfterTax, bookCurrency) => {
      const r = wasm.flows_pnl_vnd_invariant({
        lines: lines || [], commission_net_after_tax: commissionNetAfterTax || [], book_currency: bookCurrency || '',
      });
      return { match: r.match, expected: r.expected, actual: r.actual, delta: r.delta };
    },
    fxDeviation: (currency, fxRate, referenceRate) => {
      const r = wasm.flows_pnl_fx_deviation({
        currency: currency || '', fx_rate: Number(fxRate) || 0, reference_rate: referenceRate == null ? null : Number(referenceRate),
      });
      return { flagged: r.flagged, reason: r.reason, deviation: r.deviation, threshold: r.threshold };
    },
  });

  bindQuoteTotals({
    compute: (lines, commissionNetAfterTax) => {
      const r = wasm.flows_quote_totals({
        lines: (lines || []).map((l) => ({
          vnd_pay: l.vnd_pay || 0, vnd_collect: l.vnd_collect || 0, pol_pod_side: l.pol_pod_side || '',
        })),
        commission_net_after_tax: commissionNetAfterTax || [],
      });
      return {
        sumReceipt: r.sum_receipt, sumPayment: r.sum_payment, commissionTotal: r.commission_total,
        polReceiptSum: r.pol_receipt_sum, podReceiptSum: r.pod_receipt_sum,
        polPaymentSum: r.pol_payment_sum, podPaymentSum: r.pod_payment_sum,
      };
    },
  });

  bindNoteLines({
    derive: (pnlLineRows, noteType) => wasm.flows_note_lines({ lines: pnlLineRows || [], note_type: noteType || '' }),
  });

  bindFsmIngest({
    registerFsmEntity: (ref, state) => wasm.flows_register_entity({ entity_id: ref ?? null, state: state ?? null }),
    rehydrateFsmStates: () => wasm.flows_rehydrate_fsm(EMPTY),
    persistAdvancedState: (_repo, ref, state) =>
      wasm.flows_persist_advanced_state({ shipment_ref: ref ?? null, state: state ?? null }),
  });

  bindFsmAutoAdvance({
    autoAdvanceShipment: async (_repo, shipment) =>
      (await wasm.flows_auto_advance({ shipment: shipment || {} })).advanced_to ?? null,
  });

  bindJobNoGen({
    assignJobNo:  async (_repo, repCode) => (await wasm.flows_assign_job_no({ rep_code: String(repCode || '') })).job_no,
    formatJobNo:  (repCode, localSeq) => wasm.flows_format_job_no({ rep_code: String(repCode || ''), local_seq: Number(localSeq) || 0 }).job_no,
    nextLocalSeq: async (_repo, repCode) => (await wasm.flows_next_local_seq({ rep_code: String(repCode || '') })).seq,
    repoMaxSeq:   async (_repo, repCode) => (await wasm.flows_repo_max_seq({ rep_code: String(repCode || '') })).seq,
  });

  bindRepCodeRegistry({
    isValidRepCode: (code) => wasm.flows_rep_code_valid({ code: code ?? null }).valid,
    assignRepCode:  async () => (await wasm.flows_assign_rep_code(EMPTY)).code,
    ensureRepCode:  async (user) => (await wasm.flows_ensure_rep_code({ user: user || {} })).code,
    // The form's existing contract is a throw carrying the message it shows.
    assertRepCodeAssignable: async (code, ownerId) => {
      const verdict = await wasm.flows_assert_rep_code({ code: code ?? null, owner_id: ownerId ?? null });
      if (!verdict.ok) throw new Error(t(verdict.error_key));
    },
  });

  bindSalesRegistry({
    // F-46-03: the picker's rows come from the server's safe projection, not the local "user"
    // entity cache (nothing ever wrote that kind — the empty-picker bug). The wasm side still
    // owns shaping, colour-hashing and the 5-minute cache.
    getActiveSalesReps: async () => {
      const { users } = await listUsers({ role: ROLE_SALES_REP });
      return (await wasm.flows_active_sales_reps({ rows: users || [], force: false })).reps;
    },
    getSalesRepByPrefix: (reps, prefix) => wasm.flows_sales_rep_by_prefix({ reps: reps || [], prefix: prefix ?? null }).rep,
    clearRegistryCache: () => wasm.flows_clear_sales_registry(EMPTY),
  });
  // The registry is a five-minute cache of the user master; a user record changing is the one
  // event that must drop it immediately (a rep disabled this morning cannot hold a column open).
  window.addEventListener(ENTITY_CHANGED_EVENT, (e) => {
    if (e.detail?.kind === KIND_USER) wasm.flows_clear_sales_registry(EMPTY);
  });

  const analytics = (shipments, lines) => wasm.flows_sales_analytics({ shipments: shipments || [], lines: lines || [] });
  bindSalesAnalyticsCompute({
    computeKpis:          (shipments, lines) => analytics(shipments, lines).kpis,
    computeLeaderboard:   (shipments, lines) => analytics(shipments, lines).leaderboard,
    computeTopCustomers:  (shipments, lines) => analytics(shipments, lines).top_customers,
    computeLaneHeatmap:   (shipments, lines) => analytics(shipments, lines).heatmap,
    computeMonthlyBars:   (shipments, lines) => analytics(shipments, lines).monthly_bars,
    computeBillingFunnel: (shipments)        => analytics(shipments, []).billing_funnel,
    // Read from the ruleset itself rather than re-typed here — the empty pass is the cheapest
    // way to ask the one source what the rep's cut is.
    commissionPct: analytics([], []).commission_pct,
  });

  bindShipmentStateAliases({
    ensureShipmentStateAliases: async () => (await wasm.flows_ensure_state_aliases(EMPTY)).rows,
  });

  bindShipmentStateMigrator({
    migrateLegacyShipmentState: async (_repo, aliasRows) => {
      const r = await wasm.flows_migrate_shipment_states({ alias_rows: aliasRows || [] });
      return { found: r.found, migrated: r.migrated, skippedUnresolved: r.skipped_unresolved };
    },
  });

  bindShipmentVoidDelete({
    chooseShipmentAffordance: (shipment) => wasm.flows_shipment_affordance({ shipment: shipment || {} }).affordance,
    // Two steps on purpose: Rust decides what the caller may do, the view asks, Rust acts.
    runShipmentAffordance: async ({ shipment, canVoid, confirm }) => {
      const plan = wasm.flows_void_plan({ shipment: shipment || {}, is_manager: Boolean(canVoid) });
      if (!plan.confirmable) return { mutated: false, reason: plan.reason };
      const ok = await confirm(plan.affordance);
      if (!ok) return { mutated: false, reason: REASON_CANCELLED };
      const applied = await wasm.flows_void_apply({ shipment: shipment || {}, affordance: plan.affordance });
      if (!applied.ok) throw new Error(applied.error);
      return { mutated: true, affordance: plan.affordance };
    },
  });

  bindQuoteOrchestrator({
    generateQuoteId: async (_repo, salesRepId) => {
      const r = await wasm.flows_generate_quote_id({ sales_rep_id: salesRepId ?? null });
      if (!r.ok) throw new Error(r.error);
      return r.id;
    },
    // F-41: actorId is provenance (created_by, nothing gates on it); salesRepId is the derived
    // commercial owner (SalesRepDerivation) — the two diverge whenever someone other than the
    // customer's assigned rep keys the quote in.
    saveDraft: async (_repo, actorId, salesRepId, formData) => {
      const r = await wasm.flows_save_quote_draft({ actor_id: actorId ?? null, sales_rep_id: salesRepId ?? null, form: formData || {} });
      if (!r.ok) throw new Error(r.error);
      return { id: r.id, quote: r.quote, pending_manager_approval: r.pending_manager_approval };
    },
    sendToCustomer: async (_repo, quote) => {
      const r = await wasm.flows_send_quote({ quote: quote || {} });
      if (!r.ok) throw new Error(r.error);
      return r.quote;
    },
    markAccepted: async (_repo, quote) => {
      const r = await wasm.flows_accept_quote({ quote: quote || {} });
      if (!r.ok) throw new Error(r.error);
      return r.quote;
    },
    checkAlreadyConverted: async (_repo, quoteId) =>
      (await wasm.flows_quote_converted({ quote_id: quoteId ?? null })).shipment ?? null,
  });

  bindQuoteVoidDelete({
    chooseQuoteAffordance: (quote) => wasm.flows_quote_affordance({ quote: quote || {} }).affordance,
    // Two steps on purpose: Rust decides what the caller may do, the view asks, Rust acts.
    runQuoteAffordance: async ({ quote, canWrite, confirm }) => {
      const plan = wasm.flows_quote_delete_plan({ quote: quote || {}, can_write: Boolean(canWrite) });
      if (!plan.confirmable) return { mutated: false, reason: plan.reason };
      const ok = await confirm(plan.affordance);
      if (!ok) return { mutated: false, reason: REASON_CANCELLED };
      const applied = await wasm.flows_quote_delete_apply({ quote: quote || {}, affordance: plan.affordance });
      if (!applied.ok) throw new Error(applied.error);
      return { mutated: true, affordance: plan.affordance };
    },
  });

  bindApprovalOrchestrator({
    decide: async (approvalId, decisionValue, comment, delegatedTo) => {
      const r = await wasm.flows_approval_decide({
        approval_id: approvalId, decision: decisionValue, comment: comment || null, delegated_to: delegatedTo || null,
      });
      if (!r.ok) throw new Error(r.error);
      return { selfApproved: r.self_approved };
    },
  });

  composeFlowsAdmin(wasm);
}
