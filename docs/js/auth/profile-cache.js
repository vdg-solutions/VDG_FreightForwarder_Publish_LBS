// profile-cache.js — last-known DISPLAY identity (name / picture / email).
//
// Token EXPIRY must not blank the avatar — the person did not change when the hour ran out — so
// degraded readers (topbar) fall back to this. Display only, never an auth decision.
// Staleness bound: hydrate OVERWRITES it on every sign-in / reconnect / silent mint, and the
// hourly token cadence forces one of those about every hour — a changed Google photo is at most
// one reconnect behind. signOut clears it (google-oauth AUTH_STORAGE_KEYS): sign-out DOES change
// the person.

export const PROFILE_KEY = 'vdg.auth.profile';

/** Last-known display identity, or null. */
export function readCachedProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); }
  catch { return null; /* corrupt cache — the initials fallback still renders */ }
}

export function writeCachedProfile({ email, name, picture } = {}) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({
    email: email || '', name: name || '', picture: picture || '',
  }));
}
