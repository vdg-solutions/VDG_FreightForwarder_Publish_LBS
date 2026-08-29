// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/sales-rep-derivation.js
var _impl = null;
function bindSalesRepDerivation(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/sales-rep-derivation: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var selfRepCandidate = (...a) => _i().selfRepCandidate(...a);
var customerRepFor = (...a) => _i().customerRepFor(...a);

export {
  bindSalesRepDerivation,
  selfRepCandidate,
  customerRepFor
};
