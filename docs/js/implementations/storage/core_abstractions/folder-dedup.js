// folder-dedup.js — port: owner-wide folder search + same-name dedup/reparent (Drive lists by
// ownership, not lineage). Bound to implementations/drive/drive-folder-dedup.js.

let _impl = null;

/// The adapter registers { resolveRealParentId, globalOwnerQuery, moveToParent, dedupeGlobalOwnerFolders } once, from the storage bootstrap.
export function bindFolderDedup(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('storage/folder-dedup: no adapter bound (the storage bootstrap binds it)');
  return _impl;
}

export const resolveRealParentId = (...a) => _i().resolveRealParentId(...a);
export const globalOwnerQuery = (...a) => _i().globalOwnerQuery(...a);
export const moveToParent = (...a) => _i().moveToParent(...a);
export const dedupeGlobalOwnerFolders = (...a) => _i().dedupeGlobalOwnerFolders(...a);

/// Test seam.
export function _resetFolderDedup() { _impl = null; }
