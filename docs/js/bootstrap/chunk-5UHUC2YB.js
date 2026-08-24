// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/quote-orchestrator.js
var _impl = null;
function bindQuoteOrchestrator(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/quote-orchestrator: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var saveDraft = (...a) => _i().saveDraft(...a);
var sendToCustomer = (...a) => _i().sendToCustomer(...a);
var markAccepted = (...a) => _i().markAccepted(...a);
var checkAlreadyConverted = (...a) => _i().checkAlreadyConverted(...a);

export {
  bindQuoteOrchestrator,
  saveDraft,
  sendToCustomer,
  markAccepted,
  checkAlreadyConverted
};
