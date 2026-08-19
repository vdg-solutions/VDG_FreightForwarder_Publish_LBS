// rep-code-registry.js — port: the rep code registry use-case as its collaborators call it; the freight_app bootstrap binds
// the operator (operators/rep-code-registry.js) behind it. Constants and error shapes are contract and live here.

let _impl = null;

/// The operator registers { isValidRepCode, assignRepCode, ensureRepCode, assertRepCodeAssignable } once, from the freight_app bootstrap.
export function bindRepCodeRegistry(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('freight_app/rep-code-registry: no operator bound (the freight_app bootstrap binds it)');
  return _impl;
}

export const isValidRepCode = (...a) => _i().isValidRepCode(...a);
export const assignRepCode = (...a) => _i().assignRepCode(...a);
export const ensureRepCode = (...a) => _i().ensureRepCode(...a);
export const assertRepCodeAssignable = (...a) => _i().assertRepCodeAssignable(...a);

/// Test seam.
export function _resetRepCodeRegistry() { _impl = null; }
