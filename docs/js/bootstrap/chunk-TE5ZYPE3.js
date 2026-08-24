// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/customer360-composer.js
var HEALTH_THRESHOLD_GOOD = 80;
var HEALTH_THRESHOLD_WATCH = 50;
var _impl = null;
function bindCustomer360Composer(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/customer360-composer: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var compose = (...a) => _i().compose(...a);
var compose360 = (...a) => _i().compose360(...a);

export {
  HEALTH_THRESHOLD_GOOD,
  HEALTH_THRESHOLD_WATCH,
  bindCustomer360Composer,
  compose,
  compose360
};
