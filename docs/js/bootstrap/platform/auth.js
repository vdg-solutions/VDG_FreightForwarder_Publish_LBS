// platform/auth.js — extra platform methods the Rust auth use-cases import (js_auth.rs extern type).
//
// Everything browser-bound about signing in lives here: the Google session, the workspace
// authority's verdict, this browser's role memory (localStorage), the role broadcast and the login
// overlay. The DECISIONS made from these answers are in Rust (freight_app/operators/auth) — this
// file only answers and acts. The timeouts stay here too, so no timer leaks into an inner layer.
import { getCurrentUser, signOut, wasPreviouslySignedIn, rebuildSessionFromStoredToken }
  from '../../implementations/storage/core_abstractions/identity.js';
import { roleCacheKey } from '../../implementations/storage/core_abstractions/identity-cache-keys.js';
import { activeWorkspaceName } from '../../implementations/storage/core_abstractions/workspace-registry.js';
import { hasSessionCredential } from '../../implementations/storage/core_abstractions/backend.js';
import { workspaceAuthority } from '../../implementations/storage/core_abstractions/workspace-authority.js';
import { sqlCountEntities, setStoreScope } from '../../implementations/storage/core_abstractions/local-store.js';
import { claimTabOwnership } from '../../implementations/storage/implementations/local/tab-ownership.js';
import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../../implementations/kernel/core_abstractions/util/safe-await.js';

const AUTH_PROBE_TIMEOUT_MS = 20000;           // F-15-19 AC-4: surface a banner if the probe hangs
// Longest a boot will wait for the single-tab fact before ruling it unobtainable. Deliberately
// ABOVE tab-ownership.js's LOCK_HANDOFF_GRACE_MS (3s): a refused tab has to keep the room to say
// no honestly, and a deadline under that grace would boot every second tab and delete the rule.
// Above it, nothing legitimate is still running, so reaching this is always a bug or a browser
// that stopped answering — never a normal wait.
const TAB_OWNERSHIP_ANSWER_DEADLINE_MS = 5000;
const ROLES_RESOLVED_EVENT   = 'vdg:roles-resolved';
const LOGIN_ROOT_ID          = 'login-root';
const LOGIN_OVERLAY_STYLE    = 'position:fixed;inset:0;z-index:50;background:#f8fafc;';
// F4-c: index.html's pre-rendered boot placeholder — visible by default, cleared only once a
// route actually renders (view-root.js's freshViewRoot). A signed-out session never reaches that
// render (this overlay is the whole story until sign-in), so without this the placeholder just
// sits there, live, underneath the login card for as long as the user stays signed out — every
// normal sign-out included, not just a slow/failed boot. boot-fsm-view.js un-hides it the moment
// a real boot phase fires again.
const BOOT_PLACEHOLDER_ID    = 'view-loading';

export class RoleProbeTimeoutError extends Error {
  constructor() {
    super('Auth probe timeout');
    this.name = 'RoleProbeTimeoutError';
  }
}

// The error object the probe actually threw. It crosses into Rust as a message only, so it is kept
// here and re-thrown by the port delegate: app.js's boot fallbacks read the real error properties.
let _lastError = null;
export function takeAuthError() {
  const err = _lastError;
  _lastError = null;
  return err;
}

function _readCache() {
  try { return JSON.parse(localStorage.getItem(roleCacheKey()) || 'null'); }
  catch { return null; } // a corrupt entry is no entry — the next probe rewrites it
}

/// The raw cached identity, synchronously — for the freight_app operators that have not moved to
/// Rust yet and read it inside a sync decision.
export function readCachedIdentityNow() {
  const raw = _readCache();
  return raw?.email && raw?.role
    ? { email: raw.email, role: raw.role, roles: Array.isArray(raw.roles) ? raw.roles : [] }
    : null;
}

/// The single-tab fact, bounded. `claim` is defaulted, not passed, so it is still asked exactly
/// once and only when the gate asks — and so a test can hand this the one input it must survive:
/// a promise that never settles. A test that stubbed the wrapper instead of the fact would be
/// measuring its own copy of this logic, which is how v0.4.101 got through a green gate.
export async function answerTabOwnership(claim = claimTabOwnership()) {
  const answered = await safeAwait(claim, TAB_OWNERSHIP_ANSWER_DEADLINE_MS, null, 'auth-gate:tabOwnership');
  if (!answered.ok) throw answered.error;   // told us nothing — require_auth rules that a boot
  return answered.value;
}

