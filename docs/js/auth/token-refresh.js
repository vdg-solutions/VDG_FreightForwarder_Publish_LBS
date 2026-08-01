// F-15-02 — Silent ID-token re-auth before expiry
// F-29-13 — proactive access-token scheduler + reconnect UX (independent 2nd timer)
// F-19-84 — no blind signOut anywhere in this scheduler: a failed silent refresh is ALWAYS a
// reconnect intent (mirrors access-token.js:getAccessToken), never a session purge.

import { parseIdToken, restampIdTokenExp, hydrateSessionFromToken } from './google-oauth.js';
import { sharedSilentRefresh, reconnectDriveInteractive } from './drive-api.js';
import { detectRoleViaDrive } from './auth-gate.js';

const TOKEN_KEY               = 'vdg.auth.id_token';
const REFRESH_LEAD_MS         = 5 * 60 * 1000;  // prompt 5min before exp
const REFRESH_CHECK_INTERVAL_MS = 60 * 1000;    // check every 60s

let _checkTimer = null;

// AC-07 — pure decision, guards the AC-02 regression at the unit level: a failed silent
// refresh is ALWAYS a reconnect intent, never sign-out/clear-keys. F-50-01 AC-01/02 — a
// structural popup-blocked failure (expected on an idle-tab tick outside any user gesture) is
// classified PENDING instead, so it never flips the chip red; every other failure — a genuine
// GIS error, a bound timeout, a raw resp.error — is still RECONNECT, unchanged.
export const REFRESH_FAILURE_ACTION = Object.freeze({ RECONNECT: 'needs-reconnect', PENDING: 'pending-gesture' });
const POPUP_BLOCKED_PREFIX = 'popup-blocked:'; // matches the tag access-token.js sets on a blocked popup

// F-51-01 — PENDING is only honest while the token is still inside its own validity window; a
// popup-blocked tick on an already-expired token is a real reconnect need, not a calm pause.
const TOKEN_VALIDITY_GRACE_MS = 0; // strict: exp exactly at now is NOT still valid
export function isTokenStillValid(expMs, now, graceMs = TOKEN_VALIDITY_GRACE_MS) {
  return expMs > 0 && (expMs - now) > -graceMs;
}

// F-51-01 AC-01/02/03/04 — tokenStillValid must be affirmatively true for the calm path; omitted
// or false never gets PENDING by default, so the existing no-arg corrupt-token call site at
// _check() keeps returning RECONNECT unchanged.
export function refreshFailureAction(errorMessage, tokenStillValid) {
  return typeof errorMessage === 'string' && errorMessage.startsWith(POPUP_BLOCKED_PREFIX) && tokenStillValid === true
    ? REFRESH_FAILURE_ACTION.PENDING
    : REFRESH_FAILURE_ACTION.RECONNECT;
}

function _dispatchNeedsReconnect() { window.dispatchEvent(new CustomEvent('vdg:auth-needs-reconnect')); }
function _dispatchAuthPending()    { window.dispatchEvent(new CustomEvent('vdg:auth-refresh-pending')); } // F-50-01 AC-05

// ── F-35-01 AC-05: gesture-anchored silent refresh ──────────────────────────────
// Google's use-token-model guide: a popup-based requestAccessToken() needs a real user
// gesture to avoid the browser's popup blocker. The 60s schedulers above run OUTSIDE any
// gesture, so their own silent-refresh attempt is structurally doomed once the browser
// blocks the popup — AC-02's error_callback just makes that failure fast instead of a 10s
// hang. This hook is the actual recovery: once a token enters its lead window, arm a
// one-shot click/keydown listener that fires requestAccessToken({prompt:''}) SYNCHRONOUSLY
// inside the user's next real interaction — a genuine gesture, so the popup is not blocked
// and (with a live Google session) resolves invisibly. Idempotent via sharedSilentRefresh's
// single-flight: if a scheduler tick's own attempt is already in flight, the gesture just
// joins it instead of firing a second GIS request.
const GESTURE_EVENTS = ['click', 'keydown'];
let _gestureArmed = false;

