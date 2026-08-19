// popup-guard.js — port: make sure window.open is callable before a GIS popup (an ad-blocker
// may have nulled or wrapped it). Bound to implementations/drive/window-open-guard.js.

let _impl = null;

/// The adapter registers { ensureWindowOpen, isNativeOpen } once, from the storage bootstrap.
export function bindPopupGuard(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('storage/popup-guard: no adapter bound (the storage bootstrap binds it)');
  return _impl;
}

export const ensureWindowOpen = (...a) => _i().ensureWindowOpen(...a);
export const isNativeOpen = (...a) => _i().isNativeOpen(...a);

/// Test seam.
export function _resetPopupGuard() { _impl = null; }
