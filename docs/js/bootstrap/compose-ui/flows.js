// compose-ui/flows.js — binds the ui's flows ports to the wasm freight_app exports.
// The delegates keep the names and signatures the views already call; the `repo` and `driveApi`
// arguments they still pass are ignored, because the use-case reaches storage through the
// platform now. Rules live behind `wasm.flows_*` — nothing here decides anything.
import { bindSalesRepDerivation } from '../../implementations/ui/core_abstractions/ports/flows/sales-rep-derivation.js';
import { bindAirRateCalculator } from '../../implementations/ui/core_abstractions/ports/flows/air-rate-calculator.js';
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
import { composeFlowsAdmin } from './flows-admin.js';
import { t } from '../../implementations/kernel/core_abstractions/i18n/index.js';

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
    getActiveSalesReps: async () => (await wasm.flows_active_sales_reps({ force: false })).reps,
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
    // Two steps on purpose: Rust decides what the manager may do, the view asks, Rust acts.
    runShipmentAffordance: async ({ shipment, isManager, confirm }) => {
      const plan = wasm.flows_void_plan({ shipment: shipment || {}, is_manager: Boolean(isManager) });
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
    saveDraft: async (_repo, salesRepId, formData) => {
      const r = await wasm.flows_save_quote_draft({ sales_rep_id: salesRepId ?? null, form: formData || {} });
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

  composeFlowsAdmin(wasm);
}
