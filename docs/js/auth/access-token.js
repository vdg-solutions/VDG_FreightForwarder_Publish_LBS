// Token lifecycle — extracted out of drive-api.js (F-19-72, R-B: drive-api.js was at the
// 350-line cap). Re-exported through drive-api.js so every existing importer (token-refresh.js,
// f-29-13-bounded-silent-refresh.test.mjs) keeps resolving unchanged.

import { ensureWindowOpen } from './window-open-guard.js';
import { SAFE_AWAIT_DEFAULT_MS } from '../util/safe-await.js';

const CLIENT_ID                = '566948941006-ju52hf1hvpiv8gv3qu6slt58c7utgicf.apps.googleusercontent.com'; // Makefile sed target
const ACCESS_TOKEN_KEY         = 'vdg.auth.access_token';
const ACCESS_TOKEN_EXP_KEY     = 'vdg.auth.access_token_exp';
export const ACCESS_TOKEN_ISSUED_KEY = 'vdg.auth.access_token_issued'; // F-50-01 — mint time, feeds eagerRefreshDue
const TOKEN_EXPIRY_BUFFER_MS   = 60_000; // refresh 60s before expiry
// MUST stay below SAFE_AWAIT_DEFAULT_MS (the per-Drive-op safeAwait bound). On a static deploy
// silent refresh can never succeed (F-50-01: no server, no gesture) and GIS can hang without
// ever firing error_callback — this timer is the only exit. If it fires AFTER the op's 8s
// safeAwait gives up, every boot migrator op eats a full 8s before the shared-refresh rejection
// primes the 30s negative cache: a dozen ops => minutes on the "syncing" overlay. Firing first
// (< 8s) lets ONE op settle the refresh, prime the cache, and the rest fast-fail in ~0ms.
const SILENT_REFRESH_TIMEOUT_MS = Math.max(1_000, SAFE_AWAIT_DEFAULT_MS - 2_000); // 6s, guaranteed < op bound
const REFRESH_NEGATIVE_CACHE_MS = 30_000;   // AC-03 — a known-expired session fast-fails this long instead of re-firing GIS

// F-35-01 AC-02 — GIS error_callback types that mean "popup blocked", per Google's error guide.
// requestAccessToken({prompt:''}) is popup-based; fired outside a user gesture the popup is
// blocked and, without error_callback, GIS never calls back at all — this fires FAST instead.
const GIS_ERROR_POPUP_FAILED = 'popup_failed_to_open';
const GIS_ERROR_POPUP_CLOSED = 'popup_closed';

function _isPopupBlockedError(type) { return type === GIS_ERROR_POPUP_FAILED || type === GIS_ERROR_POPUP_CLOSED; }

// F-19-84 — single-flight guard shared by getAccessToken AND both token-refresh.js schedulers
// (AC-01: concurrent ticks share ONE in-flight GIS refresh instead of firing one each). The 401
// reactive path in drive-api.js keeps its own _reauthInflight guard and calls
// refreshAccessTokenSilently() directly (do-not-regress).
let _silentRefreshInflight = null;
let _refreshFailUntil      = 0;

function _dispatchNeedsReconnect() { window.dispatchEvent(new CustomEvent('vdg:auth-needs-reconnect')); }

export async function getAccessToken() {
  const exp   = parseInt(localStorage.getItem(ACCESS_TOKEN_EXP_KEY) || '0', 10);
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token && Date.now() + TOKEN_EXPIRY_BUFFER_MS < exp) return token;

  // Silent refresh — first-time consent already granted at sign-in
  try {
    if (Date.now() < _refreshFailUntil) throw new Error('silent-refresh-negative-cache');
    return await sharedSilentRefresh();
  } catch (err) {
    _dispatchNeedsReconnect();          // was signOut()+vdg:auth-expired — no blind sign-out
    throw err;
  }
}

