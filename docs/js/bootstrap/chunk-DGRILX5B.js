// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/commission-composer.js
var _impl = null;
function bindCommissionComposer(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/commission-composer: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var compose = (...a) => _i().compose(...a);

export {
  bindCommissionComposer,
  compose
};
