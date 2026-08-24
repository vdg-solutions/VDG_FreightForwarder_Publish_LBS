// output/web/js.tmp/implementations/ui/core_abstractions/ports/governance/default-currency-lock.js
var LOCK_REASON_PERIOD_CLOSED = "period_closed";
var _impl = null;
function bindDefaultCurrencyLock(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/default-currency-lock: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var canEditDefaultCurrency = (...a) => _i().canEditDefaultCurrency(...a);
var periodOf = (...a) => _i().periodOf(...a);

export {
  LOCK_REASON_PERIOD_CLOSED,
  bindDefaultCurrencyLock,
  canEditDefaultCurrency,
  periodOf
};
