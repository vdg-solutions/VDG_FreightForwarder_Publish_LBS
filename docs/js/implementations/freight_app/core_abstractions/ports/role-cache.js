// role-cache.js — port: the role cache use-case as its collaborators call it; the freight_app bootstrap binds
// the operator (operators/auth/role-cache.js) behind it. Constants and error shapes are contract and live here.

let _impl = null;

/// The operator registers { readCachedRole, writeCachedRole, clearCachedRole, readCachedIdentityRaw } once, from the freight_app bootstrap.
export function bindRoleCache(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('freight_app/role-cache: no operator bound (the freight_app bootstrap binds it)');
  return _impl;
}

export const readCachedRole = (...a) => _i().readCachedRole(...a);
export const writeCachedRole = (...a) => _i().writeCachedRole(...a);
export const clearCachedRole = (...a) => _i().clearCachedRole(...a);
export const readCachedIdentityRaw = (...a) => _i().readCachedIdentityRaw(...a);

/// Test seam.
export function _resetRoleCache() { _impl = null; }
