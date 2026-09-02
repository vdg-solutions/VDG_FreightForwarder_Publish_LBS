// output/web/js.tmp/implementations/ui/core_abstractions/ports/governance/period-lock-registry.js
var _impl = null;
function bindPeriodLockRegistry(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/period-lock-registry: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var lockPeriod = (...a) => _i().lockPeriod(...a);

export {
  bindPeriodLockRegistry,
  lockPeriod
};
