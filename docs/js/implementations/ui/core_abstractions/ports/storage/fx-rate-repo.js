// fx-rate-repo.js — ui port: the fx-rate storage adapter the manager grid and the sales-new form
// read and write through. Bound to the Drive-backed FxRateDriveRepo by compose-ui/storage.js.

let _impl = null;

/// The adapter registers a FxRateDriveRepo-shaped instance once, from compose-ui/storage.js.
export function bindFxRateRepo(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/fx-rate-repo: no adapter bound (compose-ui binds it)');
  return _impl;
}

/// Same method names/signatures FxRateDriveRepo carried — views call this object exactly as
/// they called `new FxRateDriveRepo()` before.
export const fxRateRepo = {
  getRate:         (...a) => _i().getRate(...a),
  appendRate:      (...a) => _i().appendRate(...a),
  invalidateMonth: (...a) => _i().invalidateMonth(...a),
  listByMonth:     (...a) => _i().listByMonth(...a),
  listAll:         (...a) => _i().listAll(...a),
  deleteEntry:     (...a) => _i().deleteEntry(...a),
};

/// Test seam.
export function _resetFxRateRepo() { _impl = null; }
