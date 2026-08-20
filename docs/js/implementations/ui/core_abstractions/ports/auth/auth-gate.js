// auth-gate — port: the sign-in gate as its callers ask for it. The root bootstrap binds it to the
// wasm freight_app exports (the decisions) plus the browser platform (the session, the probe, the
// login overlay); the ui never sees either.

let _impl = null;

/// Root bootstrap binds { requireAuth, detectRoleViaDrive, clearRoleCache } once.
export function bindAuthGate(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/auth-gate: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (onSignedIn) -> resolves once the session is live (or the login screen has been mounted).
export const requireAuth = (...a) => _i().requireAuth(...a);
/// (user, { force }) -> the resolved role token; rejects with the real error when the workspace
/// authority could not answer — a failed request is never "this user has no roles".
export const detectRoleViaDrive = (...a) => _i().detectRoleViaDrive(...a);
/// () -> drops this browser's cached verdict so the next probe is fresh.
export const clearRoleCache = (...a) => _i().clearRoleCache(...a);
