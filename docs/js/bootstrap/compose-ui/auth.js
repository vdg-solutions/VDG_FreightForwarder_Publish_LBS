// compose-ui/auth.js — binds the ui's auth ports to the wasm freight_app exports.
//
// The gate's verdict comes from Rust (auth_require_auth); the browser actions it implies — mounting
// the login overlay, the reconnect chip, the reload — are executed here, where they belong.
import { bindAuthGate } from '../../implementations/ui/core_abstractions/ports/auth/auth-gate.js';
import { bindSessionRoles } from '../../implementations/ui/core_abstractions/ports/auth/session-roles.js';
import { mountLoginScreen, takeAuthError } from '../platform/auth.js';
import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../../implementations/kernel/core_abstractions/util/safe-await.js';

const OUTCOME_SIGNED_IN = 'signed-in';
const OUTCOME_DEGRADED  = 'degraded';
const NEEDS_RECONNECT_EVENT = 'vdg:auth-needs-reconnect';
const SIGNIN_REQUEST_EVENT  = 'vdg:auth-signin-request';

let _signinListenerWired = false;

export function composeAuth(wasm) {
  const sessionRoles = {
    currentSalesRepId: () => wasm.auth_session_roles({}).token ?? null,
    currentRoles:      () => wasm.auth_session_roles({}).roles,
    hasRole:           (role) => wasm.auth_has_role({ role }).has,
    setResolvedRoles:  (token, roles) => wasm.auth_set_resolved_roles({ token: token ?? null, roles: roles ?? null }).token ?? null,
  };
  bindSessionRoles(sessionRoles);


  // A failed request is not an answer about authority: the reply says so, and the REAL Drive error
  // is re-thrown so the boot fallbacks can read its status/kind.
  const detectRoleViaDrive = async (user, options = {}) => {
    const reply = await wasm.auth_detect_role({ user: user ?? null, force: !!options.force });
    if (!reply.ok) throw takeAuthError() || new Error(reply.error || 'auth: the workspace authority did not answer');
    return reply.role;
  };

  // F-19-01: the probe carries its own 5s race; this outer guard catches a stall anywhere else in
  // the chain so boot can never hang silently on role resolution.
  const detectOrThrow = async (user, tag) => {
    const result = await safeAwait(detectRoleViaDrive(user), SAFE_AWAIT_DEFAULT_MS, null, tag);
    if (!result.ok) throw result.error;
    return result.value;
  };

  const signIn = (onSignedIn) => mountLoginScreen(async (user) => {
    await wasm.auth_adopt_session({ email: user.email }); // bind the local database to this account
    await detectOrThrow(user, 'auth-gate:loginCb');
    onSignedIn(user);
  });

  const requireAuth = async (onSignedIn) => {
    const verdict = await wasm.auth_require_auth({});
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

  bindAuthGate({ requireAuth, detectRoleViaDrive, clearRoleCache: () => wasm.auth_clear_role_cache({}) });

  // red-signedOut chip click → re-launch the login overlay
  if (!_signinListenerWired) {
    _signinListenerWired = true;
    window.addEventListener(SIGNIN_REQUEST_EVENT, () => signIn(() => location.reload()));
  }
}
