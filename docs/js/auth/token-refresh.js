// F-15-02 — Silent ID-token re-auth before expiry
// F-29-13 — proactive access-token scheduler + reconnect UX (independent 2nd timer)

import { parseIdToken, signOut } from './google-oauth.js';
import { refreshAccessTokenSilently, reconnectDriveInteractive } from './drive-api.js';

const TOKEN_KEY               = 'vdg.auth.id_token';
const REFRESH_LEAD_MS         = 5 * 60 * 1000;  // prompt 5min before exp
const REFRESH_CHECK_INTERVAL_MS = 60 * 1000;    // check every 60s

let _checkTimer = null;

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
  if (!window.google?.accounts?.id) return;
  try {
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // One Tap suppressed — session likely revoked or user opted out
        signOut();                                // F-15-50 AC-04: clear before banner
        window.dispatchEvent(new CustomEvent('vdg:session-expired'));
      }
    });
  } catch {
    /* accounts.id not initialized (OAuth2-only flow) — treat as expired */
    signOut();                                    // F-15-50 AC-04: clear before banner
    window.dispatchEvent(new CustomEvent('vdg:session-expired'));
  }
}

function _check() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    // Never signed in (or cleanly signed out) — silent, no banner
    return;
  }
  const expMs = _getExpMs();
  if (expMs == null) {
    // Token present but unparseable — corrupt, treat as expired
    signOut();                                    // F-15-50 AC-04: clear before banner
    window.dispatchEvent(new CustomEvent('vdg:session-expired'));
    return;
  }
  const remaining = expMs - Date.now();
  if (remaining < 0) {
    signOut();                                    // F-15-50 AC-04: clear before banner
    window.dispatchEvent(new CustomEvent('vdg:session-expired'));
    return;
  }
  if (remaining < REFRESH_LEAD_MS) {
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
  // scheduler fires the silent refresh WITHOUT any Drive call (AC-02). Failure/timeout is
  // surfaced by the bounded refresh's callers → auth-needs-reconnect; nothing to do here.
  refreshAccessTokenSilently().catch(() => { /* bounded; reconnect state handled downstream */ });
}

// AC-06 — interactive reconnect: prompt:'consent' grant clears reconnect state + resumes sync
async function _onReconnectRequest() {
  try {
    await reconnectDriveInteractive();
    window.dispatchEvent(new CustomEvent('vdg:auth-reconnected'));   // chip → green
    window.dispatchEvent(new CustomEvent('vdg:sync-now'));           // resume/drain outbox
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
