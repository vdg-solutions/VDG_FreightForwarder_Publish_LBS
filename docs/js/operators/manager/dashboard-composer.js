// Operator — Manager Dashboard aggregation. No I/O.

import {
  computeKpis, computeLeaderboard, computeTopCustomers,
  computeMonthlyBars, computeLaneHeatmap,
} from '../sales-analytics-compute.js';

const VOLUME_LABEL_BY_MODE = {
  Sea: 'manager.kpi.teu',
  Air: 'manager.kpi.chargeable_kg',
  All: 'manager.kpi.mixed',
};

const AR_OVERDUE_DAYS              = 30;
const EXCEPTION_CRITICAL_THRESHOLD = 0;
const ACTIVITY_FEED_MAX            = 20;
const TOP_CUSTOMERS_MAX            = 10;
const EXCEPTION_PANEL_MAX          = 5;
const LAYOUT_DEBOUNCE_MS           = 500;

const ACTIVE_STATES_EXCLUDE = ['delivered', 'closed', 'cancelled'];

// ── period filter ─────────────────────────────────────────────────────────────

function msRange(period) {
  const now  = Date.now();
  const d    = new Date();
  switch (period) {
    case 'Today':   return [new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), now];
    case 'Week': {
      const day = d.getDay() || 7;
      return [new Date(d.getFullYear(), d.getMonth(), d.getDate() - day + 1).getTime(), now];
    }
    case 'Quarter': {
      const qStart = Math.floor(d.getMonth() / 3) * 3;
      return [new Date(d.getFullYear(), qStart, 1).getTime(), now];
    }
    case 'Year':    return [new Date(d.getFullYear(), 0, 1).getTime(), now];
    default:        return [new Date(d.getFullYear(), d.getMonth(), 1).getTime(), now]; // Month
  }
}

export function applyPeriodFilter(shipments, period) {
  if (!period || period === 'All') return shipments;
  const [from, to] = msRange(period);
  return shipments.filter((s) => {
    const etd = s.etd || s.ETD;
    if (!etd) return false;
    const t = new Date(etd).getTime();
    return t >= from && t <= to;
  });
}

export function applySalesFilter(shipments, salesFilter) {
  if (!salesFilter) return shipments;
  return shipments.filter((s) => (s.sales_rep || s.SalesRep) === salesFilter);
}

// mode: 'Sea' → exclude air; 'Air' → keep only air; else pass-through
export function applyModeFilter(shipments, mode) {
  if (!mode || mode === 'All') return shipments;
  if (mode === 'Sea') return shipments.filter((s) => s.mode !== 'air');
  if (mode === 'Air') return shipments.filter((s) => s.mode === 'air');
  return shipments;
}

// ── daysOverdue helper ────────────────────────────────────────────────────────

function daysOverdue(billing) {
  const inv = billing.invoice_date || billing.InvoiceDate;
  if (!inv) return 0;
  return Math.floor((Date.now() - new Date(inv).getTime()) / 86_400_000);
}

// ── compose ───────────────────────────────────────────────────────────────────

/**
 * @param {object}      repo
 * @param {string}      period      Today|Week|Month|Quarter|Year
 * @param {string|null} salesFilter
 * @param {string}      [mode]      Sea|Air|All (default 'All')
 * @returns {Promise<object>}
 */
export async function compose(repo, period, salesFilter, mode = 'All') {
  const [shipments, pnlLines, billing, approvals] = await Promise.all([
    repo.list('shipment', null),
    repo.list('pnl_line', null),
    repo.list('billing', null),
    repo.list('approval_request', null),
  ]);

  const filtered = applyModeFilter(
    applySalesFilter(applyPeriodFilter(shipments, period), salesFilter),
    mode,
  );

  // Volume KPI — TEU for sea, chargeable_kg for air, null for mixed
  let volumeValue = null;
  if (mode === 'Sea') {
    volumeValue = filtered.reduce((a, s) => a + Number(s.teu ?? s.TEU ?? 0), 0);
  } else if (mode === 'Air') {
    volumeValue = filtered.reduce((a, s) => a + Number(s.chargeable_kg ?? s.ChargeableKg ?? 0), 0);
  }

  const kpis = {
    ...computeKpis(filtered, pnlLines),
    pendingApprovals: approvals.filter((a) => a.status === 'Pending').length,
    openExceptions:   shipments.filter((s) => s.has_exception).length,
    arOverdue:        billing.filter(
      (b) => daysOverdue(b) > AR_OVERDUE_DAYS && b.status !== 'Paid',
    ).length,
    volumeValue,
    volumeLabelKey: VOLUME_LABEL_BY_MODE[mode] ?? VOLUME_LABEL_BY_MODE.All,
  };

  const leaderboard  = computeLeaderboard(filtered, pnlLines);
  const topCustomers = computeTopCustomers(filtered, pnlLines, TOP_CUSTOMERS_MAX);
  const heatmap      = computeLaneHeatmap(filtered, pnlLines);
  const monthly      = computeMonthlyBars(shipments, pnlLines);

  const exceptions = shipments
    .filter((s) => s.has_exception)
    .slice(0, EXCEPTION_PANEL_MAX);

  return { kpis, leaderboard, topCustomers, heatmap, monthly, exceptions, billing, shipments: filtered };
}

export {
  AR_OVERDUE_DAYS, EXCEPTION_CRITICAL_THRESHOLD, ACTIVITY_FEED_MAX,
  TOP_CUSTOMERS_MAX, EXCEPTION_PANEL_MAX, LAYOUT_DEBOUNCE_MS,
  ACTIVE_STATES_EXCLUDE,
};
