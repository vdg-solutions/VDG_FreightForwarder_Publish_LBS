// oauth-scope.js — the OAuth2 scope this (server-only) build ever asks Google for: identity, so
// the server can verify who signed in. There is no Drive scope to request or track — the server
// owns Drive entirely and the browser never touches it.
export const IDENTITY_SCOPE = 'openid email profile';