function _onGestureRefresh() {
  _disarmGestureRefresh();                    // one-shot — consumed by this gesture
  sharedSilentRefresh()
    .then((/* token */) => {
      const newExp = parseInt(localStorage.getItem(ACCESS_TOKEN_EXP_KEY) || '0', 10);
      restampIdTokenExp(newExp);
      // Invisible recovery — clear any red state a prior non-gesture scheduler attempt set.
      window.dispatchEvent(new CustomEvent('vdg:auth-reconnected'));
    })
    .catch((err) => {
      // F-50-01 AC-01/02/05 — classify even inside a real gesture: a structural popup-blocked
      // failure stays calm instead of flashing red. F-51-01 — same access-token exp bucket as
      // _accessCheck, since this gesture's GIS call is sharedSilentRefresh() = the access flow.
      const expMs = parseInt(localStorage.getItem(ACCESS_TOKEN_EXP_KEY) || '0', 10);
      const tokenStillValid = isTokenStillValid(expMs, Date.now());
      if (refreshFailureAction(err?.message, tokenStillValid) === REFRESH_FAILURE_ACTION.RECONNECT) _dispatchNeedsReconnect();
      else _dispatchAuthPending();
    });
}

function _armGestureRefresh() {
  if (_gestureArmed) return;                  // idempotent — only one arm in flight
  _gestureArmed = true;
  for (const ev of GESTURE_EVENTS) window.addEventListener(ev, _onGestureRefresh);
}

function _disarmGestureRefresh() {
  if (!_gestureArmed) return;
  _gestureArmed = false;
  for (const ev of GESTURE_EVENTS) window.removeEventListener(ev, _onGestureRefresh);
}

// ── internal ──────────────────────────────────────────────────────────────────

function _getExpMs() {
  const token   = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const payload = parseIdToken(token);
  if (!payload?.exp) return null;
  return payload.exp * 1000; // to ms
}

function _remainingMs() {
  const expMs = _getExpMs();
  if (expMs == null) return null;
  return expMs - Date.now();
}

function _silentPrompt() {
  sharedSilentRefresh()                                           // oauth2 prompt:'' — NOT accounts.id
    .then(() => {
      const accessExpMs = parseInt(localStorage.getItem(ACCESS_TOKEN_EXP_KEY) || '0', 10);
      restampIdTokenExp(accessExpMs);                             // extend id-token to new access exp
    })
    .catch((err) => {
      // AC-01/02/07: classify — an idle-tab popup-blocked failure is expected and structural,
      // never a blind reconnect purge; a real failure still surfaces exactly as before. F-51-01 —
      // recompute validity from the id-token's own exp, the same source _check() used to decide
      // this tick was due, at the moment of failure (not a snapshot from when the tick started).
      const tokenStillValid = isTokenStillValid(_getExpMs(), Date.now());
      if (refreshFailureAction(err?.message, tokenStillValid) === REFRESH_FAILURE_ACTION.RECONNECT) _dispatchNeedsReconnect();
      else _dispatchAuthPending();
    });
}

function _check() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;                       // never signed in / clean signout — silent, no banner
  const expMs = _getExpMs();
  if (expMs == null) {                      // present but unparseable — corrupt token, same recovery path
    if (refreshFailureAction() === REFRESH_FAILURE_ACTION.RECONNECT) _dispatchNeedsReconnect();
    return;
  }
  const remaining = expMs - Date.now();
  if (remaining < REFRESH_LEAD_MS) {        // within lead OR already past exp → renew silently
    _armGestureRefresh();                   // AC-05 — arm the invisible gesture-anchored recovery
    _silentPrompt();
  } else {
    _disarmGestureRefresh();                // out of window — drop any stale arm
  }
}

