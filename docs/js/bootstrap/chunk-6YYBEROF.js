// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/approval-orchestrator.js
var _impl = null;
function bindApprovalOrchestrator(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/approval-orchestrator: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var decide = (...a) => _i().decide(...a);

export {
  bindApprovalOrchestrator,
  decide
};
