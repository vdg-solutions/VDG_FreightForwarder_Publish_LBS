// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/self-approved-composer.js
var _impl = null;
function bindSelfApprovedComposer(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/self-approved-composer: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var compose = (...a) => _i().compose(...a);

export {
  bindSelfApprovedComposer,
  compose
};
