// F-13-P2 — Google Identity Services wrapper
// F-15-20 merged into F-15-19 R3: single OAuth2 popup grants identity + drive.file scope

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

// Shared token/expiry write for both the sign-in callback and the re-consent flow below.
function _persistAccessToken(resp) {
  const expMs = Date.now() + (resp.expires_in || DEFAULT_TOKEN_TTL_SEC) * 1000;
  localStorage.setItem(ACCESS_TOKEN_KEY,     resp.access_token);
  localStorage.setItem(ACCESS_TOKEN_EXP_KEY, String(expMs));
  return expMs;
}

// AC-08 re-consent trigger for the drive-access gate button. Requests DRIVE_SCOPE alone
// (mirrors drive-api.js::_silentRefresh) with prompt:'consent'. Never throws — resolves via
// exactly one of the two callbacks.
//   onGranted()   — scope acquired, DRIVE_SCOPE_KEY set; caller reloads to resume boot.
//   onDenied(err) — resp.error / still missing / GIS not loaded; caller MUST re-render
//                   visible feedback (AC-09) — not a silent no-op.
export function requestDriveScopeGrant(onGranted, onDenied) {
  if (!window.google?.accounts?.oauth2) { onDenied(new Error('GIS oauth2 not loaded')); return; }
  const client = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope:     DRIVE_SCOPE,
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
  });
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
        const expMs  = _persistAccessToken(resp);
        const expSec = Math.floor(expMs / 1000);
        if (shouldGrantDriveScope(resp)) localStorage.setItem(DRIVE_SCOPE_KEY, '1');
        else clearDriveScopeGrant(); // AC-01: scope declined at consent — never record a grant
        // Fetch userinfo — OAuth2 token client doesn't return an ID token
        fetch(USERINFO_URL, { headers: { 'Authorization': 'Bearer ' + resp.access_token } })
          .then((r) => r.json())
          .then((info) => {
            // Synthesize JWT-like payload for parseIdToken consumers (UTF-8 safe)
            const header  = btoa(JSON.stringify({ alg: 'none' }));
            const payload = btoa(unescape(encodeURIComponent(JSON.stringify({
              email:   info.email,
              name:    info.name,
              picture: info.picture,
              sub:     info.sub,
              exp:     expSec,
            }))));
            localStorage.setItem(TOKEN_KEY, `${header}.${payload}.`);
            location.reload();
          })
          .catch((err) => {
            window.dispatchEvent(new CustomEvent('vdg:signin-error', { detail: err.message }));
          });
      },
    });
    client.requestAccessToken({ prompt: 'consent' });
  });
}

// ── global bridge ─────────────────────────────────────────────────────────────

window.__vdg_auth = { getCurrentUser, signOut };
