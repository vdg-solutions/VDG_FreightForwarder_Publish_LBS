// ledger-composer — port: the accountant ledger viewer's chart tree and its one account window
// (F-23-04).
//
// The view holds no rows. It names the account and the filter bar; the legs, the side they
// accumulate on and the opening balance are read behind the boundary, and the order, the running
// column and the export file all come back in the one answer.

let _impl = null;

/// Root bootstrap binds { groupChartByType, ledgerLegs } once.
export function bindLedgerComposer(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/ledger-composer: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// () -> { ok, groups: [{ type, accounts }] } in fixed type order, empty types skipped
export const groupChartByType = (...a) => _i().groupChartByType(...a);
/// (accCode, { dateFrom, dateTo, minAmount, maxAmount, search, refresh })
///   -> { ok, legs, opening, csv, error } — legs newest first, each with running_balance
export const ledgerLegs = (...a) => _i().ledgerLegs(...a);
