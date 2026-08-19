// oauth.js — port: the Google sign-in provider's session operations the other adapters drive
// (scope bookkeeping, re-hydrating the session after an interactive mint, the sign-in UI the
// login view mounts). Bound to implementations/drive/google-oauth.js.

let _impl = null;

/// The adapter registers { clearDriveScopeGrant, hydrateSessionFromToken, restampIdTokenExp, initGoogleSignIn, renderSignInButton, requestDriveScopeGrant, shouldGrantDriveScope } once, from the storage bootstrap.
export function bindOAuthProvider(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('storage/oauth: no adapter bound (the storage bootstrap binds it)');
  return _impl;
}

export const clearDriveScopeGrant = (...a) => _i().clearDriveScopeGrant(...a);
export const hydrateSessionFromToken = (...a) => _i().hydrateSessionFromToken(...a);
export const restampIdTokenExp = (...a) => _i().restampIdTokenExp(...a);
export const initGoogleSignIn = (...a) => _i().initGoogleSignIn(...a);
export const renderSignInButton = (...a) => _i().renderSignInButton(...a);
export const requestDriveScopeGrant = (...a) => _i().requestDriveScopeGrant(...a);
export const shouldGrantDriveScope = (...a) => _i().shouldGrantDriveScope(...a);

/// Test seam.
export function _resetOAuthProvider() { _impl = null; }
