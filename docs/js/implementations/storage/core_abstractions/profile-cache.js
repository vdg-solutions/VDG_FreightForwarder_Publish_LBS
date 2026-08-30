// profile-cache.js — port: last-known DISPLAY identity (name / picture / email). Token expiry
// must not blank the avatar; display only, never an auth decision. Bound to
// implementations/auth/profile-cache.js.

export const PROFILE_KEY = 'vdg.auth.profile';

let _impl = null;

/// The adapter registers { readCachedProfile, writeCachedProfile } once, from the storage bootstrap.
export function bindProfileCache(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('storage/profile-cache: no adapter bound (the storage bootstrap binds it)');
  return _impl;
}

export const readCachedProfile = (...a) => _i().readCachedProfile(...a);
export const writeCachedProfile = (...a) => _i().writeCachedProfile(...a);

/// Test seam.
export function _resetProfileCache() { _impl = null; }
