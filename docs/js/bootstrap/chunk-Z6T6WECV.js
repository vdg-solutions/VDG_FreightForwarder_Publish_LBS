// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/pnl-gate.js
var _impl = null;
function bindPnlGate(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/pnl-gate: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var lineVnd = (...a) => _i().lineVnd(...a);
var fxDeviation = (...a) => _i().fxDeviation(...a);

export {
  bindPnlGate,
  lineVnd,
  fxDeviation
};
