// compose-ui/manager.js — binds the ui's manager ports to the wasm freight_app exports.
//
// Everything the Rust use-cases cannot know is supplied here: the browser's clock and UTC offset,
// the locale's month names, the label a `__MANAGER__` rep token displays as, and the translation
// of the i18n keys the reports hand back. Rust decides the numbers; this file dresses them.
import { t, fmtDate } from '../../implementations/kernel/core_abstractions/i18n/index.js';
import { ROLE_MANAGER } from '../../implementations/kernel/core_abstractions/roles.js';
import { currentUserEmail } from '../../implementations/ui/core_abstractions/ports/governance/route-guard.js';
import { bindMarginPct } from '../../implementations/ui/core_abstractions/ports/manager/margin-pct.js';
import { bindFinanceDashboardComposer } from '../../implementations/ui/core_abstractions/ports/manager/finance-dashboard-composer.js';
import { bindAirInvoiceComposer } from '../../implementations/ui/core_abstractions/ports/manager/air-invoice-composer.js';
import { bindAirPnlComposer } from '../../implementations/ui/core_abstractions/ports/manager/air-pnl-composer.js';
import { bindArComposer } from '../../implementations/ui/core_abstractions/ports/manager/ar-composer.js';
import { bindCommissionCalculator } from '../../implementations/ui/core_abstractions/ports/manager/commission-calculator.js';
import { bindCommissionComposer } from '../../implementations/ui/core_abstractions/ports/manager/commission-composer.js';
import { bindCustomer360Composer } from '../../implementations/ui/core_abstractions/ports/manager/customer360-composer.js';
import { bindDashboardComposer } from '../../implementations/ui/core_abstractions/ports/manager/dashboard-composer.js';
import { bindDemDetComposer } from '../../implementations/ui/core_abstractions/ports/manager/demdet-composer.js';
import { bindDocumentBoardComposer } from '../../implementations/ui/core_abstractions/ports/manager/document-board-composer.js';
import { bindExceptionComposer } from '../../implementations/ui/core_abstractions/ports/manager/exception-composer.js';
import { bindLedgerAggregator } from '../../implementations/ui/core_abstractions/ports/manager/ledger-aggregator.js';
import { bindLedgerComposer } from '../../implementations/ui/core_abstractions/ports/manager/ledger-composer.js';
import { bindLedgerReconciler } from '../../implementations/ui/core_abstractions/ports/manager/ledger-reconciler.js';
import { bindLedgerRepost } from '../../implementations/ui/core_abstractions/ports/manager/ledger-repost.js';
import { bindManifestComposer } from '../../implementations/ui/core_abstractions/ports/manager/manifest-composer.js';
import { bindNotificationComposer } from '../../implementations/ui/core_abstractions/ports/manager/notification-composer.js';
import { bindPnlComposer } from '../../implementations/ui/core_abstractions/ports/manager/pnl-composer.js';
import { bindSelfApprovedComposer } from '../../implementations/ui/core_abstractions/ports/manager/self-approved-composer.js';
import { bindUserAuditLogComposer } from '../../implementations/ui/core_abstractions/ports/manager/user-audit-log-composer.js';
import { bindUsersViewComposer } from '../../implementations/ui/core_abstractions/ports/manager/users-view-composer.js';

const MANAGER_ROLE_LABEL_KEY = 'admin.users.role.manager';
const MONTHS_PER_YEAR        = 12;
const MONTH_SAMPLE_YEAR      = 2000;
const MARGIN_PCT_DIGITS      = 1;

// Minutes EAST of UTC — getTimezoneOffset() counts the other way.
const tz = () => -new Date().getTimezoneOffset();

// What `__MANAGER__` displays as (F-19-66): the signed-in person, else the role's own label.
function managerLabel() {
  const label = t(MANAGER_ROLE_LABEL_KEY);
  return currentUserEmail() || (label === MANAGER_ROLE_LABEL_KEY ? ROLE_MANAGER : label);
}

// The `period` pivot dimension prints these; hard-coding English would rename every row bucket
// for a Vietnamese reader.
function monthLabels() {
  return Array.from({ length: MONTHS_PER_YEAR }, (_, m) =>
    new Date(MONTH_SAMPLE_YEAR, m, 1).toLocaleString('default', { month: 'short' }));
}

