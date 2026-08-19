// id-token.js — the synthetic id-token codec: turning the stored `vdg.auth.id_token` string into a
// user and back. No GIS, no client id, no network, no storage — pure.

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
