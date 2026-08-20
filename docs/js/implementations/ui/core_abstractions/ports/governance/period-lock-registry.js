// period-lock-registry — port: the ONE list of closed periods, as the commission settle flow and
// the close screen both read it (meta-pref preferences.locked_periods).

export const PERIOD_KEY_FIELD = 'period_key';
export const LOCKED_AT_FIELD  = 'locked_at';
export const LOCKED_BY_FIELD  = 'locked_by';

let _impl = null;

/// Root bootstrap binds { readLockedPeriods, lockedPeriodKeys, findLock, lockPeriod, unlockPeriod } once.
export function bindPeriodLockRegistry(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/period-lock-registry: no implementation bound (root bootstrap binds it)');
  return _impl;
}

export const readLockedPeriods = (...a) => _i().readLockedPeriods(...a);
export const lockedPeriodKeys  = (...a) => _i().lockedPeriodKeys(...a);
export const findLock          = (...a) => _i().findLock(...a);
export const lockPeriod        = (...a) => _i().lockPeriod(...a);
export const unlockPeriod      = (...a) => _i().unlockPeriod(...a);
