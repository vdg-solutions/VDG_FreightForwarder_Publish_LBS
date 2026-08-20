// visibility.js — port: whether the tab is currently visible (Page Visibility API), for a budget
// that must only bill time the user could actually see. The kernel bootstrap binds `document`.

let _impl = null;

/// The adapter registers { isPageVisible, onVisibilityChange } once, from the kernel bootstrap.
export function bindVisibility(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('kernel/visibility: no adapter bound (the kernel bootstrap binds it)');
  return _impl;
}

/// () -> boolean
export const isPageVisible = (...a) => _i().isPageVisible(...a);
/// (cb) -> unsubscribe fn
export const onVisibilityChange = (...a) => _i().onVisibilityChange(...a);

/// Test seam.
export function _resetVisibility() { _impl = null; }
