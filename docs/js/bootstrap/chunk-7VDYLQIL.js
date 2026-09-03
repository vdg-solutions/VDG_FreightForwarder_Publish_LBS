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
var mineOnly = (...a) => _i().mineOnly(...a);
var customerRepFor = (...a) => _i().customerRepFor(...a);

// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/quote-orchestrator.js
var _impl2 = null;
function bindQuoteOrchestrator(impl) {
  _impl2 = impl;
}
function _i2() {
  if (!_impl2) throw new Error("ui/quote-orchestrator: no implementation bound (root bootstrap binds it)");
  return _impl2;
}
var saveDraft = (...a) => _i2().saveDraft(...a);
var sendToCustomer = (...a) => _i2().sendToCustomer(...a);
var markAccepted = (...a) => _i2().markAccepted(...a);
var checkAlreadyConverted = (...a) => _i2().checkAlreadyConverted(...a);

export {
  bindSalesRepDerivation,
  selfRepCandidate,
  mineOnly,
  customerRepFor,
  bindQuoteOrchestrator,
  saveDraft,
  sendToCustomer,
  markAccepted,
  checkAlreadyConverted
};
