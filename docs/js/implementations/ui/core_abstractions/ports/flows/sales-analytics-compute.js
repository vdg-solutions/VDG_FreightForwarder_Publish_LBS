// sales-analytics-compute — port: the sales dashboard's numbers, one pass behind the boundary.

// The rep's cut of the margin (TTCN), as the dashboard prints it. Bound at compose time from the
// ONE ruleset constant — a literal here is a second opinion about somebody's payout.
export let COMMISSION_PCT = 0;

let _impl = null;

/// Root bootstrap binds { computeKpis, computeLeaderboard, computeTopCustomers, computeLaneHeatmap,
/// computeMonthlyBars, computeBillingFunnel, commissionPct } once.
export function bindSalesAnalyticsCompute(impl) {
  _impl = impl;
  COMMISSION_PCT = impl.commissionPct;
}

function _i() {
  if (!_impl) throw new Error('ui/sales-analytics-compute: no implementation bound (root bootstrap binds it)');
  return _impl;
}

export const computeKpis = (...a) => _i().computeKpis(...a);
export const computeLeaderboard = (...a) => _i().computeLeaderboard(...a);
export const computeTopCustomers = (...a) => _i().computeTopCustomers(...a);
export const computeLaneHeatmap = (...a) => _i().computeLaneHeatmap(...a);
export const computeMonthlyBars = (...a) => _i().computeMonthlyBars(...a);
export const computeBillingFunnel = (...a) => _i().computeBillingFunnel(...a);
