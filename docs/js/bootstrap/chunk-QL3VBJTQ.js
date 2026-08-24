// output/web/js.tmp/implementations/ui/core_abstractions/ports/governance/period-close.js
var PERIOD_CLOSE_KIND = "period_close";
var REASON_MAX_CHARS = 500;
var _impl = null;
function bindPeriodClose(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/period-close: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var getCurrentPeriodLock = (...a) => _i().getCurrentPeriodLock(...a);
var loadClosedPeriods = (...a) => _i().loadClosedPeriods(...a);
var listCloseRecords = (...a) => _i().listCloseRecords(...a);
var runPreCloseChecks = (...a) => _i().runPreCloseChecks(...a);
var closePeriod = (...a) => _i().closePeriod(...a);
var reopenPeriod = (...a) => _i().reopenPeriod(...a);

export {
  PERIOD_CLOSE_KIND,
  REASON_MAX_CHARS,
  bindPeriodClose,
  getCurrentPeriodLock,
  loadClosedPeriods,
  listCloseRecords,
  runPreCloseChecks,
  closePeriod,
  reopenPeriod
};
