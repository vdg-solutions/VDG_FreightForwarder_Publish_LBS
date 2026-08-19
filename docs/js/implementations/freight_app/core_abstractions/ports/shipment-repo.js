// shipment-repo.js — port: the shipment repo use-case as its collaborators call it; the freight_app bootstrap binds
// the operator (operators/data/shipment-repo.js) behind it. Constants and error shapes are contract and live here.

export const KIND_SHIPMENT = 'shipment';

export const OP_SAVE   = 'save';

export const OP_STATE  = 'state';

export const OP_DELETE = 'delete';

export const REVENUE_SEEN = '_revenue_seen';

let _impl = null;

/// The operator registers { putShipment, putEnvelope, getEnvelope, listEnvelopes, deleteShipment, getShipment, listShipments, joinLoaded, anyRevenueVisible } once, from the freight_app bootstrap.
export function bindShipmentRepo(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('freight_app/shipment-repo: no operator bound (the freight_app bootstrap binds it)');
  return _impl;
}

export const putShipment = (...a) => _i().putShipment(...a);
export const putEnvelope = (...a) => _i().putEnvelope(...a);
export const getEnvelope = (...a) => _i().getEnvelope(...a);
export const listEnvelopes = (...a) => _i().listEnvelopes(...a);
export const deleteShipment = (...a) => _i().deleteShipment(...a);
export const getShipment = (...a) => _i().getShipment(...a);
export const listShipments = (...a) => _i().listShipments(...a);
export const joinLoaded = (...a) => _i().joinLoaded(...a);
export const anyRevenueVisible = (...a) => _i().anyRevenueVisible(...a);

/// Test seam.
export function _resetShipmentRepo() { _impl = null; }
