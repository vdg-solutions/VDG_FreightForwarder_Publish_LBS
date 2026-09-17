// compose-ui/auth.js — binds the ui's auth ports to the wasm freight_app exports.
//
// The gate's verdict comes from Rust (auth_require_auth); the browser actions it implies — mounting
// the login overlay, the reconnect chip, the reload — are executed here, where they belong.
import { bindAuthGate } from '../../implementations/ui/core_abstractions/ports/auth/auth-gate.js';
import { bindSessionRoles } from '../../implementations/ui/core_abstractions/ports/auth/session-roles.js';
import { mountLoginScreen, takeAuthError } from '../platform/auth.js';
import { renderBootFailure } from '../boot/boot-failure-screen.js';
import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../../implementations/kernel/core_abstractions/util/safe-await.js';
import { renderTabBlockedScreen } from '../../implementations/ui/bootstrap/views/tab-blocked.js';
import { takeTabOwnership } from '../../implementations/storage/implementations/local/tab-ownership.js';

const OUTCOME_SIGNED_IN = 'signed-in';
const OUTCOME_DEGRADED  = 'degraded';
const OUTCOME_TAB_BLOCKED = 'tab-blocked';
const APP_ROOT_ID = 'app';
const NEEDS_RECONNECT_EVENT = 'vdg:auth-needs-reconnect';
const SIGNIN_REQUEST_EVENT  = 'vdg:auth-signin-request';

let _signinListenerWired = false;

export function composeAuth(wasm) {
  const sessionRoles = {
    currentAccount:    () => wasm.auth_session_roles({}).account ?? null,
    currentRoleToken:  () => wasm.auth_session_roles({}).token ?? null,
    currentRoles:      () => wasm.auth_session_roles({}).roles,
    // session_principal.rs's own `resolved()` -- tells an empty currentRoles() apart from a
    // probe that never got an answer (see session-roles.js's own doc comment).
    currentRolesResolved: () => !!wasm.auth_session_roles({}).resolved,
    hasRole:           (role) => wasm.auth_has_role({ role }).has,
    setResolvedRoles:  (token, roles) => wasm.auth_set_resolved_roles({ token: token ?? null, roles: roles ?? null }).token ?? null,
  };
  bindSessionRoles(sessionRoles);


  // A failed request is not an answer about authority: the reply says so, and the REAL server
  // error is re-thrown so the boot fallbacks can read its status/kind.
  const detectRoleViaServer = async (user, options = {}) => {
    const reply = await wasm.auth_detect_role({ user: user ?? null, force: !!options.force });
    if (!reply.ok) throw takeAuthError() || new Error(reply.error || 'auth: the workspace authority did not answer');
    return reply.role;
  };

  // F-19-01: the probe carries its own 5s race; this outer guard catches a stall anywhere else in
  // the chain so boot can never hang silently on role resolution.
  const detectOrThrow = async (user, tag) => {
    const result = await safeAwait(detectRoleViaServer(user), SAFE_AWAIT_DEFAULT_MS, null, tag);
    if (!result.ok) throw result.error;
    return result.value;
  };

  // Everything the app does immediately AFTER a successful Google sign-in. It runs once
  // mountLoginScreen has already removed the login overlay and outside main()'s try, so nothing
  // here may reject: an unhandled rejection at this point left the user on an empty page with the
  // overlay gone and no screen behind it. Three calls can fail — the session adopt (a bare wasm
  // rejection), the role probe (where a dead session's 401 verdict arrives), and onSignedIn
  // itself, which is repo-init on the boot path — and each routes to the SAME screen main() would
  // give it. Never rejects, so the caller may fire it and forget it.
  const finishSignIn = async (onSignedIn, user) => {
    try {
      await wasm.auth_adopt_session({ email: user.email }); // bind the local database to this account
      await detectOrThrow(user, 'auth-gate:loginCb');
      await onSignedIn(user);
    } catch (err) {
      await renderBootFailure(err, { onRetryRepoInit: () => finishSignIn(onSignedIn, user) });
    }
  };

  const signIn = (onSignedIn) => mountLoginScreen((user) => { finishSignIn(onSignedIn, user); });

  // "Use this tab instead": take the workspace lock, then ask the SAME gate again — which now
  // answers about an owning tab and boots normally. The other tab loses the lock and stands itself
  // down (tab-ownership.js); nothing is negotiated between them beyond the lock.
  const useThisTab = async (onSignedIn) => {
    await takeTabOwnership();
    await requireAuth(onSignedIn);
  };

  const requireAuth = async (onSignedIn) => {
    const verdict = await wasm.auth_require_auth({});
    // Owner rule 2026-09-17: one tab. This branch RETURNS — onSignedIn is repo-init, and repo-init
    // is where the store is bound and the delta tick, the outbox drain and the health poll start
    // (repo-init-steps.js). Not calling it is the whole of "nothing that can write initialises in
    // a non-owning tab"; there is no second switch to remember.
    if (verdict.outcome === OUTCOME_TAB_BLOCKED) {
      renderTabBlockedScreen(document.getElementById(APP_ROOT_ID), {
        onUseThisTab: () => useThisTab(onSignedIn),
      });
      return;
    }
    if (verdict.outcome === OUTCOME_SIGNED_IN) {
      await detectOrThrow(verdict.user, 'auth-gate:requireAuth');
      await onSignedIn(verdict.user);
      return;
    }
    if (verdict.outcome === OUTCOME_DEGRADED) {
      await onSignedIn(verdict.user);
      window.dispatchEvent(new CustomEvent(NEEDS_RECONNECT_EVENT)); // token verified dead — true red
      return;
    }
    signIn(onSignedIn);
  };

  bindAuthGate({ requireAuth, detectRoleViaServer, clearRoleCache: () => wasm.auth_clear_role_cache({}) });

  // red-signedOut chip click → re-launch the login overlay
  if (!_signinListenerWired) {
    _signinListenerWired = true;
    window.addEventListener(SIGNIN_REQUEST_EVENT, () => signIn(() => location.reload()));
  }
}
