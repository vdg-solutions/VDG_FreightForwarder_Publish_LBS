// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/user-audit-log-composer.js
var _impl = null;
function bindUserAuditLogComposer(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/user-audit-log-composer: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var filterByDateRange = (...a) => _i().filterByDateRange(...a);
var sortByTimestampDesc = (...a) => _i().sortByTimestampDesc(...a);
var buildAuditLogCsv = (...a) => _i().buildAuditLogCsv(...a);

export {
  bindUserAuditLogComposer,
  filterByDateRange,
  sortByTimestampDesc,
  buildAuditLogCsv
};
