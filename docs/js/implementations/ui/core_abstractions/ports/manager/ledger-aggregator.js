// ledger-aggregator — port: the three statements the accountant reports view renders (F-23-05).
//
// No chart, no legs: the view names a bound or a year and the books are read behind the boundary.
// `refresh: true` says this screen's copy is stale (mount); a tab switch rides the same read.

let _impl = null;

/// Root bootstrap binds { trialBalance, pnl, pnlMonthlyBreakdown, balanceSheet, entryTotals } once.
export function bindLedgerAggregator(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/ledger-aggregator: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (asOfDate, refresh) -> { ok, rows: [{ acc_code, name_vi, name_en, opening, dr, cr, closing }], total_dr, total_cr, balanced, error }
export const trialBalance = (...a) => _i().trialBalance(...a);
/// (year, refresh) -> { ok, revenue, expense, netIncome, totalRevenue, totalExpense, error }
export const pnl = (...a) => _i().pnl(...a);
/// (year, refresh) -> { ok, months: [{ month, revenue, expense, netIncome }], error }
export const pnlMonthlyBreakdown = (...a) => _i().pnlMonthlyBreakdown(...a);
/// (asOfDate, refresh) -> { ok, assets, liabilities, equity, total_assets, total_liabilities, total_liab_equity, balanced, error }
export const balanceSheet = (...a) => _i().balanceSheet(...a);
/// (entryId) -> { ok, legs, debitSum, creditSum, diff, error } — one journal entry, read whole
/// across the year's account files (F-19-75 drill-through).
export const entryTotals = (...a) => _i().entryTotals(...a);
