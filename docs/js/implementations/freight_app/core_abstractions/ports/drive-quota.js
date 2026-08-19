// drive-quota.js — port: the drive quota use-case as its collaborators call it; the freight_app bootstrap binds
// the operator (operators/sync/drive-quota.js) behind it. Constants and error shapes are contract and live here.

let _impl = null;

/// The operator registers { checkDriveQuota } once, from the freight_app bootstrap.
export function bindDriveQuota(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('freight_app/drive-quota: no operator bound (the freight_app bootstrap binds it)');
  return _impl;
}

export const checkDriveQuota = (...a) => _i().checkDriveQuota(...a);

/// Test seam.
export function _resetDriveQuota() { _impl = null; }
