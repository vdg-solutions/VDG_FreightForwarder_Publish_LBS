// output/web/js.tmp/implementations/ui/core_abstractions/ports/sync/job-tracker.js
var _impl = null;
function bindJobTracker(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/job-tracker: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var jobTracker = {
  /// [{ id, name, progress, status, error, nextRunAt, paused, updatedAt }], newest touch first.
  getJobs: (...a) => _i().getJobs(...a),
  /// (cb) -> unsubscribe
  subscribe: (...a) => _i().subscribe(...a),
  /// (jobId, 'pause' | 'resume' | 'run_now')
  sendCommand: (...a) => _i().sendCommand(...a)
};

export {
  bindJobTracker,
  jobTracker
};
