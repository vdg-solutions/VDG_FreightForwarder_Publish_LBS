// output/web/js.tmp/implementations/ui/core_abstractions/ports/storage/fx-rate-repo.js
var _impl = null;
function bindFxRateRepo(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/fx-rate-repo: no adapter bound (compose-ui binds it)");
  return _impl;
}
var fxRateRepo = {
  getRate: (...a) => _i().getRate(...a),
  appendRate: (...a) => _i().appendRate(...a),
  invalidateMonth: (...a) => _i().invalidateMonth(...a),
  listByMonth: (...a) => _i().listByMonth(...a),
  listAll: (...a) => _i().listAll(...a),
  deleteEntry: (...a) => _i().deleteEntry(...a)
};
function _resetFxRateRepo() {
  _impl = null;
}

export {
  bindFxRateRepo,
  fxRateRepo,
  _resetFxRateRepo
};
