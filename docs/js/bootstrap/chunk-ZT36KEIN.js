// output/web/js.tmp/implementations/ui/core_abstractions/ports/auth/auth-gate.js
var _impl = null;
function bindAuthGate(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/auth-gate: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var requireAuth = (...a) => _i().requireAuth(...a);
var detectRoleViaDrive = (...a) => _i().detectRoleViaDrive(...a);
var clearRoleCache = (...a) => _i().clearRoleCache(...a);

export {
  bindAuthGate,
  requireAuth,
  detectRoleViaDrive,
  clearRoleCache
};
