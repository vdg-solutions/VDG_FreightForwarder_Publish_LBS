// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/manifest-composer.js
var _impl = null;
function bindManifestComposer(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/manifest-composer: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var composeOverview = (...a) => _i().overview(...a);

export {
  bindManifestComposer,
  composeOverview
};
