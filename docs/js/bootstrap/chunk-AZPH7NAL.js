// output/web/js.tmp/implementations/storage/core_abstractions/backend.js
var _impl = null;
function bindBackend(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("storage/backend: no adapter bound (the storage bootstrap binds it)");
  return _impl;
}
var isServerBackend = (...a) => _i().isServerBackend(...a);
var apiFetch = (...a) => _i().apiFetch(...a);
var rememberSessionToken = (...a) => _i().rememberSessionToken(...a);
var adoptSessionToken = (...a) => _i().adoptSessionToken(...a);

// output/web/js.tmp/implementations/ui/core_abstractions/ports/governance/first-run-provision.js
var SecondWorkspaceForbiddenError = class extends Error {
  constructor(evidence) {
    super("Refusing to create a second workspace \u2014 this account is already provisioned (" + evidence + ")");
    this.name = "SecondWorkspaceForbiddenError";
    this.evidence = evidence;
  }
};
var _impl2 = null;
function bindFirstRunProvision(impl) {
  _impl2 = impl;
}
function _i2() {
  if (!_impl2) throw new Error("ui/first-run-provision: no implementation bound (root bootstrap binds it)");
  return _impl2;
}
var isAlreadyProvisionedLocally = (...a) => _i2().isAlreadyProvisionedLocally(...a);
var runFirstRunProvision = (...a) => _i2().runFirstRunProvision(...a);

export {
  bindBackend,
  isServerBackend,
  apiFetch,
  rememberSessionToken,
  adoptSessionToken,
  SecondWorkspaceForbiddenError,
  bindFirstRunProvision,
  isAlreadyProvisionedLocally,
  runFirstRunProvision
};
