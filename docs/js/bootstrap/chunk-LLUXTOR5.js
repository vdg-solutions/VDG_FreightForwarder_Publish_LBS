// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/user-provisioning.js
var _impl = null;
function bindUserProvisioning(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/user-provisioning: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var inviteSales = (...a) => _i().inviteSales(...a);
var promoteToManager = (...a) => _i().promoteToManager(...a);
var disableUser = (...a) => _i().disableUser(...a);
var editProfile = (...a) => _i().editProfile(...a);

export {
  bindUserProvisioning,
  inviteSales,
  promoteToManager,
  disableUser,
  editProfile
};
