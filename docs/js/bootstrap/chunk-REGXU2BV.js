// output/web/js.tmp/implementations/ui/core_abstractions/ports/sync/due-soon.js
var _impl = null;
function bindDueSoon(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/due-soon: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var computeDueSoonRows = (...a) => _i().computeDueSoonRows(...a);

export {
  bindDueSoon,
  computeDueSoonRows
};