// F-50-01 AC-16 — refocus re-arm: recompute the due/arm decision ONLY, no GIS call/attempt.
// Keeps the gesture hook current by the time the user's first real click/keydown lands after
// switching back to a tab that missed a tick while hidden/blurred.
function _recheckArmOnly() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  const expMs = _getExpMs();
  if (expMs == null) return;
  if ((expMs - Date.now()) < REFRESH_LEAD_MS) _armGestureRefresh(); else _disarmGestureRefresh();
}
const _hasDocument = () => typeof document !== 'undefined'; // node:test envs shim window, not document
function _onIdTokenRefocus() { if (_hasDocument() && document.visibilityState === 'visible') _recheckArmOnly(); } // focus is always visible

// ── public API ────────────────────────────────────────────────────────────────

export function initTokenRefresh() {
  if (_checkTimer) return; // already running
  _check(); // immediate check on boot
  _checkTimer = setInterval(_check, REFRESH_CHECK_INTERVAL_MS);
  if (_hasDocument()) document.addEventListener('visibilitychange', _onIdTokenRefocus);
  window.addEventListener('focus', _onIdTokenRefocus);
}

export function stopTokenRefresh() {
  if (_checkTimer) {
    clearInterval(_checkTimer);
    _checkTimer = null;
  }
  if (_hasDocument()) document.removeEventListener('visibilitychange', _onIdTokenRefocus);
  window.removeEventListener('focus', _onIdTokenRefocus);
  _disarmGestureRefresh(); // never leak the click/keydown listener past the scheduler's life
}

// ── F-29-13: proactive access-token scheduler ───────────────────────────────────

const ACCESS_TOKEN_EXP_KEY     = 'vdg.auth.access_token_exp';
const ACCESS_TOKEN_ISSUED_KEY  = 'vdg.auth.access_token_issued'; // F-50-01 — mirrors access-token.js (redeclared literal, same style as ACCESS_TOKEN_EXP_KEY above)
const ACCESS_REFRESH_LEAD_MS   = 5 * 60 * 1000;   // refresh access token 5min before exp
const ACCESS_CHECK_INTERVAL_MS = 60 * 1000;

// F-50-01 AC-14 — additive to accessRefreshDue (3-arg signature locked, do not touch). Fires
// once a token is past half its lifetime, well before the final ACCESS_REFRESH_LEAD_MS window,
// so an active user's token gets opportunistically armed instead of waiting for the alarming
// last-minute stretch.
export const EAGER_REFRESH_ELAPSED_FRACTION = 0.5;
export function eagerRefreshDue(issuedAtMs, expMs, now) {
  if (!issuedAtMs || !expMs) return false;    // no mint time recorded yet → not due
  const lifetimeMs = expMs - issuedAtMs;
  if (lifetimeMs <= 0) return false;
  return (now - issuedAtMs) >= lifetimeMs * EAGER_REFRESH_ELAPSED_FRACTION;
}

let _accessTimer = null;

// AC-01 — pure timing predicate, clock injected (mirrors _check style). Exported for unit test.
export function accessRefreshDue(expMs, now, leadMs = ACCESS_REFRESH_LEAD_MS) {
  if (!expMs) return false;              // no access token yet → not due
  return (expMs - now) < leadMs;         // valid-but-within-lead OR already expired → due
}

