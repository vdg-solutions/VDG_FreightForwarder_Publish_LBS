// sales-registry — port: who the active sales reps are, and the colour each is drawn in.
// Cached for five minutes behind the boundary; the root bootstrap drops the cache when a user
// record changes.

let _impl = null;

/// Root bootstrap binds { getActiveSalesReps, getSalesRepByPrefix, clearRegistryCache } once.
export function bindSalesRegistry(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/sales-registry: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (repo) -> [{ id, name, prefix, email, color, sales_code }]
export const getActiveSalesReps = (...a) => _i().getActiveSalesReps(...a);
/// (reps, prefix) -> the rep, or null
export const getSalesRepByPrefix = (...a) => _i().getSalesRepByPrefix(...a);
export const clearRegistryCache = (...a) => _i().clearRegistryCache(...a);
