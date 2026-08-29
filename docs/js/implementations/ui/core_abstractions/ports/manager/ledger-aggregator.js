// ledger-aggregator — port: the three statements the accountant reports view renders (F-23-05).

let _impl = null;

/// Root bootstrap binds { trialBalance, pnl, pnlMonthlyBreakdown, balanceSheet } once.
export function bindLedgerAggregator(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/ledger-aggregator: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (chart, legsByAccount, asOfDate) -> { rows: [{ acc_code, opening, dr, cr, closing }], total_dr, total_cr, balanced }
export const trialBalance = (...a) => _i().trialBalance(...a);
/// (chart, legsByAccount, dateFrom, dateTo) -> { revenue, expense, netIncome, totalRevenue, totalExpense }
export const pnl = (...a) => _i().pnl(...a);
/// (chart, legsByAccount, year) -> [{ month, revenue, expense, netIncome }]
export const pnlMonthlyBreakdown = (...a) => _i().pnlMonthlyBreakdown(...a);
/// (chart, legsByAccount, asOfDate) -> { assets, liabilities, equity, total_assets, total_liabilities, total_liab_equity, balanced }
export const balanceSheet = (...a) => _i().balanceSheet(...a);
/// (legs) -> { debitSum, creditSum, diff } — one journal entry's debit/credit totals (F-19-75 drill-through).
export const entryTotals = (...a) => _i().entryTotals(...a);
