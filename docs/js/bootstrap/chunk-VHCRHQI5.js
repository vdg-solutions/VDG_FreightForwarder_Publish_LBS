// output/web/js.tmp/implementations/ui/core_abstractions/ports/sync/audit-log.js
var _impl = null;
function bindAuditLog(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/audit-log: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var verifyAuditChain = (...a) => _i().verifyAuditChain(...a);

export {
  bindAuditLog,
  verifyAuditChain
};
