// shipment-state-aliases — port: the shipment-states alias registry, seeded on first READ so a
// session that never opened the manager master view still resolves legacy values.

/// The registered kind, as the masters view addresses it.
export const SHIPMENT_STATES_KIND = 'shipment-states';

/// The versioned seed the masters view runs through the seed migrator. Same id the read path
/// seeds under, so the two can never double-seed.
export const SHIPMENT_STATES_SEED_MIGRATION = {
  id: '2026-07-17-shipment-states-v1',
  kind: SHIPMENT_STATES_KIND,
  url: 'seed/masters/shipment-states.jsonl',
  key: (row) => row.code,
};

let _impl = null;

/// Root bootstrap binds { ensureShipmentStateAliases } once.
export function bindShipmentStateAliases(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/shipment-state-aliases: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (repo) -> the alias rows, seeding them first when nobody has yet
export const ensureShipmentStateAliases = (...a) => _i().ensureShipmentStateAliases(...a);
