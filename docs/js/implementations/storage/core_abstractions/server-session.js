// server-session.js — port: who the vdg-server cookie says we are (server mode: the session's
// truth is the 30-day cookie, not the one-hour Google token). Bound to
// implementations/server/server-session.js.

/// Mirrors server operators/session.rs SESSION_TTL_DAYS.
export const SERVER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

let _impl = null;

/// The adapter registers { serverSessionIdentity } once, from the storage bootstrap.
export function bindServerSession(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('storage/server-session: no adapter bound (the storage bootstrap binds it)');
  return _impl;
}

export const serverSessionIdentity = (...a) => _i().serverSessionIdentity(...a);

/// Test seam.
export function _resetServerSession() { _impl = null; }
