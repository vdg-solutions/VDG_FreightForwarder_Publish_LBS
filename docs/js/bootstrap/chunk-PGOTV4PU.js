// output/web/js.tmp/implementations/ui/core_abstractions/ports/governance/error-log-store.js
var _impl = null;
function bindErrorLogStore(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/error-log-store: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var listErrorRecords = (...a) => _i().listErrorRecords(...a);
var purgeErrorMonth = (...a) => _i().purgeErrorMonth(...a);

export {
  bindErrorLogStore,
  listErrorRecords,
  purgeErrorMonth
};
