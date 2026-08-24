// output/web/js.tmp/implementations/ui/core_abstractions/ports/storage/awb-repo.js
var _impl = null;
function bindAwbRepo(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/awb-repo: no adapter bound (compose-ui binds it)");
  return _impl;
}
var awbRepo = {
  listByMonth: (...a) => _i().listByMonth(...a),
  append: (...a) => _i().append(...a),
  deleteByAwbNo: (...a) => _i().deleteByAwbNo(...a)
};

export {
  bindAwbRepo,
  awbRepo
};
