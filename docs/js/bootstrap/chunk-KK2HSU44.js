// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/ledger-aggregator.js
var _impl = null;
function bindLedgerAggregator(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/ledger-aggregator: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var trialBalance = (...a) => _i().trialBalance(...a);
var pnl = (...a) => _i().pnl(...a);
var pnlMonthlyBreakdown = (...a) => _i().pnlMonthlyBreakdown(...a);
var balanceSheet = (...a) => _i().balanceSheet(...a);

export {
  bindLedgerAggregator,
  trialBalance,
  pnl,
  pnlMonthlyBreakdown,
  balanceSheet
};
