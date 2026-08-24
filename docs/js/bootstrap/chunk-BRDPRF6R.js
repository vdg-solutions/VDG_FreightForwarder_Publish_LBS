// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/ledger-composer.js
var _impl = null;
function bindLedgerComposer(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/ledger-composer: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var groupChartByType = (...a) => _i().groupChartByType(...a);
var filterLegs = (...a) => _i().filterLegs(...a);
var computeRunningBalances = (...a) => _i().computeRunningBalances(...a);
var buildLedgerCSV = (...a) => _i().buildLedgerCSV(...a);

// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/ledger-reconciler.js
var _impl2 = null;
function bindLedgerReconciler(impl) {
  _impl2 = impl;
}
function _i2() {
  if (!_impl2) throw new Error("ui/ledger-reconciler: no implementation bound (root bootstrap binds it)");
  return _impl2;
}
var runAndRecord = (...a) => _i2().runAndRecord(...a);

// output/web/js.tmp/implementations/ui/core_abstractions/ports/governance/period-opening-balance.js
var _impl3 = null;
function bindPeriodOpeningBalance(impl) {
  _impl3 = impl;
}
function _i3() {
  if (!_impl3) throw new Error("ui/period-opening-balance: no implementation bound (root bootstrap binds it)");
  return _impl3;
}
var dayBefore = (...a) => _i3().dayBefore(...a);
var periodOfDate = (...a) => _i3().periodOfDate(...a);
var isPeriodStart = (...a) => _i3().isPeriodStart(...a);
var openingBalanceFor = (...a) => _i3().openingBalanceFor(...a);

// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/ledger-repost.js
var _impl4 = null;
function bindLedgerRepost(impl) {
  _impl4 = impl;
}
function _i4() {
  if (!_impl4) throw new Error("ui/ledger-repost: no implementation bound (root bootstrap binds it)");
  return _impl4;
}
var planRepost = (...a) => _i4().planRepost(...a);
var applyRepost = (...a) => _i4().applyRepost(...a);
var purgeOrphans = (...a) => _i4().purgeOrphans(...a);

// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/ledger-poster.js
var _impl5 = null;
function bindLedgerPoster(impl) {
  _impl5 = impl;
}
function _i5() {
  if (!_impl5) throw new Error("ui/ledger-poster: no implementation bound (root bootstrap binds it)");
  return _impl5;
}
var postReversal = (...a) => _i5().postReversal(...a);

export {
  bindLedgerComposer,
  groupChartByType,
  filterLegs,
  computeRunningBalances,
  buildLedgerCSV,
  bindLedgerReconciler,
  runAndRecord,
  bindPeriodOpeningBalance,
  dayBefore,
  periodOfDate,
  isPeriodStart,
  openingBalanceFor,
  bindLedgerRepost,
  planRepost,
  applyRepost,
  purgeOrphans,
  bindLedgerPoster,
  postReversal
};
