// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/finance-dashboard-composer.js
var _impl = null;
function bindFinanceDashboardComposer(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/finance-dashboard-composer: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var financeDashboard = (...a) => _i().financeDashboard(...a);

export {
  bindFinanceDashboardComposer,
  financeDashboard
};