// F-19-84 AC-01/AC-03 — single-flight coalescer around refreshAccessTokenSilently, shared by
// getAccessToken AND both token-refresh.js schedulers: concurrent/near-simultaneous callers
// share ONE in-flight GIS refresh instead of firing one each. A failure primes the negative-
// cache window (read by getAccessToken above) so a rapid retry storm fast-fails instead of
// re-incurring a fresh SILENT_REFRESH_TIMEOUT_MS wait per caller.
export function sharedSilentRefresh() {
  if (_silentRefreshInflight) return _silentRefreshInflight;

  _silentRefreshInflight = refreshAccessTokenSilently()
    .catch((err) => {
      _refreshFailUntil = Date.now() + REFRESH_NEGATIVE_CACHE_MS;
      throw err;
    })
    .finally(() => { _silentRefreshInflight = null; });
  return _silentRefreshInflight;
}

// AC-03 — consolidated GIS token request, shared by silent + interactive paths. A settled
// latch races the callback against timeoutMs (0 = unbounded) so a non-settling GIS callback
// can never hang the caller (kills the banned silent-await). returnResp lets reconnect/silent-
// boot callers receive the full oauth2 response (scope + token) for hydrateSessionFromToken;
// plain silent-refresh callers keep resolving the token string (do-not-regress).
function _requestAccessToken(prompt, timeoutMs, { returnResp = false } = {}) {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) { reject(new Error('GIS oauth2 not loaded')); return; }
    let settled = false;
    const timer = timeoutMs
      ? setTimeout(() => { if (!settled) { settled = true; reject(new Error('silent-refresh-timeout')); } }, timeoutMs)
      : null;
    const done = (fn, arg) => { if (!settled) { settled = true; if (timer) clearTimeout(timer); fn(arg); } };
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope:     'https://www.googleapis.com/auth/drive.file',
      callback:  (resp) => {
        if (resp.error) { done(reject, new Error(resp.error)); return; }
        const expMs = Date.now() + (resp.expires_in || 3600) * 1000;
        localStorage.setItem(ACCESS_TOKEN_KEY,     resp.access_token);
        localStorage.setItem(ACCESS_TOKEN_EXP_KEY, String(expMs));
        localStorage.setItem(ACCESS_TOKEN_ISSUED_KEY, String(Date.now())); // F-50-01 AC-14/15 — mint time for eagerRefreshDue
        done(resolve, returnResp ? resp : resp.access_token);
      },
      // AC-02/AC-04 — a definitive GIS error (popup blocked or otherwise) settles the promise
      // immediately, distinct from 'silent-refresh-timeout' — never eats the full timeoutMs.
      error_callback: (err) => {
        const type = err?.type || 'unknown';
        done(reject, new Error(_isPopupBlockedError(type) ? `popup-blocked:${type}` : `gis-error:${type}`));
      },
    });
    // F-49-01 — an ad-blocker can null window.open; GIS requestAccessToken() calls it internally
    // and throws synchronously (permanent reconnect chip). Restore a native window.open first; if
    // it can't be restored, surface a distinct popup-blocked state instead of a dead refresh.
    if (!ensureWindowOpen()) {
      window.dispatchEvent(new CustomEvent('vdg:auth-popup-blocked'));
      done(reject, new Error('popup-blocked:window-open-unavailable'));
      return;
    }
    client.requestAccessToken({ prompt });
  });
}

function _silentRefresh() { return _requestAccessToken('', SILENT_REFRESH_TIMEOUT_MS); }          // AC-03 bounded
export function refreshAccessTokenSilently() { return _silentRefresh(); }                          // scheduler + getAccessToken + 401
export function reconnectDriveInteractive()  { return _requestAccessToken('consent', 0, { returnResp: true }); }               // AC-03/AC-06 interactive, full resp for rehydrate
export function silentBootstrapToken()       { return _requestAccessToken('', SILENT_REFRESH_TIMEOUT_MS, { returnResp: true }); } // AC-05 reload bootstrap, full resp for rehydrate
