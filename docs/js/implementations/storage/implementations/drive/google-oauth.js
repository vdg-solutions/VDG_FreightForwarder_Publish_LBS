// F-13-P2 — Google Identity Services wrapper
// F-15-20 merged into F-15-19 R3: single OAuth2 popup grants identity + drive.file scope

import { isServerBackend, apiFetch, adoptSessionToken, rememberSessionToken } from '../../core_abstractions/backend.js';
import { SERVER_SESSION_TTL_MS, serverSessionIdentity } from '../../core_abstractions/server-session.js';
import { ensureWindowOpen } from '../../core_abstractions/popup-guard.js';
import { PROFILE_KEY, writeCachedProfile, readCachedProfile } from '../../core_abstractions/profile-cache.js';
// The synthetic id-token codec (parse/build) is core — no GIS, no client id, no storage.
import { TOKEN_KEY, buildUser, encodeSyntheticIdToken, parseIdToken } from '../../core_abstractions/id-token.js';
import { fetchUserinfo } from './userinfo.js';
import { DRIVE_SCOPE, IDENTITY_SCOPE } from '../../core_abstractions/drive-endpoints.js';

const CLIENT_ID            = '875515041729-klcro7nakobu353ktf0k2s2fkuu7u38n.apps.googleusercontent.com';
const ACCESS_TOKEN_KEY     = 'vdg.auth.access_token';
const ACCESS_TOKEN_EXP_KEY = 'vdg.auth.access_token_exp';
// E-43: VERSIONED on purpose. The flag records "this browser already consented", and it used to
// record it for `drive.file`. Widening the scope without renaming the key would leave every
// existing session carrying a '1' that means the OLD scope — hasDriveScopeGrant would answer true,
// the app would never re-prompt, and every Drive call would keep failing exactly as before. A new
// key makes the old grant invisible, so the consent runs once and heals itself.
const DRIVE_SCOPE_KEY      = 'vdg.auth.drive_scope_granted.v2';
import { ROLE_CACHE_KEY } from '../../core_abstractions/identity.js';
const GIS_SCRIPT_URL       = 'https://accounts.google.com/gsi/client';
const GIS_SCRIPT_TIMEOUT   = 10_000; // ms
// E-43 — MEASURED, not chosen for convenience. Under `drive.file` a file is authorized per
// (app, USER, file) at the moment that user's session creates or picks it. A folder the MANAGER's
// session created and then shared is NOT authorized for the EMPLOYEE's session: measured live on
// the LBS workspace, sol.vdg01 held reader on its grant file and writer on its own fork, and its
// own session got `sharedWithMe` = [] and 404 on files.get BY ID for both. Every employee was
// therefore unreachable-by-construction and resolved as NOT_PROVISIONED. Sharing is enforced by
// Drive; USING what was shared needs a scope that can see files this session did not create.
const DEFAULT_TOKEN_TTL_SEC = 3600; // Google's default access-token lifetime when expires_in absent
// #21 — GIS can fire NEITHER callback when an extension hands it a fake popup handle: the sign-in
// screen then sits forever with no message. Long enough that a human typing a password + 2FA never
// trips it; the hint is advisory only and never cancels the in-flight request.
const SIGNIN_STALL_HINT_MS = 60_000;

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
  TOKEN_KEY, ACCESS_TOKEN_KEY, ACCESS_TOKEN_EXP_KEY, DRIVE_SCOPE_KEY, ROLE_CACHE_KEY,
  PROFILE_KEY, // display profile — expiry must not blank the avatar; see profile-cache.js
]);

let _currentUser = null; // in-memory cache after parse

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
  if (!isServerBackend()) return Promise.resolve();
  // The DELETE must carry the session (apiFetch attaches cookie + header), so the token is only
  // dropped afterwards — win or lose.
  return apiFetch('DELETE', '/session')
    .catch((e) => { console.warn('sign-out: server session not ended:', e?.message || e); })
    .finally(() => rememberSessionToken(''));
}

// ── Drive scope grant flag ───────────────────────────────────────────────────
// F-24-19: DRIVE_SCOPE_KEY records whether the live token actually carries drive.file —
// Google's consent screen lets the user untick the Drive checkbox, so this must be gated
// on the real grant, never written unconditionally.

