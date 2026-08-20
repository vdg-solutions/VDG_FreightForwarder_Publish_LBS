// app-events.js — port: the app's event bus as the kernel fires into it (locale changed). The
// browser window is the bus in production; the kernel bootstrap binds it.

let _impl = null;

/// The adapter registers { dispatchAppEvent } once, from the kernel bootstrap.
export function bindAppEvents(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('kernel/app-events: no adapter bound (the kernel bootstrap binds it)');
  return _impl;
}

/// (name, detail) -> void
export const dispatchAppEvent = (...a) => _i().dispatchAppEvent(...a);

/// Test seam.
export function _resetAppEvents() { _impl = null; }
