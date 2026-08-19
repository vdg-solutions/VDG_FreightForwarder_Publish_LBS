// fork-grants.js — port: the fork grants use-case as its collaborators call it; the freight_app bootstrap binds
// the operator (operators/manager/fork-grants.js) behind it. Constants and error shapes are contract and live here.

let _impl = null;

/// The operator registers { splitInteriorWildcard, grantAcrossForks, revokeAcrossForks, grantNewForkToReaders } once, from the freight_app bootstrap.
export function bindForkGrants(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('freight_app/fork-grants: no operator bound (the freight_app bootstrap binds it)');
  return _impl;
}

export const splitInteriorWildcard = (...a) => _i().splitInteriorWildcard(...a);
export const grantAcrossForks = (...a) => _i().grantAcrossForks(...a);
export const revokeAcrossForks = (...a) => _i().revokeAcrossForks(...a);
export const grantNewForkToReaders = (...a) => _i().grantNewForkToReaders(...a);

/// Test seam.
export function _resetForkGrants() { _impl = null; }
