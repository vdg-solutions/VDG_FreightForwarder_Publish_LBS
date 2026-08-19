// bundle-heal.js — port: duplicate same-name bundle files merged and collapsed to one winner.
// Bound to implementations/drive/bundle-file-heal.js.

let _impl = null;

/// The adapter registers { healDuplicateBundle, mergeBundleContents } once, from the storage bootstrap.
export function bindBundleHealer(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('storage/bundle-heal: no adapter bound (the storage bootstrap binds it)');
  return _impl;
}

export const healDuplicateBundle = (...a) => _i().healDuplicateBundle(...a);
export const mergeBundleContents = (...a) => _i().mergeBundleContents(...a);

/// Test seam.
export function _resetBundleHealer() { _impl = null; }
