// F-13-P2 — Google Identity Services wrapper
// F-15-20 merged into F-15-19 R3: single OAuth2 popup grants identity (server build has no
// Drive scope to ask for — see signin-button.js).

import { adoptSessionToken, rememberSessionToken } from '../../core_abstractions/backend.js';
import { SERVER_SESSION_TTL_MS, serverSessionIdentity } from '../../core_abstractions/server-session.js';
import { PROFILE_KEY, writeCachedProfile, readCachedProfile } from '../../core_abstractions/profile-cache.js';
// The synthetic id-token codec (parse/build) is core — no GIS, no client id, no storage.
import { TOKEN_KEY, buildUser, encodeSyntheticIdToken, parseIdToken } from '../../core_abstractions/id-token.js';
import { fetchUserinfo } from './userinfo.js';
import { renderSignInButton as renderGoogleSignInButton } from './signin-button.js';
import { ROLE_CACHE_KEY } from '../../core_abstractions/identity.js';

const CLIENT_ID            = '875515041729-klcro7nakobu353ktf0k2s2fkuu7u38n.apps.googleusercontent.com';
const ACCESS_TOKEN_KEY     = 'vdg.auth.access_token';
const ACCESS_TOKEN_EXP_KEY = 'vdg.auth.access_token_exp';
const GIS_SCRIPT_URL       = 'https://accounts.google.com/gsi/client';
const GIS_SCRIPT_TIMEOUT   = 10_000; // ms
const DEFAULT_TOKEN_TTL_SEC = 3600; // Google's default access-token lifetime when expires_in absent


// Canonical auth-owned localStorage keys — single source of truth (F-15-50 AC-07).
// Add new auth keys here; every clear path picks them up automatically.
export const AUTH_STORAGE_KEYS = Object.freeze([
  TOKEN_KEY, ACCESS_TOKEN_KEY, ACCESS_TOKEN_EXP_KEY, ROLE_CACHE_KEY,
  PROFILE_KEY, 'vdg.session-token', // display profile & server session token
]);

let _currentUser = null; // in-memory cache after parse

// The wasm MODULE, not the repo store — sign-in runs before the repo exists, and wasm-loader.js
// has set window.__vdg_wasm by the time any session call fires (same reasoning as server-role.js).
// The /session requests and their verdicts are Rust's (freight_http); this file only wires them.
function wasmApi() {
  const m = window.__vdg_wasm;
  if (!m?.auth_session_open) throw new Error('WASM module not loaded');
  return m;
}

// ── public API ────────────────────────────────────────────────────────────────

function getCurrentUser() {
  if (_currentUser) return _currentUser;
  const stored = localStorage.getItem(TOKEN_KEY);
  if (!stored) return null;
  _currentUser = buildUser(stored);
  if (!_currentUser) localStorage.removeItem(TOKEN_KEY); // expired/corrupt
  // Backfill the display-profile cache for sessions signed in before PROFILE_KEY existed —
  // otherwise their avatar still blanks at the NEXT hourly expiry.
  if (_currentUser && !localStorage.getItem(PROFILE_KEY)) writeCachedProfile(_currentUser);
  return _currentUser;
}

/// Local state first, then the server. Clearing localStorage only ever made the BROWSER forget:
/// the server's session row stayed valid for its full 30 days and the cookie kept riding along on
/// every request, so "signed out" was a claim about this page, not about the session. On a shared
/// machine that is the whole difference. Returns a promise so a caller can wait for the server
/// half, but the local half has already happened by the time it does.
function signOut() {
  for (const k of AUTH_STORAGE_KEYS) localStorage.removeItem(k); // F-15-50 AC-01
  _currentUser = null;
  // The DELETE must carry the session (Rust attaches the header), so the token is only dropped
  // afterwards — win or lose. auth_session_close never rejects; ok:false is an outage to log,
  // never a reason to keep local state.
  return Promise.resolve()
    .then(() => wasmApi().auth_session_close())
    .then((res) => { if (!res?.ok) console.warn('sign-out: server session not ended: HTTP', res?.status); })
    .catch((e) => { console.warn('sign-out: server session not ended:', e?.message || e); })
    .finally(() => rememberSessionToken(''));
}

// F-19-84 AC-05 — prior sign-in leaves an access-token exp behind (survives id_token expiry, only
// cleared by an explicit signOut()); reused as the "was previously signed in" marker, no new key.
function wasPreviouslySignedIn() { return localStorage.getItem(ACCESS_TOKEN_EXP_KEY) != null; }

// Extend the synthetic id-token session to a new expiry (the fresh access-token exp) WITHOUT
// changing identity — silent renewal keeps the same user, just a later exp. No-op if no id-token.
// The in-memory user cache is this module's, so invalidating it lives here too.
function restampIdTokenExp(accessExpMs) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;
  const payload = parseIdToken(token);
  if (!payload) return false;
  payload.exp = Math.floor(accessExpMs / 1000);          // pin to new access-token exp
  localStorage.setItem(TOKEN_KEY, encodeSyntheticIdToken(payload));
  _currentUser = null;   // force rebuild; email/sub unchanged
  return true;
}

