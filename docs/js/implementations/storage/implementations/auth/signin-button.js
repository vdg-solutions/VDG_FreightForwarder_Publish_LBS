// signin-button.js — the "Sign in with Google" button: its markup, and the one click that turns a
// user gesture into a Google token. Split out of google-oauth.js, which had grown to carry the
// session model AND this screen's markup; the seam is that everything here is about the CLICK
// (gesture, popup, stall watchdog, error events) and nothing about what a session then IS.
//
// `hydrate` is injected rather than imported: google-oauth.js owns session hydration and calls
// this file, so importing it back would be a cycle.

import { isServerBackend } from '../../core_abstractions/backend.js';
import { ensureWindowOpen } from '../../core_abstractions/popup-guard.js';
import { DRIVE_SCOPE, IDENTITY_SCOPE } from '../../core_abstractions/drive-endpoints.js';
import { gisErrorMessage } from './gis-error.js';

/// How long a click may sit with no GIS callback before the user is told something is wrong.
const SIGNIN_STALL_HINT_MS = 60_000;

/// `clientId` is passed in, not read here: the Makefile substitutes the real id into exactly
/// two files, and a third copy of the placeholder would ship unsubstituted (guard-dist catches it,
/// but the right answer is not to have a third copy).
export function renderSignInButton(container, { hydrate, clientId }) {
  if (!container) return;
  container.innerHTML = `
    <button id="vdg-signin-btn"
            class="w-full flex items-center justify-center gap-3 px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50 transition">
      <svg viewBox="0 0 24 24" class="w-5 h-5 shrink-0" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      <span class="text-sm font-medium text-slate-700">Sign in with Google</span>
    </button>
  `;
  container.querySelector('#vdg-signin-btn').addEventListener('click', () => {
    // #21 stall watchdog — armed just before the popup call, disarmed by whichever GIS callback
    // answers. If neither ever does, the user gets an actionable hint instead of a dead screen.
    let stallTimer = null;
    const answered = () => { if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; } };
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      // Server backend: identity only. No Drive scope means no Drive consent screen and no
      // second popup — the server never touches the user's Drive.
      scope:     isServerBackend() ? IDENTITY_SCOPE : `${IDENTITY_SCOPE} ${DRIVE_SCOPE}`,
      callback:  (resp) => {
        answered();
        if (resp.error) {
          window.dispatchEvent(new CustomEvent('vdg:signin-error', { detail: resp.error }));
          return;
        }
        // F-19-84: sign-in routes through the same hydrate as reconnect/silent-boot — no
        // parallel path (RULE #5).
        hydrate(resp)
          .then(() => location.reload())
          .catch((err) => {
            window.dispatchEvent(new CustomEvent('vdg:signin-error', { detail: err.message }));
          });
      },
      // F-35-01 AC-02 — fail fast on a blocked popup instead of hanging with no callback at all.
      error_callback: (err) => {
        answered();
        window.dispatchEvent(new CustomEvent('vdg:signin-error', { detail: gisErrorMessage(err) }));
      },
    });
    // F-49-01 — restore a native window.open the ad-blocker may have nulled before GIS uses it.
    if (!ensureWindowOpen()) {
      window.dispatchEvent(new CustomEvent('vdg:auth-popup-blocked'));
      window.dispatchEvent(new CustomEvent('vdg:signin-error', { detail: 'popup-blocked:window-open-unavailable' }));
      return;
    }
    stallTimer = setTimeout(() => {
      stallTimer = null;
      window.dispatchEvent(new CustomEvent('vdg:signin-stalled'));
    }, SIGNIN_STALL_HINT_MS);
    client.requestAccessToken({ prompt: 'select_account' });
  });
}

