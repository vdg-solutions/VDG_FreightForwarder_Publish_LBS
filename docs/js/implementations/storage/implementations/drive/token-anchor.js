// TokenAnchor — browser-only Google access-token authority.
//
// Self-contained on purpose: no imports, every environmental dependency injected through the
// config. This file is designed to lift out to a CDN unchanged; the host app supplies a thin
// binding (see access-token.js for the reference binding).
//
// The model it encodes — Google's actual token policy for a static deploy (no backend):
//   1. The browser is only ever issued ACCESS tokens (~1h). Refresh tokens need a server.
//   2. Every mint is a popup. With a live session it auto-closes in a flash, but WITHOUT a user
//      gesture the browser blocks it — background refresh is impossible, by design.
//   3. A new mint does NOT revoke the previous token, and a 401 is a verdict on ONE token
//      string — never on the session.
//
// Rule 3 is the anchor rule and the reason this exists: every 401 handler must present the token
// that was refused. If that token is no longer the current one, the verdict is STALE — some other
// door (a reconnect click, a parallel request's refresh) already fixed the session while this
// request was in flight — and acting on a stale verdict is how an app paints "session expired"
// seconds after the user successfully reconnected.

export const TOKEN_ANCHOR_VERSION = '1.0.0';

const DEFAULT_SILENT_TIMEOUT_MS   = 6_000;
// After a definitive silent-refresh failure, further recover() calls for the SAME dead token
// fast-fail instead of re-attempting a doomed gesture-less popup each time (console spam, and
// every caller eating the full timeout). A successful mint stores a new token string, which
// makes the cooldown irrelevant by construction — it is keyed to the dead token.
const DEFAULT_FAILURE_COOLDOWN_MS = 30_000;

// GIS error_callback types that mean "popup blocked", per Google's error guide.
const POPUP_BLOCKED_TYPES = ['popup_failed_to_open', 'popup_closed'];

// Events surfaced through config.emit — the names are the port's (storage/core_abstractions/token-anchor.js).
import { ANCHOR_EVT_POPUP_BLOCKED, ANCHOR_EVT_SIGNIN_REQUIRED } from '../../core_abstractions/token-anchor.js';

