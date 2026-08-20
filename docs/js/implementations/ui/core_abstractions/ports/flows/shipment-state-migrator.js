// shipment-state-migrator — port: the manager-triggered sweep that rewrites legacy `status` values
// into the canonical `state` field. Idempotent by content; never invents a state.

let _impl = null;

/// Root bootstrap binds { migrateLegacyShipmentState } once.
export function bindShipmentStateMigrator(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/shipment-state-migrator: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (repo, aliasRows) -> { found, migrated, skippedUnresolved }
export const migrateLegacyShipmentState = (...a) => _i().migrateLegacyShipmentState(...a);
