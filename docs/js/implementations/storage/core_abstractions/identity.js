// identity.js — port: the signed-in identity, as the app's operators see it. Google Identity
// Services is the one provider today (implementations/auth/google-oauth.js binds itself here at
// load); the operators never import the provider, only this port. A second provider (Firebase
// Auth, a plain server login) binds the same four functions.
//
// The role-cache key moved to identity-cache-keys.js::roleCacheKey() (B-15-38-06 — Rust
// namespaces it by tenant); this file no longer names a storage key at all.

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
