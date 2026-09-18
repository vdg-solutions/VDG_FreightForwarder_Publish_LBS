// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/user-audit-log-composer.js
var _impl = null;
function bindUserAuditLogComposer(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/user-audit-log-composer: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var auditLogRows = (...a) => _i().auditLogRows(...a);
var auditLogCsv = (...a) => _i().auditLogCsv(...a);

export {
  bindUserAuditLogComposer,
  auditLogRows,
  auditLogCsv
};
