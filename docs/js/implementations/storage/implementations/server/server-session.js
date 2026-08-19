// server-session.js — the server-backend half of the identity provider: in server mode the
// session's truth is the vdg-server cookie (30 days), not the one-hour Google token the server
// verified once at sign-in. google-oauth.js asks here who the cookie says we are.

import { apiFetch } from '../../core_abstractions/backend.js';

/// { email, name } of the live server session, or null (no cookie / expired / unreachable).
async function serverSessionIdentity() {
  try {
    const me = await apiFetch('GET', '/me');
    return me?.email ? { email: me.email, name: me.name || '' } : null;
  } catch { return null; } /* a 401 or an unreachable server — the caller falls back to cache or login */
}

/// What the storage bootstrap binds behind the server-session port.
export const serverSession = { serverSessionIdentity };
