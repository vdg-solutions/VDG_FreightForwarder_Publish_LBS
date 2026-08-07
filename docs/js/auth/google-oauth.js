// F-13-P2 — Google Identity Services wrapper
// F-15-20 merged into F-15-19 R3: single OAuth2 popup grants identity + drive.file scope

import { ensureWindowOpen } from './window-open-guard.js';

const CLIENT_ID            = '566948941006-ju52hf1hvpiv8gv3qu6slt58c7utgicf.apps.googleusercontent.com';
const TOKEN_KEY            = 'vdg.auth.id_token';
const ACCESS_TOKEN_KEY     = 'vdg.auth.access_token';
const ACCESS_TOKEN_EXP_KEY = 'vdg.auth.access_token_exp';
const DRIVE_SCOPE_KEY      = 'vdg.auth.drive_scope_granted';
const ROLE_CACHE_KEY       = 'vdg.role.cache';
const GIS_SCRIPT_URL       = 'https://accounts.google.com/gsi/client';
const GIS_SCRIPT_TIMEOUT   = 10_000; // ms
const DRIVE_SCOPE          = 'https://www.googleapis.com/auth/drive.file';
const USERINFO_URL         = 'https://www.googleapis.com/oauth2/v3/userinfo';
const DEFAULT_TOKEN_TTL_SEC = 3600; // Google's default access-token lifetime when expires_in absent
const USERINFO_FETCH_TIMEOUT_MS = 8000; // F-57-01 AC-01: matches SAFE_AWAIT_DEFAULT_MS/REPO_INIT_TIMEOUT_MS convention

// F-35-01 AC-02 — mirrors access-token.js: GIS error_callback types meaning "popup blocked".
const GIS_ERROR_POPUP_FAILED = 'popup_failed_to_open';
const GIS_ERROR_POPUP_CLOSED = 'popup_closed';
function _isPopupBlockedError(type) { return type === GIS_ERROR_POPUP_FAILED || type === GIS_ERROR_POPUP_CLOSED; }
function _gisErrorMessage(err) {
  const type = err?.type || 'unknown';
  return _isPopupBlockedError(type) ? `popup-blocked:${type}` : `gis-error:${type}`;
}

// Canonical auth-owned localStorage keys — single source of truth (F-15-50 AC-07).
// Add new auth keys here; every clear path picks them up automatically.
export const AUTH_STORAGE_KEYS = Object.freeze([
  TOKEN_KEY,
  ACCESS_TOKEN_KEY,
  ACCESS_TOKEN_EXP_KEY,
  DRIVE_SCOPE_KEY,
  ROLE_CACHE_KEY,
]);

export { ROLE_CACHE_KEY };

let _currentUser = null; // in-memory cache after parse

// ── JWT helpers ───────────────────────────────────────────────────────────────

export function parseIdToken(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json   = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    /* malformed token — treat as missing */
    return null;
  }
}

function buildUser(token) {
  const payload = parseIdToken(token);
  if (!payload) return null;
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < nowSec) return null; // expired
  return {
    email:    payload.email   || '',
    name:     payload.name    || '',
    picture:  payload.picture || '',
    sub:      payload.sub     || '',
    id_token: token,
  };
}

// ── public API ────────────────────────────────────────────────────────────────

export function getCurrentUser() {
  if (_currentUser) return _currentUser;
  const stored = localStorage.getItem(TOKEN_KEY);
  if (!stored) return null;
  _currentUser = buildUser(stored);
  if (!_currentUser) localStorage.removeItem(TOKEN_KEY); // expired/corrupt
  return _currentUser;
}

export function signOut() {
  for (const k of AUTH_STORAGE_KEYS) localStorage.removeItem(k); // F-15-50 AC-01
  _currentUser = null;
}

// ── Drive scope grant flag ───────────────────────────────────────────────────
// F-24-19: DRIVE_SCOPE_KEY records whether the live token actually carries drive.file —
// Google's consent screen lets the user untick the Drive checkbox, so this must be gated
// on the real grant, never written unconditionally.

// Pure predicate — exported so callers test it without a DOM/click. hasGrantedAllScopesFn
// defaults to window.google.accounts.oauth2.hasGrantedAllScopes; when that global is
// absent, falls back to a space-delimited DRIVE_SCOPE check on resp.scope.
export function shouldGrantDriveScope(resp, hasGrantedAllScopesFn) {
  const checkFn = hasGrantedAllScopesFn ?? window.google?.accounts?.oauth2?.hasGrantedAllScopes;
  if (typeof checkFn === 'function') return Boolean(checkFn(resp, DRIVE_SCOPE));
  return (resp?.scope || '').split(' ').includes(DRIVE_SCOPE);
}

