// output/web/js.tmp/implementations/ui/core_abstractions/ports/cache/master-registry.js
var _impl = null;
function bindMasterRegistry(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/master-registry: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var canWriteMaster = (...a) => _i().canWriteMaster(...a);

export {
  bindMasterRegistry,
  canWriteMaster
};
