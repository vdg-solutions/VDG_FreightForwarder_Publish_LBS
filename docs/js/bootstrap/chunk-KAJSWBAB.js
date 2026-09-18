// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/rep-code-registry.js
var _impl = null;
function bindRepCodeRegistry(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/rep-code-registry: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var ensureRepCode = (...a) => _i().ensureRepCode(...a);

// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/job-no-gen.js
var _impl2 = null;
function bindJobNoGen(impl) {
  _impl2 = impl;
}
function _i2() {
  if (!_impl2) throw new Error("ui/job-no-gen: no implementation bound (root bootstrap binds it)");
  return _impl2;
}
var assignJobNo = (...a) => _i2().assignJobNo(...a);

// output/web/js.tmp/implementations/storage/core_abstractions/identity.js
var _provider = null;
function bindIdentityProvider(provider) {
  _provider = provider;
}
function _p() {
  if (!_provider) throw new Error("storage/identity: no identity provider bound (import the provider before the operators run)");
  return _provider;
}
function getCurrentUser() {
  return _p().getCurrentUser();
}
function signOut() {
  return _p().signOut();
}
function wasPreviouslySignedIn() {
  return _p().wasPreviouslySignedIn();
}
function rebuildSessionFromStoredToken() {
  return _p().rebuildSessionFromStoredToken();
}

// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/quote-totals.js
var _impl3 = null;
function bindQuoteTotals(impl) {
  _impl3 = impl;
}
function _i3() {
  if (!_impl3) throw new Error("ui/quote-totals: no implementation bound (root bootstrap binds it)");
  return _impl3;
}
var computeQuoteTotals = (...a) => _i3().compute(...a);

// output/web/js.tmp/implementations/ui/core_abstractions/ports/sync/wma-engine.js
var _impl4 = null;
function bindWmaEngine(impl) {
  _impl4 = impl;
}
function _i4() {
  if (!_impl4) throw new Error("ui/wma-engine: no implementation bound (root bootstrap binds it)");
  return _impl4;
}
var predict = (...a) => _i4().predict(...a);
var onEvent = (...a) => _i4().onEvent(...a);
var dismissPrediction = (...a) => _i4().dismissPrediction(...a);

// output/web/js.tmp/implementations/ui/core_abstractions/ports/sync/wma-store.js
var _impl5 = null;
function bindWmaStore(impl) {
  _impl5 = impl;
}
function _i5() {
  if (!_impl5) throw new Error("ui/wma-store: no implementation bound (root bootstrap binds it)");
  return _impl5;
}
var loadKindWmaState = (...a) => _i5().loadKindWmaState(...a);
var saveKindWmaState = (...a) => _i5().saveKindWmaState(...a);

// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/margin-pct.js
var _impl6 = null;
function bindMarginPct(impl) {
  _impl6 = impl;
}
function _i6() {
  if (!_impl6) throw new Error("ui/margin-pct: no implementation bound (root bootstrap binds it)");
  return _impl6;
}
var marginPct = (...a) => _i6().marginPct(...a);

// output/web/js.tmp/implementations/ui/core_abstractions/ports/data/shipment-submit.js
var _impl7 = null;
function bindShipmentSubmit(impl) {
  _impl7 = impl;
}
function _i7() {
  if (!_impl7) throw new Error("ui/shipment-submit: no implementation bound (root bootstrap binds it)");
  return _impl7;
}
var mintShipmentRef = (...a) => _i7().mintShipmentRef(...a);
var resolveJobNo = (...a) => _i7().resolveJobNo(...a);
var healJobNoCollision = (...a) => _i7().healJobNoCollision(...a);
var nextLedgerVersion = (...a) => _i7().nextLedgerVersion(...a);
var resolvePublishState = (...a) => _i7().resolvePublishState(...a);

// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/fsm-auto-advance.js
var _impl8 = null;
function bindFsmAutoAdvance(impl) {
  _impl8 = impl;
}
function _i8() {
  if (!_impl8) throw new Error("ui/fsm-auto-advance: no implementation bound (root bootstrap binds it)");
  return _impl8;
}
var autoAdvanceShipment = (...a) => _i8().autoAdvanceShipment(...a);

// output/web/js.tmp/implementations/ui/core_abstractions/ports/data/pnl-line-id.js
var _impl9 = null;
function bindPnlLineId(impl) {
  _impl9 = impl;
}
function _i9() {
  if (!_impl9) throw new Error("ui/pnl-line-id: no implementation bound (root bootstrap binds it)");
  return _impl9;
}
var pnlLineId = (...a) => _i9().pnlLineId(...a);

export {
  bindIdentityProvider,
  getCurrentUser,
  signOut,
  wasPreviouslySignedIn,
  rebuildSessionFromStoredToken,
  bindPnlLineId,
  pnlLineId,
  bindQuoteTotals,
  computeQuoteTotals,
  bindWmaEngine,
  predict,
  onEvent,
  dismissPrediction,
  bindWmaStore,
  loadKindWmaState,
  saveKindWmaState,
  bindMarginPct,
  marginPct,
  bindShipmentSubmit,
  mintShipmentRef,
  resolveJobNo,
  healJobNoCollision,
  nextLedgerVersion,
  resolvePublishState,
  bindFsmAutoAdvance,
  autoAdvanceShipment,
  bindRepCodeRegistry,
  ensureRepCode,
  bindJobNoGen,
  assignJobNo
};
