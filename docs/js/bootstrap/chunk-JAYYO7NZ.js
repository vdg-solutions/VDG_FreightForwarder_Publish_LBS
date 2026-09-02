// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/commission-calculator.js
var SPARKLINE_MONTHS = 6;
var KIND_PNL_LINE = "pnl_line";
var _impl = null;
function bindCommissionCalculator(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/commission-calculator: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var computeCommissions = (...a) => _i().computeCommissions(...a);
var computeSparkline = (...a) => _i().computeSparkline(...a);
var buildPeriodKey = (...a) => _i().buildPeriodKey(...a);

export {
  SPARKLINE_MONTHS,
  KIND_PNL_LINE,
  bindCommissionCalculator,
  computeCommissions,
  computeSparkline,
  buildPeriodKey
};
