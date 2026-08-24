// output/web/js.tmp/implementations/ui/core_abstractions/ports/cache/seed-migrator.js
var _impl = null;
function bindSeedMigrator(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/seed-migrator: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var runSeedMigrations = (...a) => _i().runSeedMigrations(...a);

export {
  bindSeedMigrator,
  runSeedMigrations
};
