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
    _silentPrompt();
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
  if (!accessRefreshDue(expMs, Date.now())) return;
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
}