export function hasDriveScopeGrant() { return localStorage.getItem(DRIVE_SCOPE_KEY) === '1'; } // AC-03 reader

export function clearDriveScopeGrant() { localStorage.removeItem(DRIVE_SCOPE_KEY); } // AC-05

// F-19-84 AC-05 — prior sign-in leaves an access-token exp behind (survives id_token expiry,
// only cleared by an explicit signOut()). Reused as the "was previously signed in" marker —
// no new localStorage key.
export function wasPreviouslySignedIn() { return localStorage.getItem(ACCESS_TOKEN_EXP_KEY) != null; }

// Single source of the unsigned header.payload. format consumed by parseIdToken. UTF-8 safe.
function _encodeSyntheticIdToken(payload) {
  const header = btoa(JSON.stringify({ alg: 'none' }));
  const body   = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  return `${header}.${body}.`;
}

// Extend the synthetic id-token session to a new expiry (the fresh access-token exp) WITHOUT
// changing identity — silent renewal keeps the same user, just a later exp. No-op if no id-token.
export function restampIdTokenExp(accessExpMs) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;
  const payload = parseIdToken(token);
  if (!payload) return false;
  payload.exp = Math.floor(accessExpMs / 1000);          // pin to new access-token exp
  localStorage.setItem(TOKEN_KEY, _encodeSyntheticIdToken(payload));
  _currentUser = null;                                   // force rebuild; email/sub unchanged
  return true;
}

// Shared token/expiry write for both the sign-in callback and the re-consent flow below.
function _persistAccessToken(resp) {
  const expMs = Date.now() + (resp.expires_in || DEFAULT_TOKEN_TTL_SEC) * 1000;
  localStorage.setItem(ACCESS_TOKEN_KEY,     resp.access_token);
  localStorage.setItem(ACCESS_TOKEN_EXP_KEY, String(expMs));
  restampIdTokenExp(expMs);   // keep synthetic session in step with the access token (no-op pre-sign-in)
  return expMs;
}

// F-57-01 AC-01: /userinfo has no browser-enforced ceiling on its own — the only unguarded
// network await left in the boot chain (cold-boot silent-bootstrap, reconnect click, sign-in
// button all route through this one function, RULE #5). AbortController-bound; named error so
// a caller can branch on it, same convention as RoleProbeTimeoutError/RepoInitTimeoutError.
export class UserinfoFetchTimeoutError extends Error {
  constructor() {
    super('userinfo fetch timeout');
    this.name = 'UserinfoFetchTimeoutError';
  }
}

async function _fetchUserinfo(accessToken) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), USERINFO_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(USERINFO_URL, {
      headers: { Authorization: 'Bearer ' + accessToken },
      signal:  controller.signal,
    });
    if (!res.ok) throw new Error(`userinfo ${res.status}`); // 401 = token dead — never mint from an error body
    return await res.json();
  } catch (err) {
    throw err?.name === 'AbortError' ? new UserinfoFetchTimeoutError() : err;
  } finally {
    clearTimeout(timer);
  }
}

// Session revive WITHOUT GIS (owner model: token lives in ONE place, use it until 401). The
// synthetic id_token expires/purges on its own clock while the ACCESS token may still be
// perfectly valid — declaring "hết hạn" from the id-token clock alone painted a red chip over a
// working session. Reality check instead: hit /userinfo with the stored Bearer (plain HTTP, no
// popup). 200 → re-mint the synthetic id_token, session resumes; anything else → null, caller
// decides (cached render / login). exp gets a floor because Google just validated the token NOW —
// a stale stored exp must not make buildUser discard a session Google itself accepted.
const REVIVED_SESSION_MIN_TTL_MS = 10 * 60 * 1000;
export async function rebuildSessionFromStoredToken() {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return null;
  try {
    const info = await _fetchUserinfo(token);
    if (!info?.sub) return null;
    const storedExp = parseInt(localStorage.getItem(ACCESS_TOKEN_EXP_KEY) || '0', 10);
    const expMs = Math.max(storedExp, Date.now() + REVIVED_SESSION_MIN_TTL_MS);
    localStorage.setItem(TOKEN_KEY, _encodeSyntheticIdToken({
      email: info.email, name: info.name, picture: info.picture, sub: info.sub,
      exp: Math.floor(expMs / 1000),
    }));
    _currentUser = null;
    return getCurrentUser();
  } catch { return null; } /* dead/unreachable token — caller falls back to cache or login */
}

