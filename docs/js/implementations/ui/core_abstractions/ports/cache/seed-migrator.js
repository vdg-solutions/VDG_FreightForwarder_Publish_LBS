// seed-migrator — port: versioned, idempotent master-data seeding, as the master views drive it.
// The view declares its migrations ({ id, kind, url, key }); the engine — which ids are applied,
// what `_seed_locked` means, when a stalled write retries — is Rust's.

let _impl = null;

/// Root bootstrap binds { runSeedMigrations } once.
export function bindSeedMigrator(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/seed-migrator: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (repo, migrations) -> Promise<{ applied: string[], skipped: string[] }>
export const runSeedMigrations = (...a) => _i().runSeedMigrations(...a);
