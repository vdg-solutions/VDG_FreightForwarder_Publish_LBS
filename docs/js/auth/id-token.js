// id-token.js — the synthetic id-token codec, split out of google-oauth.js at the 350-line cap.
// Everything here is about ONE thing: turning the stored `vdg.auth.id_token` string into a user
// and back. No GIS, no client id, no network — so it stays out of the build-time client-id
// substitution list (Makefile seds google-oauth.js / drive-api.js / access-token.js only).

export const TOKEN_KEY = 'vdg.auth.id_token';

export function parseIdToken(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json   = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    /* malformed token — treat as missing */
    return null;
  }
}

export function buildUser(token) {
  const payload = parseIdToken(token);
  if (!payload) return null;
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < nowSec) return null; // expired
  return {
    email:    payload.email   || '',
    name:     payload.name    || '',
    picture:  payload.picture || '',
    sub:      payload.sub     || '',
    id_token: token,
  };
}

// Single source of the unsigned header.payload. format consumed by parseIdToken. UTF-8 safe.
export function encodeSyntheticIdToken(payload) {
  const header = btoa(JSON.stringify({ alg: 'none' }));
  const body   = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  return `${header}.${body}.`;
}

// Extend the synthetic id-token session to a new expiry (the fresh access-token exp) WITHOUT
// changing identity — silent renewal keeps the same user, just a later exp. No-op if no id-token.
// The caller owns the in-memory user cache and invalidates it on a true return.
export function restampStoredIdTokenExp(accessExpMs) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;
  const payload = parseIdToken(token);
  if (!payload) return false;
  payload.exp = Math.floor(accessExpMs / 1000);          // pin to new access-token exp
  localStorage.setItem(TOKEN_KEY, encodeSyntheticIdToken(payload));
  return true;
}
