// default-currency-lock — port: may accounting still change the workspace default currency? Feeds
// the settings screen's disabled state AND the save guard, so what the user sees and what the
// write enforces cannot drift apart.

export const LOCK_REASON_PERIOD_HAS_JOBS = 'period_has_jobs';
export const LOCK_REASON_PERIOD_CLOSED   = 'period_closed';

let _impl = null;

/// Root bootstrap binds { canEditDefaultCurrency, periodOf } once.
export function bindDefaultCurrencyLock(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/default-currency-lock: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (shipments, period, periodClosed) -> { editable, reason, jobCount }
export const canEditDefaultCurrency = (...a) => _i().canEditDefaultCurrency(...a);
/// (date) -> the YYYY-MM it belongs to, or null
export const periodOf = (...a) => _i().periodOf(...a);
