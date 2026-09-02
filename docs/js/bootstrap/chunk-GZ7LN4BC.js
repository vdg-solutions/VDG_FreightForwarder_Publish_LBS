// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/margin-pct.js
var _impl = null;
function bindMarginPct(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/margin-pct: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var marginPct = (...a) => _i().marginPct(...a);

export {
  bindMarginPct,
  marginPct
};
