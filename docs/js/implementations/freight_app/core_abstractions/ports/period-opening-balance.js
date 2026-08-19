// period-opening-balance.js — port: the period opening balance use-case as its collaborators call it; the freight_app bootstrap binds
// the operator (operators/manager/period-opening-balance.js) behind it. Constants and error shapes are contract and live here.

export const CLOSING_BALANCES_FIELD = 'closing_balances';

export const ACCOUNT_FIELD = 'account';

export const BALANCE_FIELD = 'balance';

let _impl = null;

/// The operator registers { previousPeriod, nextPeriod, periodBounds, dayBefore, periodOfDate, isPeriodStart, snapshotClosingBalances, latestCloseFor, openingBalanceFor } once, from the freight_app bootstrap.
export function bindPeriodOpeningBalance(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('freight_app/period-opening-balance: no operator bound (the freight_app bootstrap binds it)');
  return _impl;
}

export const previousPeriod = (...a) => _i().previousPeriod(...a);
export const nextPeriod = (...a) => _i().nextPeriod(...a);
export const periodBounds = (...a) => _i().periodBounds(...a);
export const dayBefore = (...a) => _i().dayBefore(...a);
export const periodOfDate = (...a) => _i().periodOfDate(...a);
export const isPeriodStart = (...a) => _i().isPeriodStart(...a);
export const snapshotClosingBalances = (...a) => _i().snapshotClosingBalances(...a);
export const latestCloseFor = (...a) => _i().latestCloseFor(...a);
export const openingBalanceFor = (...a) => _i().openingBalanceFor(...a);

/// Test seam.
export function _resetPeriodOpeningBalance() { _impl = null; }
