// sales-analytics-compute.js — port: the sales analytics compute use-case as its collaborators call it; the freight_app bootstrap binds
// the operator (operators/sales-analytics-compute.js) behind it. Constants and error shapes are contract and live here.

let _impl = null;

/// The operator registers { computeKpis, computeLeaderboard, computeTopCustomers, computeLaneHeatmap, computeMonthlyBars, computeBillingFunnel } once, from the freight_app bootstrap.
export function bindSalesAnalyticsCompute(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('freight_app/sales-analytics-compute: no operator bound (the freight_app bootstrap binds it)');
  return _impl;
}

export const computeKpis = (...a) => _i().computeKpis(...a);
export const computeLeaderboard = (...a) => _i().computeLeaderboard(...a);
export const computeTopCustomers = (...a) => _i().computeTopCustomers(...a);
export const computeLaneHeatmap = (...a) => _i().computeLaneHeatmap(...a);
export const computeMonthlyBars = (...a) => _i().computeMonthlyBars(...a);
export const computeBillingFunnel = (...a) => _i().computeBillingFunnel(...a);

/// Test seam.
export function _resetSalesAnalyticsCompute() { _impl = null; }
