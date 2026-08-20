// log.js — port: where a kernel helper reports a non-fatal condition (a skipped malformed line,
// a timed-out await). The kernel bootstrap binds the console.

let _impl = null;

/// The adapter registers { warn } once, from the kernel bootstrap.
export function bindLog(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('kernel/log: no adapter bound (the kernel bootstrap binds it)');
  return _impl;
}

/// (...args) -> void
export const logWarn = (...a) => _i().warn(...a);

/// Test seam.
export function _resetLog() { _impl = null; }
