// drive-gate.js — which terminal screen a boot-time Drive failure earns, and what its one button
// actually does. Lives in boot/ because the decision needs the auth layer (the error's status, the
// reconnect mint) and the view layer (the screen); app.js's catch had it inline and could not be
// unit-driven, since main() runs at module eval.
//
// The distinction this exists for: an expired token is NOT "Drive unreachable". Verified live on
// the deploy (2026-08-12) — userinfo and three files.list calls returned 200, then the first
// alt=media download took a 401. The screen said "check your network connection and try again"
// over a Reload button, and reload lands on the same screen, because no amount of reloading mints
// a token: on a static deploy the only door is a GIS popup, and that needs a real user gesture.
// A click on this button IS that gesture.

import {
  renderDriveAccessGateScreen,
  DRIVE_ACCESS_REASON_SCOPE, DRIVE_ACCESS_REASON_PERMISSION,
  DRIVE_ACCESS_REASON_TRANSIENT, DRIVE_ACCESS_REASON_SESSION,
} from '../../implementations/ui/bootstrap/views/auth/drive-access-gate-screen.js';
import { DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT, DRIVE_ERROR_KIND_FILE_PERMISSION }
  from '../../implementations/storage/core_abstractions/drive-error-classifier.js';

const DRIVE_ERROR_NAME  = 'DriveApiError';
const HTTP_UNAUTHORIZED = 401;

// Same event the topbar reconnect chip fires — token-refresh.js owns the one reconnect path
// (interactive mint → full session hydrate → role re-resolve), so this screen does not grow a
// second one.
const EVT_RECONNECT_REQUEST = 'vdg:auth-reconnect-request';
const EVT_RECONNECTED       = 'vdg:auth-reconnected';
const EVT_NEEDS_RECONNECT   = 'vdg:auth-needs-reconnect';

// Which screen the error earns. Scope and file-permission are already typed by the classifier;
// 401 means the credential died (the request reached Google and was answered); anything else —
// status 0 transport, 5xx, exhausted 429 — is genuinely "we could not reach Drive".
export function driveGateReason(err) {
  if (err?.name !== DRIVE_ERROR_NAME) return null;
  if (err.driveErrorKind === DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT) return DRIVE_ACCESS_REASON_SCOPE;
  if (err.driveErrorKind === DRIVE_ERROR_KIND_FILE_PERMISSION)    return DRIVE_ACCESS_REASON_PERMISSION;
  if (err.status === HTTP_UNAUTHORIZED)                           return DRIVE_ACCESS_REASON_SESSION;
  return DRIVE_ACCESS_REASON_TRANSIENT;
}

// Fires the reconnect and resolves once, whichever way it went. Both listeners come off on the
// first event so a later chip reconnect can't re-enter this screen's handler.
function requestReconnect(onSettled, win = window) {
  let settled = false;
  const finish = (ok) => {
    if (settled) return;
    settled = true;
    win.removeEventListener(EVT_RECONNECTED, onOk);
    win.removeEventListener(EVT_NEEDS_RECONNECT, onFail);
    onSettled(ok);
  };
  const onOk   = () => finish(true);
  const onFail = () => finish(false);
  win.addEventListener(EVT_RECONNECTED, onOk);
  win.addEventListener(EVT_NEEDS_RECONNECT, onFail);
  // Dispatched synchronously inside the click handler — user activation must still be live when
  // GIS calls window.open, or the popup is blocked before it opens.
  win.dispatchEvent(new CustomEvent(EVT_RECONNECT_REQUEST));
}

// mount: the boot fallback container. err: the DriveApiError that ended boot.
// onRequestScope / onReconnected are injected so this module stays testable without GIS.
// Returns false when the error is not a Drive one — the caller must rethrow rather than paint a
// screen that names the wrong cause.
export function renderDriveGate(mount, err, { onRequestScope, onReconnected, onSignIn,
                                              serverBackend = false, win = window } = {}) {
  const reason = driveGateReason(err);
  if (!reason) return false;

  // Server deployment: the browser holds a SERVER session and never touches Drive (the server
  // owns it). A 401 here is that session expiring, so the remedy is an ordinary sign-in. The
  // Drive re-consent this screen used to offer asks Google for a Drive scope the build does not
  // use, which is what put an "unverified app" warning in front of a routine timeout.
  if (serverBackend && reason === DRIVE_ACCESS_REASON_SESSION) {
    onSignIn?.();
    return true;
  }

  if (reason === DRIVE_ACCESS_REASON_SCOPE) {
    const render = (actionFailed) => renderDriveAccessGateScreen(mount, {
      reason, actionFailed,
      onAction: () => onRequestScope?.(
        () => onReconnected?.(),   // scope acquired — resume boot
        () => render(true),        // declined again — visible feedback, not a no-op
      ),
    });
    render(false);
    return true;
  }

  if (reason === DRIVE_ACCESS_REASON_SESSION) {
    const render = (actionFailed) => renderDriveAccessGateScreen(mount, {
      reason, actionFailed,
      onAction: () => requestReconnect((ok) => (ok ? onReconnected?.() : render(true)), win),
    });
    render(false);
    return true;
  }

  renderDriveAccessGateScreen(mount, { reason });
  return true;
}
