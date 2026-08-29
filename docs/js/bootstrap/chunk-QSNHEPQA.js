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
var ROLE_CACHE_KEY = "vdg.role.cache";
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

// output/web/js.tmp/implementations/ui/core_abstractions/ports/data/pnl-line-id.js
var _impl3 = null;
function bindPnlLineId(impl) {
  _impl3 = impl;
}
function _i3() {
  if (!_impl3) throw new Error("ui/pnl-line-id: no implementation bound (root bootstrap binds it)");
  return _impl3;
}
var pnlLineId = (...a) => _i3().pnlLineId(...a);
var deletePnlLinesFor = (...a) => _i3().deletePnlLinesFor(...a);

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

// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/fsm-auto-advance.js
var _impl6 = null;
function bindFsmAutoAdvance(impl) {
  _impl6 = impl;
}
function _i6() {
  if (!_impl6) throw new Error("ui/fsm-auto-advance: no implementation bound (root bootstrap binds it)");
  return _impl6;
}
var autoAdvanceShipment = (...a) => _i6().autoAdvanceShipment(...a);

// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/pnl-commit-orchestrator.js
var _impl7 = null;
function bindPnlCommit(impl) {
  _impl7 = impl;
}
function _i7() {
  if (!_impl7) throw new Error("ui/pnl-commit-orchestrator: no implementation bound (root bootstrap binds it)");
  return _impl7;
}
var slugify = (...a) => _i7().slugify(...a);

export {
  ROLE_CACHE_KEY,
  bindIdentityProvider,
  getCurrentUser,
  signOut,
  wasPreviouslySignedIn,
  rebuildSessionFromStoredToken,
  bindPnlLineId,
  pnlLineId,
  deletePnlLinesFor,
  bindPnlCommit,
  slugify,
  bindWmaEngine,
  predict,
  onEvent,
  dismissPrediction,
  bindWmaStore,
  loadKindWmaState,
  saveKindWmaState,
  bindFsmAutoAdvance,
  autoAdvanceShipment,
  bindRepCodeRegistry,
  ensureRepCode,
  bindJobNoGen,
  assignJobNo
};
