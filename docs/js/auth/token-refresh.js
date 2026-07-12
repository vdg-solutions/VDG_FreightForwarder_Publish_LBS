// F-15-02 — Silent ID-token re-auth before expiry

import { parseIdToken, signOut } from './google-oauth.js';

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
