// grant-cascade.js — port: the grant cascade use-case as its collaborators call it; the freight_app bootstrap binds
// the operator (operators/manager/grant-cascade.js) behind it. Constants and error shapes are contract and live here.

let _impl = null;

/// The operator registers { grantChildFolders, grantEntry, revokeEntry, rollbackGrants } once, from the freight_app bootstrap.
export function bindGrantCascade(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('freight_app/grant-cascade: no operator bound (the freight_app bootstrap binds it)');
  return _impl;
}

export const grantChildFolders = (...a) => _i().grantChildFolders(...a);
export const grantEntry = (...a) => _i().grantEntry(...a);
export const revokeEntry = (...a) => _i().revokeEntry(...a);
export const rollbackGrants = (...a) => _i().rollbackGrants(...a);

/// Test seam.
export function _resetGrantCascade() { _impl = null; }
