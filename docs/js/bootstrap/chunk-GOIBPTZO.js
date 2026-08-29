// output/web/js.tmp/implementations/ui/core_abstractions/ports/governance/action-guard.js
var _impl = null;
function bindActionGuard(impl) {
  _impl = impl;
}
function can(action) {
  return _impl ? _impl.can(action) : false;
}

export {
  bindActionGuard,
  can
};
