// oauth.js — port: the Google sign-in provider's session operations the other adapters drive
// (re-hydrating the session after an interactive mint, the sign-in UI the login view mounts).
// Bound to implementations/auth/google-oauth.js.

let _impl = null;

/// The adapter registers { hydrateSessionFromToken, restampIdTokenExp, initGoogleSignIn, renderSignInButton } once, from the storage bootstrap.
export function bindOAuthProvider(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('storage/oauth: no adapter bound (the storage bootstrap binds it)');
  return _impl;
}

export const hydrateSessionFromToken = (...a) => _i().hydrateSessionFromToken(...a);
export const restampIdTokenExp = (...a) => _i().restampIdTokenExp(...a);
export const initGoogleSignIn = (...a) => _i().initGoogleSignIn(...a);
export const renderSignInButton = (...a) => _i().renderSignInButton(...a);

/// Test seam.
export function _resetOAuthProvider() { _impl = null; }
