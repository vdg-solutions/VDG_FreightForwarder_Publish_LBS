// output/web/js.tmp/implementations/ui/core_abstractions/ports/cache/bulk-orchestrator.js
var _impl = null;
function bindBulkOrchestrator(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/bulk-orchestrator: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var bulkPut = (...a) => _i().bulkPut(...a);

export {
  bindBulkOrchestrator,
  bulkPut
};
