// ledger-aggregator.js — pure logic for financial reports (F-23-05).
// No I/O: trial balance, P&L, balance sheet math over chart + per-account legs.
// `legsByAccount` shape: { [acc_code]: Leg[] } — one entry per chart-of-accounts row.

const ACCOUNT_TYPE_ASSET     = 'Asset';
const ACCOUNT_TYPE_LIABILITY = 'Liability';
const ACCOUNT_TYPE_REVENUE   = 'Revenue';
const ACCOUNT_TYPE_EXPENSE   = 'Expense';
const BALANCE_SIDE_DEBIT     = 'Debit';
const MONTHS_PER_YEAR         = 12;
// Phase-1: no chart date predates real ledger data, so this lower-bounds "since inception".
const LEDGER_INCEPTION_DATE  = '0000-01-01';

function legsInRange(legs, dateFrom, dateTo) {
  return legs.filter((l) => (!dateFrom || l.date >= dateFrom) && (!dateTo || l.date <= dateTo));
}

function sumDebitCredit(legs) {
  let debit_sum = 0;
  let credit_sum = 0;
  for (const leg of legs) {
    debit_sum  += leg.debit  || 0;
    credit_sum += leg.credit || 0;
  }
  return { debit_sum, credit_sum };
}

/// Balance-side-aware net: Debit accounts grow with debit, Credit accounts grow with credit.
function netBalance(debit_sum, credit_sum, balanceSide) {
  return balanceSide === BALANCE_SIDE_DEBIT ? debit_sum - credit_sum : credit_sum - debit_sum;
}

/// AC-01: opening is always 0 (Phase-1: no prior-fiscal-year carryforward — each year's legs
/// live in a fresh Drive file per F-23-02). dr/cr are full debit/credit sums up to asOfDate;
/// closing follows the account's balance_side. sum(dr) === sum(cr) across all rows by
/// double-entry construction (every leg posts an equal debit and credit somewhere in the chart).
export function trialBalance(chart, legsByAccount, asOfDate) {
  return chart.map((account) => {
    const legs = legsInRange(legsByAccount[account.code] || [], null, asOfDate);
    const { debit_sum, credit_sum } = sumDebitCredit(legs);
    const opening = 0;
    const closing = opening + netBalance(debit_sum, credit_sum, account.balance_side);
    return { acc_code: account.code, opening, dr: debit_sum, cr: credit_sum, closing };
  });
}

/// AC-02: Revenue (Credit-side) minus Expense (Debit-side) legs within [dateFrom, dateTo]
/// (inclusive) -> per-account amounts + net income for the period.
export function pnl(chart, legsByAccount, dateFrom, dateTo) {
  const netFor = (account) => {
    const legs = legsInRange(legsByAccount[account.code] || [], dateFrom, dateTo);
    const { debit_sum, credit_sum } = sumDebitCredit(legs);
    return netBalance(debit_sum, credit_sum, account.balance_side);
  };

  const revenue = chart
    .filter((a) => a.account_type === ACCOUNT_TYPE_REVENUE)
    .map((a) => ({ acc: a.code, amt: netFor(a) }));
  const expense = chart
    .filter((a) => a.account_type === ACCOUNT_TYPE_EXPENSE)
    .map((a) => ({ acc: a.code, amt: netFor(a) }));

  const totalRevenue = revenue.reduce((sum, r) => sum + r.amt, 0);
  const totalExpense = expense.reduce((sum, r) => sum + r.amt, 0);
  return { revenue, expense, netIncome: totalRevenue - totalExpense };
}

/// AC-05: one pnl() call per calendar month of `year` — feeds the P&L tab's monthly table.
export function pnlMonthlyBreakdown(chart, legsByAccount, year) {
  const months = [];
  for (let month = 1; month <= MONTHS_PER_YEAR; month++) {
    const mm      = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    const dateFrom = `${year}-${mm}-01`;
    const dateTo   = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;
    const { netIncome, revenue, expense } = pnl(chart, legsByAccount, dateFrom, dateTo);
    const totalRevenue = revenue.reduce((sum, r) => sum + r.amt, 0);
    const totalExpense = expense.reduce((sum, r) => sum + r.amt, 0);
    months.push({ month: mm, revenue: totalRevenue, expense: totalExpense, netIncome });
  }
  return months;
}

/// AC-03: assets/liabilities are as-of-date account balances; equity is the accumulated net
/// income (Revenue - Expense) since inception up to asOfDate — Phase-1 has no dedicated equity
/// account in the chart, so this is the plug that makes assets = liabilities + equity hold by
/// double-entry construction (sum of all debit balances = sum of all credit balances globally).
export function balanceSheet(chart, legsByAccount, asOfDate) {
  const balanceFor = (account) => {
    const legs = legsInRange(legsByAccount[account.code] || [], null, asOfDate);
    const { debit_sum, credit_sum } = sumDebitCredit(legs);
    return netBalance(debit_sum, credit_sum, account.balance_side);
  };

  const assets = chart
    .filter((a) => a.account_type === ACCOUNT_TYPE_ASSET)
    .map((a) => ({ acc: a.code, amt: balanceFor(a) }));
  const liabilities = chart
    .filter((a) => a.account_type === ACCOUNT_TYPE_LIABILITY)
    .map((a) => ({ acc: a.code, amt: balanceFor(a) }));

  const { netIncome } = pnl(chart, legsByAccount, LEDGER_INCEPTION_DATE, asOfDate);
  return { assets, liabilities, equity: netIncome };
}
