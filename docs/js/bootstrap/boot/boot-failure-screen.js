// boot-failure-screen.js — ONE place decides what a failed start shows the user.
//
// main()'s try covered the boot path only. The sign-in callback (compose-ui/auth.js) runs AFTER
// mountLoginScreen has already torn the login overlay down, and OUTSIDE that try — so every
// rejection in it (the session adopt, the role probe, repo-init itself) was an unhandled promise
// rejection: no screen, no message, the user left staring at an empty page. That callback routes
// here now, through the same ladder, so the two paths cannot answer the same failure differently.
//
// Nothing here classifies. The server verdict is Rust's (store::implementations::boot_gate_verdict,
// attached to the rejection by the producer) and server-gate.js maps it to a screen; a failure this
// ladder cannot name falls to the generic branch, which shows the real message and a way out —
// never a confident wrong diagnosis, and never a dead end that needs the tab closed.

import { renderServerGate } from './server-gate.js';
import { renderRepoInitTimeoutBanner } from './repo-init-fallback.js';
import { handleUnrecognizedBootError } from './wasm-boot-loader.js';
import { mountLoginScreen } from '../platform/auth.js';

const APP_ROOT_ID         = 'app';
const VIEW_ROOT_ID        = 'view-root';
const BOOT_PLACEHOLDER_ID = 'view-loading';

const ROLE_PROBE_TIMEOUT = 'RoleProbeTimeoutError';
// 'IdbOpenFailedError' is a leftover of the deleted IndexedDB path — nothing throws it any more
// (the store is SQLite/OPFS) — kept as a harmless extra match rather than risk missing a caller.
const REPO_INIT_TIMEOUTS = ['RepoInitTimeoutError', 'IdbOpenFailedError'];

/// Where a terminal screen goes: the boot placeholder's own parent, so replacing its contents also
/// removes the frozen "Loading view…" placeholder underneath.
export function bootFallbackMount() {
  return document.getElementById(BOOT_PLACEHOLDER_ID)?.parentElement
      || document.getElementById(VIEW_ROOT_ID)
      || document.getElementById(APP_ROOT_ID);
}

/// Paints the screen `err` earns. `onRetryRepoInit` is the caller's own way to re-run the step
/// that timed out (main() re-enters runRepoInit; the sign-in callback re-enters itself), because
/// only the caller holds the user and the app shell to re-run it with.
export async function renderBootFailure(err, { onRetryRepoInit = () => location.reload() } = {}) {
  const mount = bootFallbackMount();

  // AC-07: the role probe hung — its own banner clears the session and re-arms sign-in.
  if (err?.name === ROLE_PROBE_TIMEOUT) {
    const { renderLoadingBanner } = await import('../../implementations/ui/bootstrap/views/auth/auth-fallback-views.js');
    renderLoadingBanner(document.getElementById(APP_ROOT_ID));
    return;
  }

  // AC-03: repo-init hang → actionable banner with Retry.
  if (REPO_INIT_TIMEOUTS.includes(err?.name)) {
    renderRepoInitTimeoutBanner(mount, onRetryRepoInit);
    return;
  }

  if (renderServerGate(mount, err, {
    onReconnected: () => location.reload(),
    serverBackend: true,
    onSignIn:      () => mountLoginScreen(() => location.reload()),
  })) {
    // The whole error, not picked-apart fields: the Rust verdict rides on it as a property
    // (boot_gate_verdict), and `err.status` was a leftover of the duck-typed shape nothing
    // produces any more — it logged `undefined` on every real boot failure.
    console.error('[VDG] boot stopped on Server', err); // DEV
    return;
  }

  // Anything else — a 503 on pkg/vdg_freight.js during a deploy-propagation window, a wasm export
  // rejecting with a bare message (auth_adopt_session does), a TypeError in the chain. Rust could
  // not name it, so neither do we: the real message plus a Reload button, never a guessed
  // "your session expired" that would sign a working user out.
  handleUnrecognizedBootError(err, mount);
}
