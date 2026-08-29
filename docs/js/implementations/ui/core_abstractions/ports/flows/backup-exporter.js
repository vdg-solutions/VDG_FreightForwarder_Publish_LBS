// backup-exporter — port: export the whole workspace as one zip. Progress arrives as (pct, label)
// with the label already translated by the binding, so the view stays a progress bar.

let _impl = null;

/// Root bootstrap binds { exportWorkspace } once.
export function bindBackupExporter(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/backup-exporter: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (onProgress) -> filename
export const exportWorkspace = (...a) => _i().exportWorkspace(...a);
