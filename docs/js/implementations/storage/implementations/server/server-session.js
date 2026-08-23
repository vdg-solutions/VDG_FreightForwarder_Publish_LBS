// server-session.js — the server-backend half of the identity provider: in server mode the
// session's truth is the vdg-server cookie (30 days), not the one-hour Google token the server
// verified once at sign-in. google-oauth.js asks here who the cookie says we are.

import { apiFetch } from '../../core_abstractions/backend.js';

async function serverSessionIdentity() {
  try {
    console.log('[Auth] Fetching /me to check server session...');
    const me = await apiFetch('GET', '/me');
    console.log('[Auth] /me response:', me);
    return me?.email ? { email: me.email, name: me.name || '' } : null;
  } catch (e) {
    console.error('[Auth] serverSessionIdentity failed (401 or unreachable):', e);
    return null;
  } /* a 401 or an unreachable server — the caller falls back to cache or login */
}

/// What the storage bootstrap binds behind the server-session port.
export const serverSession = { serverSessionIdentity };