// F-19-84 — full hydrate from a fresh OAuth2 token response. Shared by sign-in, reconnect
// (AC-03) and silent boot (AC-05) — one hydrate path, no parallel implementation (RULE #5).
// Persists token+exp, sets/clears the drive-scope flag from the REAL grant, re-mints the
// synthetic id_token from userinfo. Returns the rebuilt user (or null if the mint failed).
export async function hydrateSessionFromToken(resp) {
  const expMs  = _persistAccessToken(resp);
  const expSec = Math.floor(expMs / 1000);
  if (shouldGrantDriveScope(resp)) localStorage.setItem(DRIVE_SCOPE_KEY, '1');
  else clearDriveScopeGrant(); // scope declined at consent — never record a grant
  const info = await _fetchUserinfo(resp.access_token);
  localStorage.setItem(TOKEN_KEY, _encodeSyntheticIdToken({
    email: info.email, name: info.name, picture: info.picture, sub: info.sub, exp: expSec,
  }));
  _currentUser = null; // force rebuild from the freshly-minted token
  return getCurrentUser();
}

// AC-08 re-consent trigger for the drive-access gate button. Requests DRIVE_SCOPE alone
// (mirrors drive-api.js::_silentRefresh) with prompt:'consent'. Never throws — resolves via
// exactly one of the two callbacks.
//   onGranted()   — scope acquired, DRIVE_SCOPE_KEY set; caller reloads to resume boot.
//   onDenied(err) — resp.error / still missing / GIS not loaded; caller MUST re-render
//                   visible feedback (AC-09) — not a silent no-op.
export function requestDriveScopeGrant(onGranted, onDenied) {
  if (!window.google?.accounts?.oauth2) { onDenied(new Error('GIS oauth2 not loaded')); return; }
  // Same-account re-consent: pin the chooser to the signed-in user (multi-account browsers must
  // not re-consent a different account).
  const sessionEmail = getCurrentUser()?.email;
  const client = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope:     DRIVE_SCOPE,
    ...(sessionEmail ? { login_hint: sessionEmail } : {}),
    callback:  (resp) => {
      if (resp.error) { onDenied(new Error(resp.error)); return; }
      _persistAccessToken(resp);
      if (shouldGrantDriveScope(resp)) {
        localStorage.setItem(DRIVE_SCOPE_KEY, '1');
        onGranted();
      } else {
        clearDriveScopeGrant();
        onDenied(new Error('Drive scope still not granted'));
      }
    },
    // F-35-01 AC-02 — fail fast on a blocked popup instead of hanging with no callback at all.
    error_callback: (err) => onDenied(new Error(_gisErrorMessage(err))),
  });
  // F-49-01 — restore a native window.open the ad-blocker may have nulled before GIS uses it.
  if (!ensureWindowOpen()) {
    window.dispatchEvent(new CustomEvent('vdg:auth-popup-blocked'));
    onDenied(new Error('popup-blocked:window-open-unavailable'));
    return;
  }
  client.requestAccessToken({ prompt: 'consent' });
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
export async function initGoogleSignIn(onSuccess, onError) {
  try {
    await loadGisScript();
  } catch (err) {
    if (onError) onError(err);
  }
}

// ── OAuth2 sign-in button ─────────────────────────────────────────────────────

export function renderSignInButton(container) {
  if (!container) return;
  container.innerHTML = `
    <button id="vdg-signin-btn"
            class="w-full flex items-center justify-center gap-3 px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50 transition">
      <svg viewBox="0 0 24 24" class="w-5 h-5 shrink-0" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      <span class="text-sm font-medium text-slate-700">Sign in with Google</span>
    </button>
  `;
  container.querySelector('#vdg-signin-btn').addEventListener('click', () => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope:     `openid email profile ${DRIVE_SCOPE}`,
      callback:  (resp) => {
        if (resp.error) {
          window.dispatchEvent(new CustomEvent('vdg:signin-error', { detail: resp.error }));
          return;
        }
        // F-19-84: sign-in routes through the same hydrate as reconnect/silent-boot — no
        // parallel path (RULE #5).
        hydrateSessionFromToken(resp)
          .then(() => location.reload())
          .catch((err) => {
            window.dispatchEvent(new CustomEvent('vdg:signin-error', { detail: err.message }));
          });
      },
      // F-35-01 AC-02 — fail fast on a blocked popup instead of hanging with no callback at all.
      error_callback: (err) => {
        window.dispatchEvent(new CustomEvent('vdg:signin-error', { detail: _gisErrorMessage(err) }));
      },
    });
    // F-49-01 — restore a native window.open the ad-blocker may have nulled before GIS uses it.
    if (!ensureWindowOpen()) {
      window.dispatchEvent(new CustomEvent('vdg:auth-popup-blocked'));
      window.dispatchEvent(new CustomEvent('vdg:signin-error', { detail: 'popup-blocked:window-open-unavailable' }));
      return;
    }
    client.requestAccessToken({ prompt: 'consent' });
  });
}

// ── global bridge ─────────────────────────────────────────────────────────────

window.__vdg_auth = { getCurrentUser, signOut };
