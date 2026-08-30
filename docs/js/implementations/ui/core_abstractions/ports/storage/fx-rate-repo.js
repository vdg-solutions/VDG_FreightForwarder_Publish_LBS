// fx-rate-repo.js — ui port: the fx-rate storage adapter the manager grid and the sales-new form
// read and write through. Bound to the server-backed FxRateStoreRepo by compose-ui/storage.js.

let _impl = null;

/// The adapter registers a FxRateStoreRepo-shaped instance once, from compose-ui/storage.js.
export function bindFxRateRepo(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/fx-rate-repo: no adapter bound (compose-ui binds it)');
  return _impl;
}

/// Same method names/signatures FxRateStoreRepo carried — views call this object exactly as
/// they called `new FxRateStoreRepo()` before.
export const fxRateRepo = {
  getRate:         (...a) => _i().getRate(...a),
  appendRate:      (...a) => _i().appendRate(...a),
  invalidateMonth: (...a) => _i().invalidateMonth(...a),
  listByMonth:     (...a) => _i().listByMonth(...a),
  listAll:         (...a) => _i().listAll(...a),
  deleteEntry:     (...a) => _i().deleteEntry(...a),
  // F-29-01: fx-lookup.js's wasm-backed pair/direction/cache rules — see fx-rate-repo.js impl.
  pnlFxLookupPair:       (...a) => _i().pnlFxLookupPair(...a),
  pnlFxRequireDirection: (...a) => _i().pnlFxRequireDirection(...a),
  pnlFxCacheGet:         (...a) => _i().pnlFxCacheGet(...a),
  pnlFxCachePut:         (...a) => _i().pnlFxCachePut(...a),
  pnlFxCacheClear:       (...a) => _i().pnlFxCacheClear(...a),
};

/// Test seam.
export function _resetFxRateRepo() { _impl = null; }
