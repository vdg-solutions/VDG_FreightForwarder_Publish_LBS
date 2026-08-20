// clock.js — port: the host's Date. The one place a kernel helper learns what instant it is, or
// turns a stored value into a Date (host zone). The kernel bootstrap binds the browser Date.

let _impl = null;

/// The adapter registers { nowMs, nowDate, dateFrom } once, from the kernel bootstrap.
export function bindClock(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('kernel/clock: no adapter bound (the kernel bootstrap binds it)');
  return _impl;
}

/// () -> epoch ms
export const nowMs    = (...a) => _i().nowMs(...a);
/// () -> Date
export const nowDate  = (...a) => _i().nowDate(...a);
/// (iso | epoch ms | Date) -> Date
export const dateFrom = (...a) => _i().dateFrom(...a);

/// Test seam.
export function _resetClock() { _impl = null; }
