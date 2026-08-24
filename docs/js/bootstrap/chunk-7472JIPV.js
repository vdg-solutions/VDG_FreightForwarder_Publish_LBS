// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/sales-analytics-compute.js
var COMMISSION_PCT = 0;
var _impl = null;
function bindSalesAnalyticsCompute(impl) {
  _impl = impl;
  COMMISSION_PCT = impl.commissionPct;
}
function _i() {
  if (!_impl) throw new Error("ui/sales-analytics-compute: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var computeKpis = (...a) => _i().computeKpis(...a);
var computeLeaderboard = (...a) => _i().computeLeaderboard(...a);
var computeTopCustomers = (...a) => _i().computeTopCustomers(...a);
var computeLaneHeatmap = (...a) => _i().computeLaneHeatmap(...a);
var computeMonthlyBars = (...a) => _i().computeMonthlyBars(...a);
var computeBillingFunnel = (...a) => _i().computeBillingFunnel(...a);

export {
  COMMISSION_PCT,
  bindSalesAnalyticsCompute,
  computeKpis,
  computeLeaderboard,
  computeTopCustomers,
  computeLaneHeatmap,
  computeMonthlyBars,
  computeBillingFunnel
};