// Pure predicate — exported so callers test it without a DOM/click. hasGrantedAllScopesFn
// defaults to window.google.accounts.oauth2.hasGrantedAllScopes; when that global is
// absent, falls back to a space-delimited DRIVE_SCOPE check on resp.scope.
function shouldGrantDriveScope(resp, hasGrantedAllScopesFn) {
  const checkFn = hasGrantedAllScopesFn ?? window.google?.accounts?.oauth2?.hasGrantedAllScopes;
  if (typeof checkFn === 'function') return Boolean(checkFn(resp, DRIVE_SCOPE));
  return (resp?.scope || '').split(' ').includes(DRIVE_SCOPE);
}

function hasDriveScopeGrant() { return localStorage.getItem(DRIVE_SCOPE_KEY) === '1'; } // AC-03 reader

function clearDriveScopeGrant() { localStorage.removeItem(DRIVE_SCOPE_KEY); } // AC-05

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

// Shared token/expiry write for both the sign-in callback and the re-consent flow below.
function _persistAccessToken(resp) {
  const expMs = Date.now() + (resp.expires_in || DEFAULT_TOKEN_TTL_SEC) * 1000;
  localStorage.setItem(ACCESS_TOKEN_KEY,     resp.access_token);
  localStorage.setItem(ACCESS_TOKEN_EXP_KEY, String(expMs));
  restampIdTokenExp(expMs);   // keep synthetic session in step with the access token (no-op pre-sign-in)
  return expMs;
}