function createTokenAnchor({
  clientId,
  scope,
  keys,                                  // { token, exp, issued } — storage key names
  storage,                               // Storage-like; resolved LAZILY (default globalThis.localStorage) so constructing the anchor at module scope never touches the environment
  gis            = () => window.google?.accounts?.oauth2,
  loginHint      = () => undefined,      // () => email — pins every mint to the working account
  verifyAccount  = async () => true,     // (resp, hint) => bool — reject cross-account mints
  ensurePopup    = () => true,           // pre-flight window.open guard; false => blocked
  silentTimeoutMs   = DEFAULT_SILENT_TIMEOUT_MS,
  failureCooldownMs = DEFAULT_FAILURE_COOLDOWN_MS,
  now  = () => Date.now(),
  emit = () => {},
} = {}) {
  let _inflight      = null;   // the ONE shared silent refresh — concurrent 401s piggyback
  let _cooldownUntil = 0;
  let _cooldownToken = null;   // the token string the cooldown verdict belongs to
  let _cooldownError = null;

  const _store = () => storage ?? globalThis.localStorage;

  function current()   { return _store().getItem(keys.token); }
  function expiresAt() { const v = _store().getItem(keys.exp); return v ? Number(v) : null; }

  // Store a GIS token response. The new token string is what retires every stale verdict and
  // cooldown — no flags to reset, the comparison does it.
  function persist(resp) {
    const expMs = now() + (resp.expires_in || 3600) * 1000;
    _store().setItem(keys.token,  resp.access_token);
    _store().setItem(keys.exp,    String(expMs));
    _store().setItem(keys.issued, String(now()));
    return expMs;
  }

  // One GIS token request, bounded and account-verified. prompt: '' | 'consent' |
  // 'select_account'. timeoutMs 0 = unbounded (interactive — the user is looking at a popup).
  // Must be reachable synchronously from a click handler: gesture activation dies at the first
  // await, so nothing async happens before requestAccessToken().
  function mint(prompt, { timeoutMs = 0, returnResp = false } = {}) {
    return new Promise((resolve, reject) => {
      const oauth2 = gis();
      if (!oauth2) { reject(new Error('GIS oauth2 not loaded')); return; }
      let settled = false;
      const timer = timeoutMs
        ? setTimeout(() => { if (!settled) { settled = true; reject(new Error('silent-refresh-timeout')); } }, timeoutMs)
        : null;
      const done = (fn, arg) => { if (!settled) { settled = true; if (timer) clearTimeout(timer); fn(arg); } };
      const hint = loginHint();
      const client = oauth2.initTokenClient({
        client_id: clientId,
        scope,
        ...(hint ? { login_hint: hint } : {}),
        callback: (resp) => {
          if (resp.error) { done(reject, new Error(resp.error)); return; }
          Promise.resolve(verifyAccount(resp, hint))
            .then((same) => {
              // login_hint is ADVISORY — Google can mint for another signed-in account. A
              // mismatched token is rejected outright, never persisted: silently flipping the
              // app's identity routes its writes into the wrong user's data.
              if (!same) { done(reject, new Error(`account-mismatch:${hint}`)); return; }
              persist(resp);
              done(resolve, returnResp ? resp : resp.access_token);
            })
            .catch((e) => done(reject, e));
        },
        // A definitive GIS error settles immediately, distinct from the timeout — a blocked
        // popup must never eat the full bound.
        error_callback: (err) => {
          const type = err?.type || 'unknown';
          done(reject, new Error(POPUP_BLOCKED_TYPES.includes(type) ? `popup-blocked:${type}` : `gis-error:${type}`));
        },
      });
      // An ad-blocker can null window.open; GIS calls it internally and throws synchronously.
      if (!ensurePopup()) {
        emit(ANCHOR_EVT_POPUP_BLOCKED);
        done(reject, new Error('popup-blocked:window-open-unavailable'));
        return;
      }
      client.requestAccessToken({ prompt });
    });
  }

  function silent() { return mint('', { timeoutMs: silentTimeoutMs }); }

  // The anchor rule. usedToken: the token the 401'd request actually sent.
  //   stale verdict  → resolve the current token; the caller just retries. No popup, no red.
  //   fresh verdict  → ONE shared silent refresh; every concurrent 401 awaits the same promise
  //                    instead of each declaring the session dead.
  //   known-dead     → fast-fail inside the cooldown window rather than re-attempting a
  //                    gesture-less popup per request.
  function recover(usedToken) {
    const cur = current();
    if (cur && cur !== usedToken) return Promise.resolve(cur);
    if (_cooldownToken === cur && now() < _cooldownUntil) {
      return Promise.reject(_cooldownError || new Error('recover-cooldown'));
    }
    if (!_inflight) {
      _inflight = silent()
        .catch((err) => {
          _cooldownToken = cur;
          _cooldownUntil = now() + failureCooldownMs;
          _cooldownError = err;
          throw err;
        })
        .finally(() => { _inflight = null; });
    }
    return _inflight;
  }

  // Interactive reconnect ladder, for a click handler (the click IS the gesture):
  //   '' with login_hint → an already-consented live session auto-closes on the right account;
  //   wrong account minted → force the chooser; wrong again → the host must run a full sign-in;
  //   any other refusal → escalate to full consent.
  async function reconnect() {
    try {
      return await mint('', { returnResp: true });
    } catch (err) {
      const msg = String(err?.message || '');
      if (msg.startsWith('popup-blocked:')) throw err; // no popup available — every retry equally doomed
      if (msg.startsWith('account-mismatch:')) {
        try {
          return await mint('select_account', { returnResp: true });
        } catch (err2) {
          if (String(err2?.message || '').startsWith('account-mismatch:')) emit(ANCHOR_EVT_SIGNIN_REQUIRED);
          throw err2;
        }
      }
      return mint('consent', { returnResp: true });
    }
  }

  return { current, expiresAt, persist, mint, silent, recover, reconnect };
}

/// What the storage bootstrap binds behind the token-anchor port.
export const tokenAnchorFactory = { createTokenAnchor };