export const authPlatform = {
  // The single-tab rule's one platform fact (owner 2026-09-17). Asked once, when the gate asks —
  // not eagerly at module load, which would only start the handoff grace EARLIER and give a
  // reload's outgoing document less of it. Rust decides what the answer MEANS; this only reports.
  //
  // Bounded, because v0.4.101 shipped a claim that could not settle and the boot parked on it
  // forever with no screen at all — a blank page, which is the one failure a person cannot work
  // around. The timer lives here (this file owns the timeouts; no timer leaks inward) and the
  // VERDICT stays in Rust: a rejection says the platform told us nothing, and require_auth
  // already rules that a boot rather than a refusal. Two open tabs is a nuisance; a blank page
  // is a stopped business.
  auth_holds_tab_ownership:     () => answerTabOwnership(),

  // The single-tab rule's SECOND platform fact: does this document hold the server credential?
  // Unbounded on purpose — it is a synchronous sessionStorage read, not a lock or a request, so
  // there is nothing here that could fail to settle.
  auth_holds_session_credential: async () => hasSessionCredential(),

  auth_current_user:            async () => getCurrentUser() ?? null,
  auth_was_previously_signed_in: async () => !!wasPreviouslySignedIn(),

  // Bounded, and by the SAME ceiling the other door to /me already carries. Both reach
  // `me_http::fetch_me`: the role probe through compose-ui's detectOrThrow (SAFE_AWAIT_DEFAULT_MS),
  // this one through serverSessionIdentity() — and this one had no ceiling at all, so
  // require_auth awaited a request that could simply never answer. That is the v0.4.101 shape on
  // a different call, and it is where PROD v0.4.103's ~97s boot sat. A timeout reads as a dead
  // token, which is already this method's contract for "cannot revive".
  auth_revive_session: async () => {
    const revived = await safeAwait(
      rebuildSessionFromStoredToken(), SAFE_AWAIT_DEFAULT_MS, null, 'auth-gate:reviveSession',
    );
    return revived.ok ? (revived.value ?? null) : null;
  },

  // Fired, never awaited. The gate asks for a defensive local clear, and signOut() performs that
  // SYNCHRONOUSLY before the promise it returns exists; the rest of that promise is DELETE
  // /session, whose answer nothing on this path reads (`let _ = self.auth.sign_out().await`).
  // Awaiting it stood an unbounded round trip — to the very server that just refused this
  // session — between the person and the sign-in screen the gate had already decided on.
  auth_sign_out: async () => {
    // signOut() logs its own server outage and clears the token either way; boot has moved on.
    Promise.resolve(signOut()).catch(() => { /* handled inside signOut — never blocks the screen */ });
  },

  auth_set_store_scope:         async (email) => { setStoreScope(email); },
  auth_active_workspace_name:   async () => activeWorkspaceName() || null,

  // F-57-01 AC-04: does this browser already hold at least one synced entity row? Runs before
  // repo-init, straight to the SQLite singleton (which opens the worker + creates the schema on
  // first op). Any failure (no OPFS, timeout) reads as "no cache" — the safe fall-through.
  auth_has_cached_workspace: async () => {
    const result = await safeAwait(sqlCountEntities(), SAFE_AWAIT_DEFAULT_MS, 0, 'auth-gate:hasCachedWorkspace');
    return result.ok ? (result.value ?? 0) > 0 : false;
  },

  auth_probe_role: async (user, workspace) => {
    try {
      return await Promise.race([
        workspaceAuthority().probeRole(user, workspace),
        new Promise((_, reject) => setTimeout(() => reject(new RoleProbeTimeoutError()), AUTH_PROBE_TIMEOUT_MS)),
      ]);
    } catch (err) {
      _lastError = err;
      throw err;
    }
  },

  auth_cache_read:  async () => _readCache(),
  auth_cache_write: async (entry) => {
    try { localStorage.setItem(roleCacheKey(), JSON.stringify(entry)); }
    catch { /* quota — a lost cache costs one extra probe, nothing else */ }
  },
  auth_cache_clear: async () => {
    localStorage.removeItem(roleCacheKey());
  },

  // F-42-05: the route guard reads the Rust principal directly (auth_session_roles), so this is
  // announcement-only now — a real change fires the event, the chrome re-renders and re-reads.
  auth_publish_roles: (roles, changed) => {
    if (!changed) return;
    window.dispatchEvent(new CustomEvent(ROLES_RESOLVED_EVENT, { detail: { roles: [...(roles || [])] } }));
  },
};

// ── the login overlay ─────────────────────────────────────────────────────────
// The login screen is a view (ui module); the platform cannot import it, so app.js hands the
// renderer in once: `configureAuthPlatform({ renderLoginPage })`.

let _renderLoginPage = null;
let _loginMounted = false;

export function configureAuthPlatform({ renderLoginPage } = {}) {
  if (renderLoginPage) _renderLoginPage = renderLoginPage;
}

export function isLoginMounted() { return _loginMounted; }

export function mountLoginScreen(onSignedIn) {
  if (_loginMounted) return;
  if (!_renderLoginPage) throw new Error('platform/auth: configureAuthPlatform({ renderLoginPage }) was not called by bootstrap');
  _loginMounted = true;
  const placeholder = document.getElementById(BOOT_PLACEHOLDER_ID);
  if (placeholder) placeholder.hidden = true;
  let loginRoot = document.getElementById(LOGIN_ROOT_ID);
  if (!loginRoot) {
    loginRoot = document.createElement('div');
    loginRoot.id = LOGIN_ROOT_ID;
    loginRoot.style.cssText = LOGIN_OVERLAY_STYLE;
    document.body.appendChild(loginRoot);
  }
  loginRoot.innerHTML = '';
  _renderLoginPage(loginRoot, (user) => {
    loginRoot.remove();
    _loginMounted = false;
    onSignedIn(user);
  });
}
