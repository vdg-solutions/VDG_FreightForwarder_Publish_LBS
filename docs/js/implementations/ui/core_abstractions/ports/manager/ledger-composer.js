// ledger-composer — port: the accountant ledger viewer's chart tree, filter, running balance and
// CSV (F-23-04).

export const CHART_GROUP_ORDER = ['Asset', 'Liability', 'Revenue', 'Expense'];

let _impl = null;

/// Root bootstrap binds { groupChartByType, filterLegs, computeRunningBalances, buildLedgerCSV } once.
export function bindLedgerComposer(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/ledger-composer: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (accounts) -> [{ type, accounts }] in fixed type order, empty types skipped
export const groupChartByType = (...a) => _i().groupChartByType(...a);
/// (legs, { dateFrom, dateTo, minAmount, maxAmount, search }) -> the matching legs
export const filterLegs = (...a) => _i().filterLegs(...a);
/// (legs, balanceSide, opening) -> the legs in date order, each with running_balance
export const computeRunningBalances = (...a) => _i().computeRunningBalances(...a);
/// (rows) -> the CSV text
export const buildLedgerCSV = (...a) => _i().buildLedgerCSV(...a);
