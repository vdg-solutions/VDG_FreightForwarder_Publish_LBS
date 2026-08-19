// folder-resolve.js — port: "where does this kind/path live?" for the Drive-shaped IO port —
// descend from the workspace root when the caller can see it, off the grant manifest when they
// cannot. Bound to implementations/drive/wasm-folder-resolve.js.

let _impl = null;

/// The adapter registers { resolveFolder, resolveFromManifest, ensureNestedFolder, resolveDir, resolveDirFromManifest, _resetManifestRefresh } once, from the storage bootstrap.
export function bindFolderResolver(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('storage/folder-resolve: no adapter bound (the storage bootstrap binds it)');
  return _impl;
}

export const resolveFolder = (...a) => _i().resolveFolder(...a);
export const resolveFromManifest = (...a) => _i().resolveFromManifest(...a);
export const ensureNestedFolder = (...a) => _i().ensureNestedFolder(...a);
export const resolveDir = (...a) => _i().resolveDir(...a);
export const resolveDirFromManifest = (...a) => _i().resolveDirFromManifest(...a);
export const _resetManifestRefresh = (...a) => _i()._resetManifestRefresh(...a);

/// Test seam.
export function _resetFolderResolver() { _impl = null; }
