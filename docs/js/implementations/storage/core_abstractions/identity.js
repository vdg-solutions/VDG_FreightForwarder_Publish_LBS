// identity.js — port: the signed-in identity, as the app's operators see it. Google Identity
// Services is the one provider today (implementations/auth/google-oauth.js binds itself here at
// load); the operators never import the provider, only this port. A second provider (Firebase
// Auth, a plain server login) binds the same four functions.

/// localStorage key of the role cache — one name, shared by the provider's sign-out sweep and the
/// app's role-cache; declared here so neither imports the other for a string.
export const ROLE_CACHE_KEY = 'vdg.role.cache';

let _provider = null;

/// The provider registers { getCurrentUser, signOut, wasPreviouslySignedIn,
/// rebuildSessionFromStoredToken } once, at its own module load.
export function bindIdentityProvider(provider) { _provider = provider; }

function _p() {
  if (!_provider) throw new Error('storage/identity: no identity provider bound (import the provider before the operators run)');
  return _provider;
}

export function getCurrentUser() { return _p().getCurrentUser(); }
export function signOut() { return _p().signOut(); }
export function wasPreviouslySignedIn() { return _p().wasPreviouslySignedIn(); }
export function rebuildSessionFromStoredToken() { return _p().rebuildSessionFromStoredToken(); }

/// Test seam.
export function _resetIdentityProvider() { _provider = null; }
