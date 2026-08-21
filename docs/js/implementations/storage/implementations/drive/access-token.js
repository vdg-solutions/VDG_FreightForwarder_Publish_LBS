// VDG binding for TokenAnchor (token-anchor.js) — the app's ONE token authority.
//
// The anchor is self-contained and CDN-liftable; everything VDG-specific lives here: the client
// id (Makefile sed target), the storage keys, the session-account pinning, the identity
// verification, the window.open ad-blocker guard, and the vdg:* event names. Every existing
// caller reaches it through the token port (storage/core_abstractions/token.js).
//
// Owner model ("lúc 401 mới cần"): the token lives in ONE place (localStorage). getAccessToken()
// just reads it — NEVER re-mints on a read. A Drive op that outlives the token 401s, and
// drive-api recovers through the anchor rule (see token-anchor.js): stale verdicts retry with
// the current token; only a fresh verdict spends the one shared silent refresh.

import { ensureWindowOpen } from '../../core_abstractions/popup-guard.js';
import { parseIdToken } from '../../core_abstractions/id-token.js';
import { ROLE_CACHE_KEY } from '../../core_abstractions/identity.js';
import { SAFE_AWAIT_DEFAULT_MS } from '../../../kernel/core_abstractions/util/safe-await.js';
import { createTokenAnchor, ANCHOR_EVT_POPUP_BLOCKED, ANCHOR_EVT_SIGNIN_REQUIRED } from '../../core_abstractions/token-anchor.js';
import { ACCESS_TOKEN_ISSUED_KEY } from '../../core_abstractions/token.js';

const CLIENT_ID                = '875515041729-klcro7nakobu353ktf0k2s2fkuu7u38n.apps.googleusercontent.com'; // Makefile sed target
// Must equal google-oauth.js::DRIVE_SCOPE — see the measurement recorded there for why this is
// the full Drive scope and not `drive.file`.
const DRIVE_SCOPE              = 'https://www.googleapis.com/auth/drive';
const ID_TOKEN_KEY             = 'vdg.auth.id_token';
const ACCESS_TOKEN_KEY         = 'vdg.auth.access_token';
const ACCESS_TOKEN_EXP_KEY     = 'vdg.auth.access_token_exp';
// MUST stay below SAFE_AWAIT_DEFAULT_MS (the per-Drive-op safeAwait bound). On a static deploy
// silent refresh can never succeed (F-50-01: no server, no gesture) and GIS can hang without
// ever firing error_callback — this timer is the only exit. If it fires AFTER the op's 8s
// safeAwait gives up, every boot migrator op eats a full 8s before the shared-refresh rejection
// primes the anchor's cooldown: a dozen ops => minutes on the "syncing" overlay. Firing first
// (< 8s) lets ONE op settle the refresh, arm the cooldown, and the rest fast-fail in ~0ms.
const SILENT_REFRESH_TIMEOUT_MS = Math.max(1_000, SAFE_AWAIT_DEFAULT_MS - 2_000); // 6s, guaranteed < op bound

// Multi-account guard: the browser can hold several Google sessions at once. A re-mint WITHOUT
// login_hint lets Google pick its DEFAULT session account — silently flipping the app's token to
// a different account than the one signed in (wrong identity, wrong users/<prefix> routing).
// Always pin the mint to the current session's email.
function _sessionEmail() {
  const token = localStorage.getItem(ID_TOKEN_KEY);
  const payload = token ? parseIdToken(token) : null;
  if (payload?.email) return payload.email;
  // Expired session: getCurrentUser() deletes the stale id_token, which used to erase the
  // account anchor exactly when the reconnect mint needs it — Google then picked the browser's
  // DEFAULT account and the verify had nothing to check against (silent account flip on
  // reconnect). The role cache {email, role} survives expiry; it IS the working account.
  try {
    const raw = localStorage.getItem(ROLE_CACHE_KEY);
    const email = raw ? JSON.parse(raw)?.email : null;
    return email || undefined;
  } catch { return undefined; /* corrupt cache reads as no anchor — sign-in re-establishes it */ }
}

// Account guarantee (owner: "cần phải đảm bảo account"): login_hint pins the chooser, but a hint
// is ADVISORY — verify the minted token's real identity against the session BEFORE persisting.
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

let _anchorInstance = null;
// Lazy: the anchor factory is a port bound by the storage bootstrap, so constructing it at module
// load would run before the binding exists.
function _anchor() {
  if (_anchorInstance) return _anchorInstance;
  _anchorInstance = createTokenAnchor({
  clientId: CLIENT_ID,
  scope:    DRIVE_SCOPE,
  keys:     { token: ACCESS_TOKEN_KEY, exp: ACCESS_TOKEN_EXP_KEY, issued: ACCESS_TOKEN_ISSUED_KEY },
  loginHint:       _sessionEmail,
  verifyAccount:   _verifySameAccount,
  ensurePopup:     ensureWindowOpen, // F-49-01 — restore a native window.open an ad-blocker may have nulled
  silentTimeoutMs: SILENT_REFRESH_TIMEOUT_MS,
  emit: (name) => {
    if (name === ANCHOR_EVT_POPUP_BLOCKED)   window.dispatchEvent(new CustomEvent('vdg:auth-popup-blocked'));
    if (name === ANCHOR_EVT_SIGNIN_REQUIRED) window.dispatchEvent(new CustomEvent('vdg:auth-signin-request')); // full login — pick the right account
  },
  });
  return _anchorInstance;
}

async function getAccessToken() { return _anchor().current(); }

function refreshAccessTokenSilently() { return _anchor().silent(); }        // drive-api 401 re-mint ONLY

// The anchor rule for drive-api's 401 branches — see token-anchor.js::recover.
function recoverFromUnauthorized(usedToken) { return _anchor().recover(usedToken); }

// Reconnect-chip click. prompt:'' + login_hint: an already-consented live session auto-closes the
// popup in a flash on the CORRECT account. Escalation ladder (owner model): wrong account minted →
// FORCE the account chooser; wrong again → full sign-in ("phải bắt login nếu không chọn được lại
// đúng account đang làm việc"); other refusals escalate to prompt:'consent'.
function reconnectDriveInteractive() { return _anchor().reconnect(); }

/// What the storage bootstrap binds behind the token port.
export const tokenAuthority = { getAccessToken, refreshAccessTokenSilently, recoverFromUnauthorized, reconnectDriveInteractive };
