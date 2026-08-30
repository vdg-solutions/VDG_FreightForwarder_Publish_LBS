// error-log-store — port: the manager's errors viewer. Reading is a store read; purging drops a
// whole month's bundle file, which is storage administration and stays out of the view.

let _impl = null;

/// Root bootstrap binds { listErrorRecords, purgeErrorMonth } once.
export function bindErrorLogStore(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/error-log-store: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (repo) -> the log, newest first
export const listErrorRecords = (...a) => _i().listErrorRecords(...a);
/// (month) -> drops that month's bundle
export const purgeErrorMonth = (...a) => _i().purgeErrorMonth(...a);
