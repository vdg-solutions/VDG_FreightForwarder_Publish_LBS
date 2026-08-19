// seed-migrator.js — port: the seed migrator use-case as its collaborators call it; the freight_app bootstrap binds
// the operator (operators/cache/seed-migrator.js) behind it. Constants and error shapes are contract and live here.

let _impl = null;

/// The operator registers { runSeedMigrations } once, from the freight_app bootstrap.
export function bindSeedMigrator(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('freight_app/seed-migrator: no operator bound (the freight_app bootstrap binds it)');
  return _impl;
}

export const runSeedMigrations = (...a) => _i().runSeedMigrations(...a);

/// Test seam.
export function _resetSeedMigrator() { _impl = null; }
