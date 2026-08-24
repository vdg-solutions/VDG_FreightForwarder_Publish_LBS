// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/dashboard-composer.js
var LAYOUT_DEBOUNCE_MS = 500;
var ACTIVITY_FEED_MAX = 20;
var TOP_CUSTOMERS_MAX = 10;
var _impl = null;
function bindDashboardComposer(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/dashboard-composer: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var compose = (...a) => _i().compose(...a);

export {
  LAYOUT_DEBOUNCE_MS,
  ACTIVITY_FEED_MAX,
  TOP_CUSTOMERS_MAX,
  bindDashboardComposer,
  compose
};
