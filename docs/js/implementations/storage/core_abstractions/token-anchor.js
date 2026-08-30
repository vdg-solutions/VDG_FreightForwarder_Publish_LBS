// token-anchor.js — port: the TokenAnchor factory (browser-only Google access-token authority,
// implementations/auth/token-anchor.js). The event names it emits are contract.

export const ANCHOR_EVT_POPUP_BLOCKED   = 'popup-blocked';
export const ANCHOR_EVT_SIGNIN_REQUIRED = 'signin-required';

let _impl = null;

/// The adapter registers { createTokenAnchor } once, from the storage bootstrap.
export function bindTokenAnchorFactory(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('storage/token-anchor: no adapter bound (the storage bootstrap binds it)');
  return _impl;
}

export const createTokenAnchor = (...a) => _i().createTokenAnchor(...a);

/// Test seam.
export function _resetTokenAnchorFactory() { _impl = null; }
