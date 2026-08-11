// role-cache.js — what this browser remembers about the last role resolution.
//
// Split out of auth-gate.js at the 350-line cap, along its own seam: pure localStorage, no Drive
// call and no DOM. auth-gate owns the probe and the session state; this owns only the memory of
// what a probe once answered.
//
// #30: the cache carries the ROLE SET, not just the fork token. It used to hold the token alone
// and rebuild roles from it, which now (correctly) answers "no roles" for a fork — a cached
// employee lost every role they had until the TTL expired.

import { ROLE_CACHE_KEY } from './google-oauth.js';

const ROLE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min — refresh on each session

export function readCachedRole(email) {
  try {
    const raw = localStorage.getItem(ROLE_CACHE_KEY);
    if (!raw) return null;
    const { email: e, role, roles, ts } = JSON.parse(raw);
    if (e !== email) return null;
    if (Date.now() - ts > ROLE_CACHE_TTL_MS) return null;
    return { role, roles: Array.isArray(roles) ? roles : null };
  } catch { return null; }
}

export function writeCachedRole(email, role, roles = null) {
  try { localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify({ email, role, roles, ts: Date.now() })); }
  catch { /* quota — a lost cache costs one extra probe, nothing else */ }
}

export function clearCachedRole() {
  localStorage.removeItem(ROLE_CACHE_KEY);
}

// F-57-01 AC-04: TTL-unbounded raw read — a degraded cold-boot restore is a best-effort local
// render, not a live permission grant (the Drive ACL still gates every write), so a role cached
// hours ago is still the best available signal once the network itself is the thing that is down.
// Deliberately bypasses readCachedRole's TTL gate.
export function readCachedIdentityRaw() {
  try {
    const raw = localStorage.getItem(ROLE_CACHE_KEY);
    if (!raw) return null;
    const { email, role } = JSON.parse(raw);
    return email && role ? { email, role } : null;
  } catch { return null; }
}
