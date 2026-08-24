// output/web/js.tmp/implementations/storage/core_abstractions/user-directory.js
var _impl = null;
function bindUserDirectory(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("storage/user-directory: no adapter bound (the storage bootstrap binds it)");
  return _impl;
}
var listUsers = (...a) => _i().listUsers(...a);
var createUser = (...a) => _i().createUser(...a);
var patchUser = (...a) => _i().patchUser(...a);

export {
  bindUserDirectory,
  listUsers,
  createUser,
  patchUser
};
