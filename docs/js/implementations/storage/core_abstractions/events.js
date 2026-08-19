// events.js — port: the app's event bus as the storage module fires into it (sync chips,
// reconnect, entity-changed). The browser window is the bus in production; the bootstrap binds it
// so no adapter or operator names `window` for an event.

let _impl = null;

/// The adapter registers { dispatchAppEvent } once, from the storage bootstrap.
export function bindEventBus(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('storage/events: no adapter bound (the storage bootstrap binds it)');
  return _impl;
}

export const dispatchAppEvent = (...a) => _i().dispatchAppEvent(...a);

/// Test seam.
export function _resetEventBus() { _impl = null; }
