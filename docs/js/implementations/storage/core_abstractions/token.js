// token.js — port: the Google access token as the adapters may ask for it. Owner model ("lúc 401
// mới cần"): a read never re-mints; a real 401 recovers once through the anchor rule; the
// reconnect chip is the only interactive mint. Bound to implementations/auth/access-token.js.

/// F-50-01 — mint time, feeds eagerRefreshDue. The key is contract; the writer is the adapter.
export const ACCESS_TOKEN_ISSUED_KEY = 'vdg.auth.access_token_issued';

let _impl = null;

/// The adapter registers { getAccessToken, refreshAccessTokenSilently, recoverFromUnauthorized, reconnectInteractive } once, from the storage bootstrap.
export function bindTokenAuthority(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('storage/token: no adapter bound (the storage bootstrap binds it)');
  return _impl;
}

export const getAccessToken = (...a) => _i().getAccessToken(...a);
export const refreshAccessTokenSilently = (...a) => _i().refreshAccessTokenSilently(...a);
export const recoverFromUnauthorized = (...a) => _i().recoverFromUnauthorized(...a);
export const reconnectInteractive = (...a) => _i().reconnectInteractive(...a);

/// Test seam.
export function _resetTokenAuthority() { _impl = null; }
