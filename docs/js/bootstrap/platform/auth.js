// platform/auth.js — extra platform methods the Rust auth use-cases import (js_auth.rs extern type).
//
// Everything browser-bound about signing in lives here: the Google session, the workspace
// authority's verdict, this browser's role memory (localStorage), the role broadcast and the login
// overlay. The DECISIONS made from these answers are in Rust (freight_app/operators/auth) — this
// file only answers and acts. The timeouts stay here too, so no timer leaks into an inner layer.
import { getCurrentUser, signOut, wasPreviouslySignedIn, rebuildSessionFromStoredToken, ROLE_CACHE_KEY }
  from '../../implementations/storage/core_abstractions/identity.js';
import { rememberGrantAreas, GRANT_AREAS_KEY } from '../../implementations/storage/core_abstractions/grant-file.js';
import { activeWorkspaceName } from '../../implementations/storage/core_abstractions/workspace-registry.js';
import { workspaceAuthority } from '../../implementations/storage/core_abstractions/workspace-authority.js';
import { sqlCountEntities, setStoreScope } from '../../implementations/storage/core_abstractions/local-store.js';
import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../../implementations/kernel/core_abstractions/util/safe-await.js';

const AUTH_PROBE_TIMEOUT_MS = 20000;           // F-15-19 AC-4: surface a banner if the probe hangs
const ROLES_RESOLVED_EVENT   = 'vdg:roles-resolved';
const LOGIN_ROOT_ID          = 'login-root';
const LOGIN_OVERLAY_STYLE    = 'position:fixed;inset:0;z-index:50;background:#f8fafc;';

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
  try { return JSON.parse(localStorage.getItem(ROLE_CACHE_KEY) || 'null'); }
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

export const authPlatform = {
  auth_current_user:            async () => getCurrentUser() ?? null,
  auth_was_previously_signed_in: async () => !!wasPreviouslySignedIn(),
  auth_revive_session:          async () => (await rebuildSessionFromStoredToken()) ?? null,
  auth_sign_out:                async () => { await signOut(); },
  auth_set_store_scope:         async (email) => { setStoreScope(email); },
  auth_active_workspace_name:   async () => activeWorkspaceName() || null,
  auth_remember_grant_areas:    async (areas) => { rememberGrantAreas(areas ?? []); },

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
    try { localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify(entry)); }
    catch { /* quota — a lost cache costs one extra probe, nothing else */ }
  },
  auth_cache_clear: async () => {
    localStorage.removeItem(ROLE_CACHE_KEY);
    // E-43: the grant manifest answers the same question as the role cache and is written by the
    // same probe. Dropping one without the other leaves a session holding folder ids for access it
    // may no longer have.
    try { localStorage.removeItem(GRANT_AREAS_KEY); } catch { /* nothing stored */ }
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
