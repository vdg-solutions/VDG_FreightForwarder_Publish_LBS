// identity-cache-keys.js — port: the namespaced localStorage/sessionStorage keys an
// identity-derived cache lives under (B-15-38-06).
//
// PROD and DEV publish to ONE origin (vdg-solutions.github.io), differing only by base path.
// localStorage/sessionStorage are scoped to the ORIGIN, not the path, so a bare key let whichever
// tenant wrote last answer for both — measured on PROD 2026-09-06: `sol.vdg01@gmail.com` read back
// a role cache Dev had written, on an account PROD grants nothing.
//
// Owner ruling 2026-09-07: the key is a business decision (which tenant this cache belongs to),
// so Rust derives it (freight_app/core_abstractions/identity_cache_keys.rs), not this file. This
// module only asks ONCE, at boot, and hands the resolved strings to whoever needs them — it never
// builds one itself.

// Pre-resolve fallback only. `resolveIdentityCacheKeys` always runs (app.js, right after the wasm
// module loads, before requireAuth or any storage read reaches these) — these bare literals exist
// so an accidental early call degrades to the OLD shape rather than throwing, never as the value
// this module intends any real read/write to use.
let _keys = {
  role_cache: 'vdg.role.cache',
  id_token: 'vdg.auth.id_token',
  profile: 'vdg.auth.profile',
  access_token: 'vdg.auth.access_token',
  access_token_exp: 'vdg.auth.access_token_exp',
  access_token_issued: 'vdg.auth.access_token_issued',
  session_token: 'vdg.session-token',
};

/// Called once at boot (app.js, right after `wasmReady` resolves) — pure on the Rust side, no
/// `freight_app_init` dependency, so it can run ahead of composeAuth/requireAuth.
export function resolveIdentityCacheKeys(wasm) {
  const resolved = wasm.auth_identity_cache_keys();
  _keys = {
    role_cache: resolved.role_cache,
    id_token: resolved.id_token,
    profile: resolved.profile,
    access_token: resolved.access_token,
    access_token_exp: resolved.access_token_exp,
    access_token_issued: resolved.access_token_issued,
    session_token: resolved.session_token,
  };
}

export const roleCacheKey         = () => _keys.role_cache;
export const idTokenKey           = () => _keys.id_token;
export const profileKey           = () => _keys.profile;
export const accessTokenKey       = () => _keys.access_token;
export const accessTokenExpKey    = () => _keys.access_token_exp;
export const accessTokenIssuedKey = () => _keys.access_token_issued;
export const sessionTokenKey      = () => _keys.session_token;

/// Test seam.
export function _resetIdentityCacheKeysForTest() {
  _keys = {
    role_cache: 'vdg.role.cache', id_token: 'vdg.auth.id_token', profile: 'vdg.auth.profile',
    access_token: 'vdg.auth.access_token', access_token_exp: 'vdg.auth.access_token_exp',
    access_token_issued: 'vdg.auth.access_token_issued', session_token: 'vdg.session-token',
  };
}
