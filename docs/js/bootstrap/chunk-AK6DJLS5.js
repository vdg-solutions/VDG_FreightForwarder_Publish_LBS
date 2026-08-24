// output/web/js.tmp/implementations/ui/core_abstractions/ports/governance/master-merge.js
var _impl = null;
function bindMasterMerge(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/master-merge: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var diffFields = (...a) => _i().diffFields(...a);
var mergeRecords = (...a) => _i().mergeRecords(...a);
var repointRefs = (...a) => _i().repointRefs(...a);

export {
  bindMasterMerge,
  diffFields,
  mergeRecords,
  repointRefs
};
