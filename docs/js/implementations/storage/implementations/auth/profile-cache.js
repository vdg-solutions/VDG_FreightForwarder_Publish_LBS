// profile-cache.js — last-known DISPLAY identity (name / picture / email).
//
// Token EXPIRY must not blank the avatar — the person did not change when the hour ran out — so
// degraded readers (topbar) fall back to this. Display only, never an auth decision.
// Staleness bound: hydrate OVERWRITES it on every sign-in / reconnect / silent mint, and the
// hourly token cadence forces one of those about every hour — a changed Google photo is at most
// one reconnect behind. signOut clears it (google-oauth authStorageKeys()): sign-out DOES change
// the person.

import { profileKey } from '../../core_abstractions/identity-cache-keys.js';

/** Last-known display identity, or null. */
function readCachedProfile() {
  try { return JSON.parse(localStorage.getItem(profileKey()) || 'null'); }
  catch { return null; /* corrupt cache — the initials fallback still renders */ }
}

function writeCachedProfile({ email, name, picture } = {}) {
  localStorage.setItem(profileKey(), JSON.stringify({
    email: email || '', name: name || '', picture: picture || '',
  }));
}

/// What the storage bootstrap binds behind the profile-cache port.
export const profileCache = { readCachedProfile, writeCachedProfile };