// Session revive WITHOUT GIS (owner model: token lives in ONE place, use it until 401). The
// synthetic id_token expires/purges on its own clock while the ACCESS token may still be
// perfectly valid — declaring "hết hạn" from the id-token clock alone painted a red chip over a
// working session. Reality check instead: hit /userinfo with the stored Bearer (plain HTTP, no
// popup). 200 → re-mint the synthetic id_token, session resumes; anything else → null, caller
// decides (cached render / login). exp gets a floor because Google just validated the token NOW —
// a stale stored exp must not make buildUser discard a session Google itself accepted.
const REVIVED_SESSION_MIN_TTL_MS = 10 * 60 * 1000;
async function rebuildSessionFromStoredToken() {
  // Server backend: the session's truth is the server cookie, not the Google token (which dies
  // after an hour). Ask the server who this is; a 401 there is the real "reconnect".
  if (isServerBackend()) {
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
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return null;
  try {
    const info = await fetchUserinfo(token);
    if (!info?.sub) return null;
    const storedExp = parseInt(localStorage.getItem(ACCESS_TOKEN_EXP_KEY) || '0', 10);
    const expMs = Math.max(storedExp, Date.now() + REVIVED_SESSION_MIN_TTL_MS);
    localStorage.setItem(TOKEN_KEY, encodeSyntheticIdToken({
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
async function hydrateSessionFromToken(resp) {
  const expMs  = _persistAccessToken(resp);
  // Server backend: the identity lives as long as the server session (30-day cookie), not the
  // one-hour Google token the server verified once at sign-in.
  const expSec = Math.floor((isServerBackend() ? Date.now() + SERVER_SESSION_TTL_MS : expMs) / 1000);
  // E-43: clearing on "not granted" is only safe when the response actually SAYS so. A silent
  // re-mint can come back without a `scope` field at all, and treating that silence as a refusal
  // wiped a grant the live token demonstrably carried — measured: the manager's token listed
  // `auth/drive` while the flag it had just cleared said the scope was missing, so boot stopped at
  // "Chưa cấp quyền Google Drive" with full permission in hand. Absence of evidence is not
  // evidence of absence; the same rule the role probe follows.
  // Server backend: Drive scope is not requested and not needed — the server holds the data.
  // The flag stays '1' so the Drive-era gate (hasDriveScopeGrant) never blocks a server session.
  // The token is handed to the server, which verifies it with Google and mints the session.
  if (isServerBackend()) {
    localStorage.setItem(DRIVE_SCOPE_KEY, '1');
    const opened = await apiFetch('POST', '/session', { access_token: resp.access_token });
    // Cookie first; the token is kept only if THIS browser refuses the third-party cookie
    // (InPrivate, Safari, strict tracking protection) — adoptSessionToken asks, then drops it
    // wherever the cookie already works.
    if (opened?.session_token) await adoptSessionToken(opened.session_token);
  } else if (shouldGrantDriveScope(resp)) localStorage.setItem(DRIVE_SCOPE_KEY, '1');
  else if (typeof resp?.scope === 'string' && resp.scope.length > 0) clearDriveScopeGrant();
  const info = await fetchUserinfo(resp.access_token);
  localStorage.setItem(TOKEN_KEY, encodeSyntheticIdToken({
    email: info.email, name: info.name, picture: info.picture, sub: info.sub, exp: expSec,
  }));
  writeCachedProfile(info);
  _currentUser = null; // force rebuild from the freshly-minted token
  return getCurrentUser();
}

// AC-08 re-consent trigger for the drive-access gate button. Requests DRIVE_SCOPE alone
// (mirrors drive-api.js::_silentRefresh) with prompt:'consent'. Never throws — resolves via
// exactly one of the two callbacks.
//   onGranted()   — scope acquired, DRIVE_SCOPE_KEY set; caller reloads to resume boot.
//   onDenied(err) — resp.error / still missing / GIS not loaded; caller MUST re-render
//                   visible feedback (AC-09) — not a silent no-op.
function requestDriveScopeGrant(onGranted, onDenied) {
  // A server build has no business asking the USER for Drive access — the server holds the Drive
  // credentials, and DRIVE_SCOPE is restricted, so this would put Google's unverified-app warning
  // in front of someone for a permission the app never uses. Refuse loudly rather than ask.
  if (isServerBackend()) { onDenied(new Error('drive scope is never requested on a server build')); return; }
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
async function initGoogleSignIn(onSuccess, onError) {
  try {
    await loadGisScript();
  } catch (err) {
    if (onError) onError(err);
  }
}

// ── OAuth2 sign-in button ─────────────────────────────────────────────────────

function renderSignInButton(container) {
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
    // #21 stall watchdog — armed just before the popup call, disarmed by whichever GIS callback
    // answers. If neither ever does, the user gets an actionable hint instead of a dead screen.
    let stallTimer = null;
    const answered = () => { if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; } };
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      // Server backend: identity only. No Drive scope means no Drive consent screen and no
      // second popup — the server never touches the user's Drive.
      scope:     isServerBackend() ? IDENTITY_SCOPE : `${IDENTITY_SCOPE} ${DRIVE_SCOPE}`,
      callback:  (resp) => {
        answered();
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
        answered();
        window.dispatchEvent(new CustomEvent('vdg:signin-error', { detail: _gisErrorMessage(err) }));
      },
    });
    // F-49-01 — restore a native window.open the ad-blocker may have nulled before GIS uses it.
    if (!ensureWindowOpen()) {
      window.dispatchEvent(new CustomEvent('vdg:auth-popup-blocked'));
      window.dispatchEvent(new CustomEvent('vdg:signin-error', { detail: 'popup-blocked:window-open-unavailable' }));
      return;
    }
    stallTimer = setTimeout(() => {
      stallTimer = null;
      window.dispatchEvent(new CustomEvent('vdg:signin-stalled'));
    }, SIGNIN_STALL_HINT_MS);
    client.requestAccessToken({ prompt: 'consent' });
  });
}

// ── global bridge ─────────────────────────────────────────────────────────────

if (typeof window !== 'undefined') window.__vdg_auth = { getCurrentUser, signOut };

/// What the storage bootstrap binds behind the identity port and the oauth port.
export const identityProvider = { getCurrentUser, signOut, hasDriveScopeGrant, wasPreviouslySignedIn, rebuildSessionFromStoredToken };
export const oauthProvider = { clearDriveScopeGrant, hydrateSessionFromToken, restampIdTokenExp, initGoogleSignIn, renderSignInButton,
                               requestDriveScopeGrant, shouldGrantDriveScope };
