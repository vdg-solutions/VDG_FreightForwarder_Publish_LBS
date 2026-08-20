// awb-repo.js — ui port: the AWB storage adapter the manager AWB grid reads and writes through.
// Bound to the Drive-backed AwbDriveRepo by compose-ui/storage.js.

let _impl = null;

/// The adapter registers an AwbDriveRepo-shaped instance once, from compose-ui/storage.js.
export function bindAwbRepo(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/awb-repo: no adapter bound (compose-ui binds it)');
  return _impl;
}

/// Same method names/signatures AwbDriveRepo carried — views call this object exactly as they
/// called `new AwbDriveRepo()` before.
export const awbRepo = {
  listByMonth:   (...a) => _i().listByMonth(...a),
  append:        (...a) => _i().append(...a),
  deleteByAwbNo: (...a) => _i().deleteByAwbNo(...a),
};

/// Test seam.
export function _resetAwbRepo() { _impl = null; }
