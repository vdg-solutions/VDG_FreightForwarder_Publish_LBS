// period-lock-registry.js — port: the period lock registry use-case as its collaborators call it; the freight_app bootstrap binds
// the operator (operators/manager/period-lock-registry.js) behind it. Constants and error shapes are contract and live here.

export const PERIOD_KEY_FIELD = 'period_key';

export const LOCKED_AT_FIELD  = 'locked_at';

export const LOCKED_BY_FIELD  = 'locked_by';

let _impl = null;

/// The operator registers { readLockedPeriods, lockedPeriodKeys, findLock, lockPeriod, unlockPeriod } once, from the freight_app bootstrap.
export function bindPeriodLockRegistry(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('freight_app/period-lock-registry: no operator bound (the freight_app bootstrap binds it)');
  return _impl;
}

export const readLockedPeriods = (...a) => _i().readLockedPeriods(...a);
export const lockedPeriodKeys = (...a) => _i().lockedPeriodKeys(...a);
export const findLock = (...a) => _i().findLock(...a);
export const lockPeriod = (...a) => _i().lockPeriod(...a);
export const unlockPeriod = (...a) => _i().unlockPeriod(...a);

/// Test seam.
export function _resetPeriodLockRegistry() { _impl = null; }
