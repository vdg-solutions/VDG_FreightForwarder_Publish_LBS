// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/air-rate-calculator.js
var _impl = null;
function bindAirRateCalculator(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/air-rate-calculator: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var computeChargeableKg = (...a) => _i().computeChargeableKg(...a);
var calcResult = (...a) => _i().calcResult(...a);

export {
  bindAirRateCalculator,
  computeChargeableKg,
  calcResult
};
