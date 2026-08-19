// shipment-state-aliases.js — port: the shipment state aliases use-case as its collaborators call it; the freight_app bootstrap binds
// the operator (operators/util/shipment-state-aliases.js) behind it. Constants and error shapes are contract and live here.

export const SHIPMENT_STATES_KIND = 'shipment-states';

let _impl = null;

/// The operator registers { ensureShipmentStateAliases } once, from the freight_app bootstrap.
export function bindShipmentStateAliases(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('freight_app/shipment-state-aliases: no operator bound (the freight_app bootstrap binds it)');
  return _impl;
}

export const ensureShipmentStateAliases = (...a) => _i().ensureShipmentStateAliases(...a);

/// Test seam.
export function _resetShipmentStateAliases() { _impl = null; }
