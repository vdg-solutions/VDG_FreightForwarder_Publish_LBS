// manifest-composer — port: the Cargo Manifest overview's compute (F-16-04 / FSM-11). The
// lifecycle-stage-to-timestamp mapping and the amendment-alert threshold live in wasm; this file
// is the seam the bootstrap binds an implementation onto.

let _impl = null;

/// Root bootstrap binds { overview } once.
export function bindManifestComposer(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/manifest-composer: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (manifests) -> { rows } — one row per voyage, each stamped with its milestone date and
/// amendment alert.
export const composeOverview = (...a) => _i().overview(...a);
