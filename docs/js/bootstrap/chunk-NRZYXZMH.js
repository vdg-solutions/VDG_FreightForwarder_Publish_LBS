// output/web/js.tmp/implementations/ui/core_abstractions/ports/data/master-repo.js
var _impl = null;
function bindMasterRepo(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/master-repo: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var saveMaster = (...a) => _i().saveMaster(...a);
var listMasters = (...a) => _i().listMasters(...a);

export {
  bindMasterRepo,
  saveMaster,
  listMasters
};
