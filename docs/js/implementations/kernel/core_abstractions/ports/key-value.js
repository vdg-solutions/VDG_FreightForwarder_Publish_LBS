// key-value.js — port: the per-origin string store (getItem/setItem/removeItem) the session-scoped
// guards and registries write through. The kernel bootstrap binds localStorage.

let _impl = null;

/// The adapter registers { getItem, setItem, removeItem } once, from the kernel bootstrap.
export function bindKeyValueStore(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('kernel/key-value: no adapter bound (the kernel bootstrap binds it)');
  return _impl;
}

/// The bound store object itself — for the registries that take a storage in their constructor.
export function keyValueStore() { return _i(); }

/// (key) -> string | null
export const kvGet    = (...a) => _i().getItem(...a);
/// (key, value) -> void
export const kvSet    = (...a) => _i().setItem(...a);
/// (key) -> void
export const kvRemove = (...a) => _i().removeItem(...a);

/// Test seam.
export function _resetKeyValueStore() { _impl = null; }
