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
// refresh is ALWAYS a reconnect intent, never sign-out/clear-keys.
export const REFRESH_FAILURE_ACTION = Object.freeze({ RECONNECT: 'needs-reconnect' });
export function refreshFailureAction() { return REFRESH_FAILURE_ACTION.RECONNECT; }

function _dispatchNeedsReconnect() { window.dispatchEvent(new CustomEvent('vdg:auth-needs-reconnect')); }

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
    .catch(() => {
      if (refreshFailureAction() === REFRESH_FAILURE_ACTION.RECONNECT) _dispatchNeedsReconnect();
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
    .catch(() => {
      // AC-02/AC-07: a real failure is a reconnect intent — never a blind purge.
      if (refreshFailureAction() === REFRESH_FAILURE_ACTION.RECONNECT) _dispatchNeedsReconnect();
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

// ── public API ────────────────────────────────────────────────────────────────

export function initTokenRefresh() {
  if (_checkTimer) return; // already running
  _check(); // immediate check on boot
  _checkTimer = setInterval(_check, REFRESH_CHECK_INTERVAL_MS);
}

export function stopTokenRefresh() {
  if (_checkTimer) {
    clearInterval(_checkTimer);
    _checkTimer = null;
  }
  _disarmGestureRefresh(); // never leak the click/keydown listener past the scheduler's life
}

// ── F-29-13: proactive access-token scheduler ───────────────────────────────────

const ACCESS_TOKEN_EXP_KEY     = 'vdg.auth.access_token_exp';
const ACCESS_REFRESH_LEAD_MS   = 5 * 60 * 1000;   // refresh access token 5min before exp
const ACCESS_CHECK_INTERVAL_MS = 60 * 1000;

let _accessTimer = null;

// AC-01 — pure timing predicate, clock injected (mirrors _check style). Exported for unit test.
export function accessRefreshDue(expMs, now, leadMs = ACCESS_REFRESH_LEAD_MS) {
  if (!expMs) return false;              // no access token yet → not due
  return (expMs - now) < leadMs;         // valid-but-within-lead OR already expired → due
}

function _accessCheck() {
  const expMs = parseInt(localStorage.getItem(ACCESS_TOKEN_EXP_KEY) || '0', 10);
  if (!accessRefreshDue(expMs, Date.now())) { _disarmGestureRefresh(); return; } // out of window
  _armGestureRefresh();                     // AC-05 — arm the invisible gesture-anchored recovery
  // AC-01: routed through the shared single-flight so a near-simultaneous id-token scheduler
  // tick shares this same refresh instead of firing a second GIS request.
  sharedSilentRefresh()
    .then(() => {
      const newExp = parseInt(localStorage.getItem(ACCESS_TOKEN_EXP_KEY) || '0', 10);
      restampIdTokenExp(newExp);            // keep synthetic id-token session in lockstep
    })
    .catch(() => {
      // AC-02/AC-07: a real failure is a reconnect intent — never a blind purge.
      if (refreshFailureAction() === REFRESH_FAILURE_ACTION.RECONNECT) _dispatchNeedsReconnect();
    });
}

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
}

export function stopAccessTokenRefresh() {
  if (_accessTimer) {
    clearInterval(_accessTimer);
    _accessTimer = null;
  }
  window.removeEventListener('vdg:auth-reconnect-request', _onReconnectRequest);
  _disarmGestureRefresh(); // never leak the click/keydown listener past the scheduler's life
}
