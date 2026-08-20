// timer.js — port: the host's one-shot and repeating timers, as safe-await races the one-shot
// and visible-deadline ticks the repeating one. The kernel bootstrap binds
// setTimeout/clearTimeout/setInterval/clearInterval.

let _impl = null;

/// The adapter registers { startTimer, stopTimer, startInterval, stopInterval } once, from the
/// kernel bootstrap.
export function bindTimer(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('kernel/timer: no adapter bound (the kernel bootstrap binds it)');
  return _impl;
}

/// (fn, ms) -> handle
export const startTimer = (...a) => _i().startTimer(...a);
/// (handle) -> void
export const stopTimer  = (...a) => _i().stopTimer(...a);
/// (fn, ms) -> handle
export const startInterval = (...a) => _i().startInterval(...a);
/// (handle) -> void
export const stopInterval  = (...a) => _i().stopInterval(...a);

/// Test seam.
export function _resetTimer() { _impl = null; }
