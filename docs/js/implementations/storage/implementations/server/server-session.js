// server-session.js — the server-backend half of the identity provider: in server mode the
// session's truth is the vdg-server session (30 days), not the one-hour Google token the server
// verified once at sign-in. google-oauth.js asks here who the session says we are.
//
// The /me call is Rust's (store::implementations::http_io::fetch_me).
//
// This used to `catch (e) { return null }`, which gave the SAME answer for "the session says
// nobody" and "the server could not be reached" — the collapse this whole change set exists to
// undo. A caller that cannot tell those apart signs a live user out on a network blip. The failure
// now propagates; identity_from_session's caller decides.

import { probeRole } from './server-role.js';

async function serverSessionIdentity() {
  const me = await probeRole(null, null);
  return me?.email ? { email: me.email, name: me.name || '' } : null;
}

/// What the storage bootstrap binds behind the server-session port.
export const serverSession = { serverSessionIdentity };
