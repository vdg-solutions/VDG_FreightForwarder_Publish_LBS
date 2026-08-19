// shipment-revenue-repo.js — port: the shipment revenue repo use-case as its collaborators call it; the freight_app bootstrap binds
// the operator (operators/data/shipment-revenue-repo.js) behind it. Constants and error shapes are contract and live here.

export const KIND_SHIPMENT_REVENUE = 'shipment_revenue';

let _impl = null;

/// The operator registers { revenuePrefixFor, writeRevenue, deleteRevenue, readRevenue, readAllRevenueIn, clearForkScanCache, readRevenueFor } once, from the freight_app bootstrap.
export function bindShipmentRevenueRepo(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('freight_app/shipment-revenue-repo: no operator bound (the freight_app bootstrap binds it)');
  return _impl;
}

export const revenuePrefixFor = (...a) => _i().revenuePrefixFor(...a);
export const writeRevenue = (...a) => _i().writeRevenue(...a);
export const deleteRevenue = (...a) => _i().deleteRevenue(...a);
export const readRevenue = (...a) => _i().readRevenue(...a);
export const readAllRevenueIn = (...a) => _i().readAllRevenueIn(...a);
export const clearForkScanCache = (...a) => _i().clearForkScanCache(...a);
export const readRevenueFor = (...a) => _i().readRevenueFor(...a);

/// Test seam.
export function _resetShipmentRevenueRepo() { _impl = null; }
