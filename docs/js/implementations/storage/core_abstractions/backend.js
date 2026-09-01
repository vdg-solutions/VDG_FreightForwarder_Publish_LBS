// backend.js — port: the ONE storage authority this page talks to (vdg-server, same-origin or
// behind API_BASE). Probed once at boot by the adapter (implementations/server/backend.js) and
// remembered for the session. No request-building here: every server call is Rust's
// (freight_http / me_http / charterdb-client); this port carries only the backend memo and the
// session-token storage the sign-in flow writes.

let _impl = null;

/// The adapter registers { detectBackend, rememberSessionToken, adoptSessionToken,
/// _resetBackend } once, from the storage bootstrap.
export function bindBackend(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('storage/backend: no adapter bound (the storage bootstrap binds it)');
  return _impl;
}

export const detectBackend = (...a) => _i().detectBackend(...a);
export const rememberSessionToken = (...a) => _i().rememberSessionToken(...a);
export const adoptSessionToken = (...a) => _i().adoptSessionToken(...a);
export const _resetBackend = (...a) => _i()._resetBackend(...a);

/// Test seam.
export function _resetBackendPort() { _impl = null; }
