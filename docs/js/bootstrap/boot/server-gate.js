// server-gate.js — which terminal screen a boot-time Server failure earns, and what its one button
// actually does. Lives in boot/ because the decision needs the auth layer (the error's verdict, the
// reconnect mint) and the view layer (the screen); app.js's catch had it inline and could not be
// unit-driven, since main() runs at module eval.
//
// The distinction this exists for: an expired token is NOT "Server unreachable".

import {
  renderServerAccessGateScreen,
  SERVER_ACCESS_REASON_TRANSIENT, SERVER_ACCESS_REASON_SESSION,
} from '../../implementations/ui/bootstrap/views/auth/server-access-gate-screen.js';

// This gate does not classify. It used to, by duck-typing the thrown error's class name, and it
// was wrong that way TWICE: first it tested for 'ServerApiError' (nothing threw it), then for
// 'ApiError' (nothing threw that either, once every server call moved into Rust and a wasm
// rejection became a plain Error). Each time it answered "not mine" for every real failure and a
// 401 at boot — a dead session — fell through to the generic unrecognized-error screen.
//
// The verdict is Rust's now (store::implementations::boot_gate_verdict), attached to the
// rejection by the producer that knows the status. These three names are that module's constants,
// and boot-gate-verdict-drift.test.mjs fails if they stop matching it or if the producer stops
// attaching the property.
const BOOT_GATE_PROP = 'bootGate';
const GATE_SESSION   = 'session';
const GATE_OUTAGE    = 'outage';

// kind -> screen. A kind absent from this table (the verdict's own 'unrecognized', or no verdict
// at all) is NOT this gate's failure: it falls through to app.js's generic branch, which shows the
// real error. Widening this table is how a false "your session died" would ship.
const REASON_BY_KIND = {
  [GATE_SESSION]: SERVER_ACCESS_REASON_SESSION,
  [GATE_OUTAGE]:  SERVER_ACCESS_REASON_TRANSIENT,
};

// Same event the topbar reconnect chip fires
const EVT_RECONNECT_REQUEST = 'vdg:auth-reconnect-request';
const EVT_RECONNECTED       = 'vdg:auth-reconnected';
const EVT_NEEDS_RECONNECT   = 'vdg:auth-needs-reconnect';

export function serverGateReason(err) {
  return REASON_BY_KIND[err?.[BOOT_GATE_PROP]?.kind] ?? null;
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
