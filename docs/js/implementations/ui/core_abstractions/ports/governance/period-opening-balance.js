// period-opening-balance — port: so du dau ky. The period arithmetic and the read-back off the
// previous period's close record; the money itself is the ledger's.

export const CLOSING_BALANCES_FIELD = 'closing_balances';
export const ACCOUNT_FIELD = 'account';
export const BALANCE_FIELD = 'balance';

let _impl = null;

/// Root bootstrap binds { previousPeriod, nextPeriod, periodBounds, dayBefore, periodOfDate,
/// isPeriodStart, openingBalanceFor } once.
export function bindPeriodOpeningBalance(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/period-opening-balance: no implementation bound (root bootstrap binds it)');
  return _impl;
}

export const previousPeriod = (...a) => _i().previousPeriod(...a);
export const nextPeriod     = (...a) => _i().nextPeriod(...a);
export const periodBounds   = (...a) => _i().periodBounds(...a);
export const dayBefore      = (...a) => _i().dayBefore(...a);
export const periodOfDate   = (...a) => _i().periodOfDate(...a);
export const isPeriodStart  = (...a) => _i().isPeriodStart(...a);
/// (closeRecords, period, accountCode) -> the signed-off opening figure, or null
export const openingBalanceFor = (...a) => _i().openingBalanceFor(...a);
