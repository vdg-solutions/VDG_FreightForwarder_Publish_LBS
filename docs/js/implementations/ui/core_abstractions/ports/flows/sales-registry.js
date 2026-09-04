// sales-registry — port: who the active sales reps are, and the colour each is drawn in.
// Cached for five minutes behind the boundary; the root bootstrap drops the cache when a user
// record changes.

let _impl = null;

/// Root bootstrap binds { getActiveSalesReps, getExcludedNonSalesAccounts, getSalesRepByAccount, clearRegistryCache } once.
export function bindSalesRegistry(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/sales-registry: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// () -> [{ name, account, email, color, handle }]
/// `account` is the lowercased email — what a job stores as its sales_rep_id, and the only field
/// here anything compares. `handle` is the short form shown in a dropdown, display only.
export const getActiveSalesReps = (...a) => _i().getActiveSalesReps(...a);
/// () -> accounts the registry left out for having no Sales role. Excluding them is right;
/// saying nothing is what made a short list read as "that account does not exist".
export const getExcludedNonSalesAccounts = (...a) => _i().getExcludedNonSalesAccounts(...a);
/// (reps, account) -> the rep, or null
export const getSalesRepByAccount = (...a) => _i().getSalesRepByAccount(...a);
export const clearRegistryCache = (...a) => _i().clearRegistryCache(...a);
