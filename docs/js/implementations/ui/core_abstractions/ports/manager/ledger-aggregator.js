// ledger-aggregator — port: the three statements the accountant reports view renders (F-23-05).

let _impl = null;

/// Root bootstrap binds { trialBalance, pnl, pnlMonthlyBreakdown, balanceSheet } once.
export function bindLedgerAggregator(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/ledger-aggregator: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (chart, legsByAccount, asOfDate) -> [{ acc_code, opening, dr, cr, closing }]
export const trialBalance = (...a) => _i().trialBalance(...a);
/// (chart, legsByAccount, dateFrom, dateTo) -> { revenue, expense, netIncome }
export const pnl = (...a) => _i().pnl(...a);
/// (chart, legsByAccount, year) -> [{ month, revenue, expense, netIncome }]
export const pnlMonthlyBreakdown = (...a) => _i().pnlMonthlyBreakdown(...a);
/// (chart, legsByAccount, asOfDate) -> { assets, liabilities, equity }
export const balanceSheet = (...a) => _i().balanceSheet(...a);
