// job-tracker — port: the background-jobs panel's view of what is running. The root bootstrap
// owns the window events and binds the tracker; the view only reads and commands.

let _impl = null;

/// Root bootstrap binds { getJobs, subscribe, sendCommand } once.
export function bindJobTracker(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/job-tracker: no implementation bound (root bootstrap binds it)');
  return _impl;
}

export const jobTracker = {
  /// [{ id, name, progress, status, error, nextRunAt, paused, updatedAt }], newest touch first.
  getJobs: (...a) => _i().getJobs(...a),
  /// (cb) -> unsubscribe
  subscribe: (...a) => _i().subscribe(...a),
  /// (jobId, 'pause' | 'resume' | 'run_now')
  sendCommand: (...a) => _i().sendCommand(...a),
};