function _accessCheck() {
  const expMs    = parseInt(localStorage.getItem(ACCESS_TOKEN_EXP_KEY) || '0', 10);
  const issuedMs = parseInt(localStorage.getItem(ACCESS_TOKEN_ISSUED_KEY) || '0', 10);
  const now      = Date.now();
  const due      = accessRefreshDue(expMs, now);
  // AC-15 — eager-due also arms, opportunistically, well before the final lead window.
  if (!due && !eagerRefreshDue(issuedMs, expMs, now)) { _disarmGestureRefresh(); return; } // comfortably fresh
  _armGestureRefresh();                     // AC-05/AC-15 — arm the invisible gesture-anchored recovery
  if (!due) return;                         // eager-only tick just arms — no out-of-gesture attempt yet
  // AC-01: routed through the shared single-flight so a near-simultaneous id-token scheduler
  // tick shares this same refresh instead of firing a second GIS request.
  sharedSilentRefresh()
    .then(() => {
      const newExp = parseInt(localStorage.getItem(ACCESS_TOKEN_EXP_KEY) || '0', 10);
      restampIdTokenExp(newExp);            // keep synthetic id-token session in lockstep
    })
    .catch((err) => {
      // AC-01/02/07: classify — an idle-tab popup-blocked failure is expected and structural,
      // never a blind reconnect purge; a real failure still surfaces exactly as before. F-51-01 —
      // recompute validity from ACCESS_TOKEN_EXP_KEY at the moment of failure, not the value read
      // when the tick started.
      const freshExpMs = parseInt(localStorage.getItem(ACCESS_TOKEN_EXP_KEY) || '0', 10);
      const tokenStillValid = isTokenStillValid(freshExpMs, Date.now());
      if (refreshFailureAction(err?.message, tokenStillValid) === REFRESH_FAILURE_ACTION.RECONNECT) _dispatchNeedsReconnect();
      else _dispatchAuthPending();
    });
}

// F-50-01 AC-16 — refocus re-arm for the access-token scheduler, arm-only (no GIS call/attempt).
function _accessRecheckArmOnly() {
  const expMs    = parseInt(localStorage.getItem(ACCESS_TOKEN_EXP_KEY) || '0', 10);
  const issuedMs = parseInt(localStorage.getItem(ACCESS_TOKEN_ISSUED_KEY) || '0', 10);
  const now      = Date.now();
  if (accessRefreshDue(expMs, now) || eagerRefreshDue(issuedMs, expMs, now)) _armGestureRefresh();
  else _disarmGestureRefresh();
}
function _onAccessTokenRefocus() { if (_hasDocument() && document.visibilityState === 'visible') _accessRecheckArmOnly(); } // focus is always visible

// AC-03/AC-06 — interactive reconnect: prompt:'consent' grant re-hydrates the FULL session
// (token + scope + identity + role), the same hydrate as sign-in — not just the access token.
async function _onReconnectRequest() {
  try {
    const resp = await reconnectDriveInteractive();            // full resp (scope + token)
    const user = await hydrateSessionFromToken(resp);          // re-mint id_token + scope flag
    if (user) await detectRoleViaDrive(user, { force: true }); // re-resolve currentSalesRepId
    window.dispatchEvent(new CustomEvent('vdg:auth-reconnected'));   // chip → green (clears auth-dead, resumes drain)
    window.dispatchEvent(new CustomEvent('vdg:sync-now'));           // drain outbox AFTER reconnected
  } catch {
    window.dispatchEvent(new CustomEvent('vdg:auth-needs-reconnect'));   // stay red, user can retry
  }
}

export function initAccessTokenRefresh() {
  if (_accessTimer) return;
  window.addEventListener('vdg:auth-reconnect-request', _onReconnectRequest);
  _accessCheck();                                  // immediate check on boot
  _accessTimer = setInterval(_accessCheck, ACCESS_CHECK_INTERVAL_MS);
  if (_hasDocument()) document.addEventListener('visibilitychange', _onAccessTokenRefocus);
  window.addEventListener('focus', _onAccessTokenRefocus);
}

export function stopAccessTokenRefresh() {
  if (_accessTimer) {
    clearInterval(_accessTimer);
    _accessTimer = null;
  }
  window.removeEventListener('vdg:auth-reconnect-request', _onReconnectRequest);
  if (_hasDocument()) document.removeEventListener('visibilitychange', _onAccessTokenRefocus);
  window.removeEventListener('focus', _onAccessTokenRefocus);
  _disarmGestureRefresh(); // never leak the click/keydown listener past the scheduler's life
}
