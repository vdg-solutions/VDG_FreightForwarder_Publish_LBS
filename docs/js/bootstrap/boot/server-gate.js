// server-gate.js — which terminal screen a boot-time Server failure earns, and what its one button
// actually does. Lives in boot/ because the decision needs the auth layer (the error's status, the
// reconnect mint) and the view layer (the screen); app.js's catch had it inline and could not be
// unit-driven, since main() runs at module eval.
//
// The distinction this exists for: an expired token is NOT "Server unreachable".

import {
  renderServerAccessGateScreen,
  SERVER_ACCESS_REASON_TRANSIENT, SERVER_ACCESS_REASON_SESSION,
} from '../../implementations/ui/bootstrap/views/auth/server-access-gate-screen.js';

const SERVER_ERROR_NAME  = 'ServerApiError';
const HTTP_UNAUTHORIZED = 401;

// Same event the topbar reconnect chip fires
const EVT_RECONNECT_REQUEST = 'vdg:auth-reconnect-request';
const EVT_RECONNECTED       = 'vdg:auth-reconnected';
const EVT_NEEDS_RECONNECT   = 'vdg:auth-needs-reconnect';

export function serverGateReason(err) {
  if (err?.name !== SERVER_ERROR_NAME) return null;
  if (err.status === HTTP_UNAUTHORIZED) return SERVER_ACCESS_REASON_SESSION;
  return SERVER_ACCESS_REASON_TRANSIENT;
}

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
  win.dispatchEvent(new CustomEvent(EVT_RECONNECT_REQUEST));
}

export function renderServerGate(mount, err, { onReconnected, onSignIn, serverBackend = true, win = window } = {}) {
  const reason = serverGateReason(err);
  if (!reason) return false;

  if (serverBackend && reason === SERVER_ACCESS_REASON_SESSION) {
    onSignIn?.();
    return true;
  }

  if (reason === SERVER_ACCESS_REASON_SESSION) {
    const render = (actionFailed) => renderServerAccessGateScreen(mount, {
      reason, actionFailed,
      onAction: () => requestReconnect((ok) => (ok ? onReconnected?.() : render(true)), win),
    });
    render(false);
    return true;
  }

  renderServerAccessGateScreen(mount, { reason });
  return true;
}
