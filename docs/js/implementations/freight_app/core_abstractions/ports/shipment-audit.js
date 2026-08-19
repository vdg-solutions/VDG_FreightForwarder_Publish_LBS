// shipment-audit.js — port: the shipment audit use-case as its collaborators call it; the freight_app bootstrap binds
// the operator (operators/sync/shipment-audit.js) behind it. Constants and error shapes are contract and live here.

export const AUDIT_KIND_SHIPMENT = 'shipment';

let _impl = null;

/// The operator registers { recordShipmentChange, splitChanges } once, from the freight_app bootstrap.
export function bindShipmentAudit(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('freight_app/shipment-audit: no operator bound (the freight_app bootstrap binds it)');
  return _impl;
}

export const recordShipmentChange = (...a) => _i().recordShipmentChange(...a);
export const splitChanges = (...a) => _i().splitChanges(...a);

/// Test seam.
export function _resetShipmentAudit() { _impl = null; }
