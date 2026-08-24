// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/sales-registry.js
var _impl = null;
function bindSalesRegistry(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/sales-registry: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var getActiveSalesReps = (...a) => _i().getActiveSalesReps(...a);

export {
  bindSalesRegistry,
  getActiveSalesReps
};