const withDims = (rows) => (rows || []).map((r) => ({ ...r, dims: Object.fromEntries(r.dims || []) }));
const toPairs  = (dims) => Object.entries(dims || {});
const asArray  = (rules) => (rules instanceof Map ? [...rules.values()] : Object.values(rules || {}));
const msOf     = (value) => (value instanceof Date ? value.getTime() : Number(value ?? Date.now()));

// F4-d: one date convention app-wide — fmtDate (i18n/index.js), decided in Rust, not a private
// Intl call here. This used to format with `{day, month}` only, which for 'vi-VN' picks a
// DIFFERENT separator than fmtDate's own `{day, month, year}` request (same locale, same intent,
// two renderings) — proven live as the exceptions trend axis reading `W8 (12-07)` while the
// ledger read `12/07/2026`.
function trendWeekLabel(week) {
  return `W${week.ordinal} (${fmtDate(new Date(week.start_ms))})`;
}

export function composeManager(wasm) {
  bindPnlComposer({
    compose: ({ shipments = [], pnlLines = [], period = '', dims = [] } = {}) => {
      const reply = wasm.manager_pnl_pivot({
        shipments, pnl_lines: pnlLines, period, dims,
        now_ms: Date.now(), tz_offset_min: tz(), manager_label: managerLabel(), month_labels: monthLabels(),
      });
      return { rows: withDims(reply.rows), grandTotals: reply.grandTotals, groupedShipments: reply.groupedShipments };
    },
    composeBuySellBreakdown: (pnlLines, refs) =>
      wasm.manager_pnl_buy_sell({ pnl_lines: pnlLines || [], refs: refs || [] }).rows,
    filterByDims: (shipments, rowDims) => wasm.manager_pnl_drill({
      shipments: shipments || [], row_dims: toPairs(rowDims),
      tz_offset_min: tz(), manager_label: managerLabel(), month_labels: monthLabels(),
    }).shipments,
  });

  bindAirPnlComposer({
    composeAir: ({ shipments = [], pnlLines = [], dims = [] } = {}) => {
      const reply = wasm.manager_air_pnl({
        shipments, pnl_lines: pnlLines, dims,
        tz_offset_min: tz(), manager_label: managerLabel(), month_labels: monthLabels(),
      });
      return { rows: withDims(reply.rows), grandTotals: reply.grandTotals };
    },
  });

  // Synchronous: called per rendered row, so an async hop per cell would trade a correctness

  // fix for a visible one.

  bindMarginPct({ marginPct: (margin, revenue) => wasm.manager_margin_pct(margin, revenue) });

  bindFinanceDashboardComposer({ financeDashboard: (pnlLines) => wasm.manager_finance_dashboard({ pnl_lines: pnlLines || [] }) });

  bindAirInvoiceComposer({
    composeAirInvoice: (awbs, airRates, carriers) => wasm.manager_air_invoice({
      awbs: awbs || [], air_rates: airRates || [], carriers: carriers || [],
    }),
  });

  bindArComposer({
    // F1: fxRatesBuy is currency -> buying closing rate for `today` (131 is an asset).
    // cash-flow.js fetches it (fetchClosingRatesBuy) before calling this; an absent/empty map
    // leaves every row's amount at its last-booked amount_vnd, same as before this landed.
    composeAR: ({ billingEntities = [], today, fxRatesBuy = {} } = {}) =>
      wasm.manager_ar_aging({ billing: billingEntities, today_ms: msOf(today), tz_offset_min: tz(), fx_rates_buy: fxRatesBuy }),
    composeAP: ({ pnlLines = [] } = {}) => wasm.manager_ap_payables({ pnl_lines: pnlLines, tz_offset_min: tz() }),
    composeTimeline: ({ billingEntities = [], shipments = [], today } = {}) => {
      const reply = wasm.manager_ar_timeline({
        billing: billingEntities, shipments, today_ms: msOf(today), tz_offset_min: tz(),
      });
      return { weeks: reply.weeks.map(weekLabel), actuals: reply.actuals, forecast: reply.forecast };
    },
  });

  bindCommissionCalculator({
    computeCommissions: (shipments, pnlLines, rules, advanceLog, periodKey) => wasm.manager_commissions({
      shipments: shipments || [], pnl_lines: pnlLines || [], rules: asArray(rules),
      advances: advanceLog || [], period_key: periodKey || '',
      tz_offset_min: tz(), manager_label: managerLabel(),
    }).rows,
    computeSparkline: (shipments, pnlLines, salesId, monthCount) => wasm.manager_commission_sparkline({
      shipments: shipments || [], pnl_lines: pnlLines || [], sales_id: salesId || '',
      month_count: monthCount || 0, now_ms: Date.now(), tz_offset_min: tz(), manager_label: managerLabel(),
    }).values,
    buildPeriodKey: (mode, date) =>
      wasm.manager_period_key({ mode: mode || 'month', at_ms: msOf(date), tz_offset_min: tz() }).key,
  });

  bindCommissionComposer({
    compose: async () => ({ rules: (await wasm.manager_commission_rules({ all: true })).rules }),
  });

  bindCustomer360Composer({
    compose: (customerId, customers, shipments, billing, exceptions) => {
      const reply = wasm.manager_customer360({
        customer_id: customerId || '', customers: customers || [], shipments: shipments || [],
        billing: billing || [], exceptions: exceptions || [],
        today_ms: Date.now(), tz_offset_min: tz(), manager_label: managerLabel(),
      });
      if (!reply.found) return null;
      return {
        customer: reply.customer,
        lifetimeRevenue: reply.lifetimeRevenue,
        outstanding: reply.outstanding,
        salesRep: reply.salesRep,
        lastTouchDate: reply.lastTouchDate,
        healthScore: reply.healthScore,
        healthBreakdown: reply.healthBreakdown.map((d) => t(d.key, {
          d: d.points, n: d.count || d.days, pct: d.pct.toFixed(MARGIN_PCT_DIGITS), warn: d.warn_pct,
        })),
      };
    },
    compose360: (shipments) => wasm.manager_customer_mode_mix({ shipments: shipments || [] }),
  });

  bindDashboardComposer({
    compose: (repo, period, salesFilter, mode = 'All') => wasm.manager_dashboard({
      period: period || '', sales_filter: salesFilter ?? null, mode,
      now_ms: Date.now(), tz_offset_min: tz(),
    }),
  });

  bindExceptionComposer({
    computeSortedExceptions: (exceptions) =>
      wasm.manager_exceptions_sorted({ exceptions: exceptions || [], now_ms: Date.now(), tz_offset_min: tz() }).exceptions,
    computeTrends: (exceptions) => {
      const reply = wasm.manager_exception_trends({ exceptions: exceptions || [], now_ms: Date.now(), tz_offset_min: tz() });
      return {
        weeks: reply.weeks.map(trendWeekLabel),
        datasets: reply.datasets.map((ds) => ({ label: ds.label_key ? t(ds.label_key) : ds.label, data: ds.data })),
      };
    },
    computeMttr: (exceptions) =>
      wasm.manager_exception_mttr({ exceptions: exceptions || [], now_ms: Date.now(), tz_offset_min: tz() })
        .rows.map((r) => ({ type: r.typeKey ? t(r.typeKey) : r.type, avgHours: r.avgHours })),
    computePerSalesRate: (exceptions) =>
      wasm.manager_exception_per_sales({ exceptions: exceptions || [], now_ms: Date.now(), tz_offset_min: tz() }).rows,
    computeEscalated: (severity) => wasm.manager_exception_escalate({ severity: severity || '' }).severity,
  });

  bindSelfApprovedComposer({
    compose: (decisions, { period = '', from = null, to = null } = {}) =>
      wasm.manager_self_approved_review({ decisions: decisions || [], period, from, to }).rows,
  });

  bindDocumentBoardComposer({
    composeDocumentBoard: (documents, shippingInstructions, arrivalNotices, releaseOrders) => wasm.manager_document_board({
      documents: documents || [], shipping_instructions: shippingInstructions || [],
      arrival_notices: arrivalNotices || [], release_orders: releaseOrders || [],
      now_ms: Date.now(), tz_offset_min: tz(),
    }),
  });

  bindDemDetComposer({
    overview: (instances) =>
      wasm.manager_demdet_overview({ instances: instances || [], now_ms: Date.now(), tz_offset_min: tz() }),
  });

  bindManifestComposer({
    overview: (manifests) =>
      wasm.manager_manifest_overview({ manifests: manifests || [], now_ms: Date.now(), tz_offset_min: tz() }),
  });

  bindLedgerAggregator({
    trialBalance: (chart, legsByAccount, asOfDate) =>
      wasm.manager_ledger_trial_balance({ chart: chart || [], legs_by_account: legsByAccount || {}, as_of_date: asOfDate || '' }),
    pnl: (chart, legsByAccount, dateFrom, dateTo) => wasm.manager_ledger_pnl({
      chart: chart || [], legs_by_account: legsByAccount || {}, date_from: dateFrom || '', date_to: dateTo || '',
    }),
    pnlMonthlyBreakdown: (chart, legsByAccount, year) =>
      wasm.manager_ledger_pnl_monthly({ chart: chart || [], legs_by_account: legsByAccount || {}, year: Number(year) || 0 }).months,
    balanceSheet: (chart, legsByAccount, asOfDate) =>
      wasm.manager_ledger_balance_sheet({ chart: chart || [], legs_by_account: legsByAccount || {}, as_of_date: asOfDate || '' }),
    entryTotals: (legs) => wasm.manager_ledger_entry_totals({ legs: legs || [] }),
  });

  bindLedgerComposer({
    groupChartByType: (accounts) => wasm.manager_ledger_chart_groups({ accounts: accounts || [] }).groups,
    filterLegs: (legs, { dateFrom = '', dateTo = '', minAmount = null, maxAmount = null, search = '' } = {}) =>
      wasm.manager_ledger_filter_legs({
        legs: legs || [], date_from: dateFrom || '', date_to: dateTo || '',
        min_amount: minAmount === '' || minAmount == null ? null : Number(minAmount),
        max_amount: maxAmount === '' || maxAmount == null ? null : Number(maxAmount),
        search: search || '',
      }).legs,
    computeRunningBalances: (legs, balanceSide, opening = 0) =>
      wasm.manager_ledger_running_balances({ legs: legs || [], balance_side: balanceSide || '', opening: Number(opening) || 0 }).legs,
    buildLedgerCSV: (rows) => wasm.manager_ledger_csv({ rows: rows || [] }).csv,
  });

  bindLedgerReconciler({
    runAndRecord: (_ledgerRepo, year) => wasm.manager_ledger_reconcile({ year: Number(year) || new Date().getFullYear() }),
    // Boot calls this unawaited: a reconciliation that cannot run must never wedge the boot.
    maybeAutoReconcile: (_ledgerRepo, year) => {
      wasm.manager_ledger_auto_reconcile({ year: Number(year) || new Date().getFullYear() })
        .catch((err) => { console.error('[ledger-reconciler] auto-reconcile failed:', err); }); // DEV
    },
  });

  bindLedgerRepost({
    planRepost: (_entityRepo, _ledgerRepo, year) =>
      wasm.manager_ledger_plan_repost({ year: Number(year) || new Date().getFullYear() }),
    applyRepost: (_ledgerRepo, plan) => wasm.manager_ledger_apply_repost({ plan }),
    purgeOrphans: (_ledgerRepo, plan, year) =>
      wasm.manager_ledger_purge_orphans({ plan, year: Number(year) || new Date().getFullYear() }),
  });

  bindNotificationComposer({
    computeFromEvent: ({ kind = '', id = '' } = {}, entities) => {
      const reply = wasm.manager_notification_from_event({
        kind, id, entity: entities?.get?.(`${kind}::${id}`) ?? null, manager_label: managerLabel(),
      });
      return reply.notification ? stampNotification(reply.notification) : null;
    },
    computeTimeBased: (shipments, today) =>
      wasm.manager_notifications_time_based({ shipments: shipments || [], now_ms: msOf(today), tz_offset_min: tz() })
        .notifications.map(stampNotification),
  });

  bindUserAuditLogComposer({
    filterByDateRange: (records, { from = '', to = '' } = {}) =>
      wasm.manager_audit_log_range({ records: records || [], from, to }).records,
    sortByTimestampDesc: (records) => wasm.manager_audit_log_sort({ records: records || [] }).records,
    buildAuditLogCsv: (records) => wasm.manager_audit_log_csv({ records: records || [] }).csv,
  });

  bindUsersViewComposer({
    isValidEmail: (email) => wasm.manager_email_valid({ email: email || '' }).valid,
    filterUsers: (users, { search = '', role = '', activeFilter = '' } = {}) =>
      wasm.manager_users_filter({ users: users || [], search, role, active_filter: activeFilter }).users,
    sortUsersByEmail: (users) => wasm.manager_users_sort({ users: users || [] }).users,
  });
}

// The id, the created-at stamp and the read/dismissed flags are browser state, not a rule.
function stampNotification(draft) {
  return {
    id: crypto.randomUUID?.() || `n-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: draft.type,
    title: draft.title,
    created_at: new Date().toISOString(),
    read: false,
    dismissed: false,
    ...(draft.entityKind ? { entityKind: draft.entityKind, entityId: draft.entityId } : {}),
  };
}