// Shared token/expiry write for the sign-in callback below.
//
// The Google token has exactly one job here — travel to POST /session so the server can verify
// it — and after that no code path reads it back. Storing it anyway left a Google credential in
// localStorage, readable by any script, for its full hour; also clears what an older build left
// behind, rather than waiting out its hour.
function _persistAccessToken(resp) {
  const expMs = Date.now() + (resp.expires_in || DEFAULT_TOKEN_TTL_SEC) * 1000;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_EXP_KEY);
  return expMs;
}

// Session revive WITHOUT GIS (owner model: token lives in ONE place, use it until 401). The
// session's truth is the server cookie, not a Google token — ask the server who this is; a 401
// there is the real "reconnect".
async function rebuildSessionFromStoredToken() {
  const me = await serverSessionIdentity();
  if (!me) return null;
  const cached = readCachedProfile();
  localStorage.setItem(TOKEN_KEY, encodeSyntheticIdToken({
    email: me.email, name: me.name || cached?.name || '', picture: cached?.picture || '', sub: cached?.sub || me.email,
    exp: Math.floor((Date.now() + SERVER_SESSION_TTL_MS) / 1000),
  }));
  _currentUser = null;
  return getCurrentUser();
}

// F-19-84 — full hydrate from a fresh OAuth2 token response. Shared by sign-in and silent boot —
// one hydrate path, no parallel implementation (RULE #5). Persists token+exp, re-mints the
// synthetic id_token from userinfo. Returns the rebuilt user (or null if the mint failed).
async function hydrateSessionFromToken(resp) {
  console.log('[Auth] Hydrating session from token...', { hasAccessToken: !!resp?.access_token });
  _persistAccessToken(resp);
  // The identity lives as long as the server session (30-day cookie), not the one-hour Google
  // token the server verified once at sign-in.
  const expSec = Math.floor((Date.now() + SERVER_SESSION_TTL_MS) / 1000);
  console.log('[Auth] POSTing to /session');
  // No try/catch here on purpose: a failed mint must fail the WHOLE hydrate. Swallowing it used
  // to let a dead POST /session (network blip, 5xx) fall through to writing a durable local
  // identity anyway — "signed in" locally, no server session ever created, and the very state
  // this file exists to recover from. Both callers (signin-button.js, token-refresh.js) already
  // catch a hydrate rejection and show it, not reload into a fresh copy of the same dead end.
  const opened = await wasmApi().auth_session_open(resp.access_token);
  console.log('[Auth] /session POST result:', opened);
  // The verdict is Rust's (freight_wire::adopted_token): token is the header credential for
  // every later request, null when there is nothing to adopt.
  if (opened?.token) {
    console.log('[Auth] Adopting session token...');
    await adoptSessionToken(opened.token);
  }

  console.log('[Auth] Fetching userinfo from Google...');
  const info = await fetchUserinfo(resp.access_token);
  console.log('[Auth] Userinfo fetched:', info);

  const tokenPayload = {
    email: info.email, name: info.name, picture: info.picture, sub: info.sub, exp: expSec,
  };
  console.log('[Auth] Writing TOKEN_KEY with payload:', tokenPayload);
  localStorage.setItem(TOKEN_KEY, encodeSyntheticIdToken(tokenPayload));
  writeCachedProfile(info);
  _currentUser = null; // force rebuild from the freshly-minted token

  const builtUser = getCurrentUser();
  console.log('[Auth] Built user from token:', builtUser);
  return builtUser;
}

// ── GIS script loader ─────────────────────────────────────────────────────────

function loadGisScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const s    = document.createElement('script');
    s.src      = GIS_SCRIPT_URL;
    s.async    = true;
    s.defer    = true;
    s.onload   = resolve;
    s.onerror  = () => reject(new Error('GIS script failed to load'));
    document.head.appendChild(s);
    setTimeout(() => reject(new Error('GIS script timeout')), GIS_SCRIPT_TIMEOUT);
  });
}

// No initialize step — Token Client is per-click
async function initGoogleSignIn(onSuccess, onError) {
  try {
    await loadGisScript();
  } catch (err) {
    if (onError) onError(err);
  }
}

// ── OAuth2 sign-in button ─────────────────────────────────────────────────────
// Markup + click live in signin-button.js; this wrapper keeps the port's one-argument signature
// and hands it the session hydration it must not import for itself.

function renderSignInButton(container) {
  return renderGoogleSignInButton(container, { hydrate: hydrateSessionFromToken, clientId: CLIENT_ID });
}

// ── global bridge ─────────────────────────────────────────────────────────────

if (typeof window !== 'undefined') window.__vdg_auth = { getCurrentUser, signOut };

/// What the storage bootstrap binds behind the identity port and the oauth port.
export const identityProvider = { getCurrentUser, signOut, wasPreviouslySignedIn, rebuildSessionFromStoredToken };
export const oauthProvider = { hydrateSessionFromToken, restampIdTokenExp, initGoogleSignIn, renderSignInButton };
