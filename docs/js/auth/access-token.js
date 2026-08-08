// Token lifecycle — extracted out of drive-api.js (F-19-72, R-B: drive-api.js was at the
// 350-line cap). Re-exported through drive-api.js so every existing importer (token-refresh.js,
// f-29-13-bounded-silent-refresh.test.mjs) keeps resolving unchanged.

import { ensureWindowOpen } from './window-open-guard.js';
import { parseIdToken } from './google-oauth.js';
import { SAFE_AWAIT_DEFAULT_MS } from '../util/safe-await.js';

const CLIENT_ID                = '566948941006-ju52hf1hvpiv8gv3qu6slt58c7utgicf.apps.googleusercontent.com'; // Makefile sed target
const ID_TOKEN_KEY             = 'vdg.auth.id_token';
const ACCESS_TOKEN_KEY         = 'vdg.auth.access_token';
const ACCESS_TOKEN_EXP_KEY     = 'vdg.auth.access_token_exp';
export const ACCESS_TOKEN_ISSUED_KEY = 'vdg.auth.access_token_issued'; // F-50-01 — mint time, feeds eagerRefreshDue
// MUST stay below SAFE_AWAIT_DEFAULT_MS (the per-Drive-op safeAwait bound). On a static deploy
// silent refresh can never succeed (F-50-01: no server, no gesture) and GIS can hang without
// ever firing error_callback — this timer is the only exit. If it fires AFTER the op's 8s
// safeAwait gives up, every boot migrator op eats a full 8s before the shared-refresh rejection
// primes the 30s negative cache: a dozen ops => minutes on the "syncing" overlay. Firing first
// (< 8s) lets ONE op settle the refresh, prime the cache, and the rest fast-fail in ~0ms.
const SILENT_REFRESH_TIMEOUT_MS = Math.max(1_000, SAFE_AWAIT_DEFAULT_MS - 2_000); // 6s, guaranteed < op bound

// F-35-01 AC-02 — GIS error_callback types that mean "popup blocked", per Google's error guide.
// requestAccessToken({prompt:''}) is popup-based; fired outside a user gesture the popup is
// blocked and, without error_callback, GIS never calls back at all — this fires FAST instead.
const GIS_ERROR_POPUP_FAILED = 'popup_failed_to_open';
const GIS_ERROR_POPUP_CLOSED = 'popup_closed';

function _isPopupBlockedError(type) { return type === GIS_ERROR_POPUP_FAILED || type === GIS_ERROR_POPUP_CLOSED; }

export async function getAccessToken() {
  // Owner model ("lúc 401 mới cần"): the token lives in ONE place (localStorage). Read it and hand
  // it over — NEVER re-mint here, never fire GIS on a read. A live Drive op that outlives the token
  // 401s, and drive-api re-auths exactly once, reactively. No proactive/eager/scheduled refresh.
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

// AC-03 — consolidated GIS token request, shared by silent + interactive paths. A settled
// latch races the callback against timeoutMs (0 = unbounded) so a non-settling GIS callback
// can never hang the caller (kills the banned silent-await). returnResp lets reconnect/silent-
// boot callers receive the full oauth2 response (scope + token) for hydrateSessionFromToken;
// plain silent-refresh callers keep resolving the token string (do-not-regress).
// Multi-account guard: the browser can hold several Google sessions at once. A re-mint WITHOUT
// login_hint lets Google pick its DEFAULT session account — silently flipping the app's token to a
// different account than the one signed in (wrong identity, wrong users/<prefix> Drive routing).
// Always pin the mint to the current session's email.
function _sessionEmail() {
  const token = localStorage.getItem(ID_TOKEN_KEY);
  const payload = token ? parseIdToken(token) : null;
  return payload?.email || undefined;
}

// Account guarantee (owner: "cần phải đảm bảo account"): login_hint pins the chooser, but a hint is
// ADVISORY — Google can still mint for another signed-in account. Verify the minted token's real
// identity against the session BEFORE persisting; a mismatched token is rejected outright so the
// app can never silently flip to the wrong account (wrong users/<prefix> Drive routing).
const USERINFO_VERIFY_TIMEOUT_MS = 8000;
const USERINFO_VERIFY_URL        = 'https://www.googleapis.com/oauth2/v3/userinfo';
async function _verifySameAccount(resp, expectedEmail) {
  if (!expectedEmail) return true; // no session yet — sign-in flow establishes identity from the token itself
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), USERINFO_VERIFY_TIMEOUT_MS);
  try {
    const res = await fetch(USERINFO_VERIFY_URL, {
      headers: { Authorization: 'Bearer ' + resp.access_token },
      signal:  controller.signal,
    });
    if (!res.ok) throw new Error(`userinfo ${res.status}`);
    const info = await res.json();
    return (info.email || '').toLowerCase() === expectedEmail.toLowerCase();
  } finally {
    clearTimeout(timer);
  }
}

function _requestAccessToken(prompt, timeoutMs, { returnResp = false } = {}) {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) { reject(new Error('GIS oauth2 not loaded')); return; }
    let settled = false;
    const timer = timeoutMs
      ? setTimeout(() => { if (!settled) { settled = true; reject(new Error('silent-refresh-timeout')); } }, timeoutMs)
      : null;
    const done = (fn, arg) => { if (!settled) { settled = true; if (timer) clearTimeout(timer); fn(arg); } };
    const hint = _sessionEmail();
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope:     'https://www.googleapis.com/auth/drive.file',
      ...(hint ? { login_hint: hint } : {}),
      callback:  (resp) => {
        if (resp.error) { done(reject, new Error(resp.error)); return; }
        _verifySameAccount(resp, hint)
          .then((same) => {
            if (!same) { done(reject, new Error(`account-mismatch:${hint}`)); return; } // wrong account — NEVER persist
            const expMs = Date.now() + (resp.expires_in || 3600) * 1000;
            localStorage.setItem(ACCESS_TOKEN_KEY,     resp.access_token);
            localStorage.setItem(ACCESS_TOKEN_EXP_KEY, String(expMs));
            localStorage.setItem(ACCESS_TOKEN_ISSUED_KEY, String(Date.now()));
            done(resolve, returnResp ? resp : resp.access_token);
          })
          .catch((e) => done(reject, e));
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
export function refreshAccessTokenSilently() { return _silentRefresh(); }                          // drive-api 401 re-mint ONLY
// Reconnect-chip click. prompt:'' + login_hint: an already-consented live session auto-closes the
// popup in a flash on the CORRECT account (no full consent screen every reconnect). Escalation
// ladder (owner model): wrong account minted → FORCE the account chooser so the user re-picks the
// working account; wrong again → force the full sign-in screen ("phải bắt login nếu không chọn
// được lại đúng account đang làm việc"). Other interaction demands escalate to prompt:'consent'.
export async function reconnectDriveInteractive() {
  try {
    return await _requestAccessToken('', 0, { returnResp: true });
  } catch (err) {
    const msg = String(err?.message || '');
    if (msg.startsWith('popup-blocked:')) throw err; // no popup available — any retry is equally doomed
    if (msg.startsWith('account-mismatch:')) {
      try {
        return await _requestAccessToken('select_account', 0, { returnResp: true });
      } catch (err2) {
        if (String(err2?.message || '').startsWith('account-mismatch:')) {
          window.dispatchEvent(new CustomEvent('vdg:auth-signin-request')); // full login — pick the right account
        }
        throw err2;
      }
    }
    return _requestAccessToken('consent', 0, { returnResp: true });
  }
}
