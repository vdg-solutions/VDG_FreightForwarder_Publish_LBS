// output/web/js.tmp/implementations/ui/core_abstractions/ports/auth/session-roles.js
var _impl = null;
function bindSessionRoles(impl) {
  _impl = impl;
}
var currentAccount = () => _impl ? _impl.currentAccount() : null;
var currentRoles = () => _impl ? _impl.currentRoles() : [];
var currentRolesResolved = () => _impl ? _impl.currentRolesResolved() : false;
var hasRole = (role) => _impl ? _impl.hasRole(role) : false;

export {
  bindSessionRoles,
  currentAccount,
  currentRoles,
  currentRolesResolved,
  hasRole
};
