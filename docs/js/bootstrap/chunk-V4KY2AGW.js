// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/pnl-composer.js
var BASE_CURRENCY = "VND";
var PNL_DEFAULT_ROW_DIMS = ["period", "sales_rep"];
var DIM_OPTIONS = ["period", "sales_rep", "customer", "trade_lane", "container_type", "carrier"];
var _impl = null;
function bindPnlComposer(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/pnl-composer: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var compose = (...a) => _i().compose(...a);
var composeBuySellBreakdown = (...a) => _i().composeBuySellBreakdown(...a);
var filterByDims = (...a) => _i().filterByDims(...a);

// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/air-pnl-composer.js
var AIR_DEFAULT_DIMS = ["route_lane", "carrier_iata"];
var _impl2 = null;
function bindAirPnlComposer(impl) {
  _impl2 = impl;
}
function _i2() {
  if (!_impl2) throw new Error("ui/air-pnl-composer: no implementation bound (root bootstrap binds it)");
  return _impl2;
}
var composeAir = (...a) => _i2().composeAir(...a);

export {
  BASE_CURRENCY,
  PNL_DEFAULT_ROW_DIMS,
  DIM_OPTIONS,
  bindPnlComposer,
  compose,
  composeBuySellBreakdown,
  filterByDims,
  AIR_DEFAULT_DIMS,
  bindAirPnlComposer,
  composeAir
};
