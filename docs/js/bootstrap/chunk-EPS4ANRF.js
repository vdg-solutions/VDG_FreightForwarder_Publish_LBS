// output/web/js.tmp/implementations/ui/core_abstractions/ports/data/repo-query.js
var _impl = null;
function bindRepoQuery(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/repo-query: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var listWhere = (...a) => _i().listWhere(...a);

export {
  bindRepoQuery,
  listWhere
};
