// shipment-state-aliases — port: the shipment-states alias registry. Seeded server-side at
// workspace provisioning (server/src/bootstrap/edge/seed_masters.rs); the client only reads it.

/// The registered kind, as the masters view addresses it.
export const SHIPMENT_STATES_KIND = 'shipment-states';

let _impl = null;

/// Root bootstrap binds { ensureShipmentStateAliases } once.
export function bindShipmentStateAliases(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/shipment-state-aliases: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (repo) -> the alias rows, seeding them first when nobody has yet
export const ensureShipmentStateAliases = (...a) => _i().ensureShipmentStateAliases(...a);
