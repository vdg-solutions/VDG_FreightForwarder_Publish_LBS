// Token reconnect wiring. Owner model ("lúc 401 mới cần"): the app NEVER proactively re-mints a
// token — no 60s scheduler, no gesture-armed silent refresh, no cold-boot bootstrap. The access
// token lives in ONE place (localStorage); getAccessToken() just reads it, and drive-api re-mints
// exactly once on a real 401. The only interactive re-mint left is the reconnect-chip click,
// wired here off the vdg:auth-reconnect-request event.

import { reconnectDriveInteractive } from './drive-api.js';
import { hydrateSessionFromToken } from './google-oauth.js';
import { detectRoleViaDrive } from './auth-gate.js';

// Interactive reconnect: a prompt:'consent' grant re-hydrates the FULL session (token + scope +
// identity + role), the same hydrate as sign-in — not just the access token.
async function _onReconnectRequest() {
  try {
    const resp = await reconnectDriveInteractive();            // full resp (scope + token)
    const user = await hydrateSessionFromToken(resp);          // re-mint id_token + scope flag
    if (user) await detectRoleViaDrive(user, { force: true }); // re-resolve currentSalesRepId
    window.dispatchEvent(new CustomEvent('vdg:auth-reconnected'));   // chip → green, resumes drain
    window.dispatchEvent(new CustomEvent('vdg:sync-now'));          // drain outbox AFTER reconnected
  } catch {
    window.dispatchEvent(new CustomEvent('vdg:auth-needs-reconnect'));   // stay red, user can retry
  }
}

let _wired = false;

export function initAccessTokenRefresh() {
  if (_wired) return;
  _wired = true;
  window.addEventListener('vdg:auth-reconnect-request', _onReconnectRequest);
}

export function stopAccessTokenRefresh() {
  if (!_wired) return;
  _wired = false;
  window.removeEventListener('vdg:auth-reconnect-request', _onReconnectRequest);
}
