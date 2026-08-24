// output/web/js.tmp/implementations/ui/core_abstractions/ports/cache/master-deduper.js
var _impl = null;
function bindMasterDeduper(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/master-deduper: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var findMatch = (...a) => _i().findMatch(...a);

export {
  bindMasterDeduper,
  findMatch
};
