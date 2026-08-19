// file-dedup.js — port: create-or-reuse a file by name under a parent, collapsing same-name
// duplicates to the lowest id. Bound to implementations/drive/drive-file-dedup.js.

let _impl = null;

/// The adapter registers { getOrCreateFile } once, from the storage bootstrap.
export function bindFileDedup(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('storage/file-dedup: no adapter bound (the storage bootstrap binds it)');
  return _impl;
}

export const getOrCreateFile = (...a) => _i().getOrCreateFile(...a);

/// Test seam.
export function _resetFileDedup() { _impl = null; }
