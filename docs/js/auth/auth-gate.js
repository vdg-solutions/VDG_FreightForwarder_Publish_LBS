// F-13-P2 — Auth gate: Google sign-in + Drive folder probe for role (DYNAMIC, no hardcoded map)
//
// Role detection = Drive ACL enforced:
//   - probe folder admin/         → 200 OK = admin role
//   - probe folder users/<email-prefix>/ → 200 OK = that sales rep
//   - none → not provisioned (admin must invite)

import { getCurrentUser, signOut, ROLE_CACHE_KEY, hasDriveScopeGrant, wasPreviouslySignedIn, hydrateSessionFromToken } from './google-oauth.js';
import { findWorkspaceRoot, findSharedSubfolder, listChildFolder, DriveApiError, silentBootstrapToken } from './drive-api.js';
import { activeWorkspaceName } from '../operators/workspace-registry.js';
import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../util/safe-await.js';
import { DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT } from './drive-error-classifier.js';
import { MANAGER_SENTINEL } from '../util/sales-rep-i18n.js';

const MANAGER_ID            = MANAGER_SENTINEL; // single source, F-19-66
const UNKNOWN_ID            = 'OTHER';
const NOT_PROVISIONED_ID    = 'NOT_PROVISIONED';
const ADMIN_FOLDER_NAME     = 'admin';
const USERS_FOLDER_NAME     = 'users';
const ROLE_CACHE_TTL_MS          = 5 * 60 * 1000; // 5 min — refresh on each session
const DRIVE_PROBE_TIMEOUT_MS     = 5000;           // F-15-19 AC-4: surface banner if probe hangs
const AUTH_DETECT_ROLE_TIMEOUT_MS = SAFE_AWAIT_DEFAULT_MS; // F-19-01: outer safeAwait guard
const LOGIN_ROOT_ID           = 'login-root';
const LOGIN_OVERLAY_STYLE     = 'position:fixed;inset:0;z-index:50;background:#f8fafc;';

export class RoleProbeTimeoutError extends Error {
  constructor() {
    super('Drive probe timeout');
    this.name = 'RoleProbeTimeoutError';
  }
}

// Resolved role for current sign-in session
let _resolvedRole = null;

// ── public helpers ────────────────────────────────────────────────────────────

export function currentSalesRepId() {
  return _resolvedRole;
}

export function isManager() {
  return _resolvedRole === MANAGER_ID;
}

export function emailPrefix(email) {
  return (email || '').split('@')[0].toLowerCase();
}

// ── role detection (Drive folder probe) ──────────────────────────────────────

export async function detectRoleViaDrive(user, options = {}) {
  if (!user) return null;
  // AC-03: read BEFORE the role cache (a cached role must not bypass a missing scope) and
  // BEFORE the first driveFetch (findWorkspaceRoot swallows every error to null, which would
  // silently degrade a missing scope into NOT_PROVISIONED). No Drive request fires here.
  if (!hasDriveScopeGrant()) {
    const err = new DriveApiError(403, 'Drive scope not granted');
    err.driveErrorKind = DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT;
    throw err;
  }
  if (options.force) clearRoleCache();
  const cached = readCachedRole(user.email);
  if (cached) { _resolvedRole = cached; return cached; }

  return Promise.race([
    _probeInner(user),
    new Promise((_, rej) => setTimeout(() => rej(new RoleProbeTimeoutError()), DRIVE_PROBE_TIMEOUT_MS)),
  ]);
}

async function _probeInner(user) {
  // PM decision (F-17-03): registry is the SOLE name source — no name means no
  // registered workspace yet, so route to onboarding WITHOUT probing Drive (a probe
  // with a guessed/hardcoded name risks binding the wrong folder when the user holds
  // several workspaces in one Drive — F-17-05 multi-workspace case).
  const wsName = activeWorkspaceName();
  if (!wsName) {
    _resolvedRole = NOT_PROVISIONED_ID;
    return NOT_PROVISIONED_ID;
  }

  const prefix = emailPrefix(user.email);

  // Manager path (root-first, UNCHANGED): only a root OWNER resolves a rootId + admin/ child.
  // A null rootId no longer short-circuits — an employee never owns the root, so fall through.
  const rootId = await findWorkspaceRoot(wsName);
  if (rootId) {
    // Probe admin/ first
    try {
      const adminFolder = await listChildFolder(rootId, ADMIN_FOLDER_NAME);
      if (adminFolder) {
        _resolvedRole = MANAGER_ID;
        writeCachedRole(user.email, MANAGER_ID);
        return MANAGER_ID;
      }
    } catch (_) { /* probe missed — fall through to users/ check */ }

    // Probe users/<email-prefix>/
    try {
      const usersRoot = await listChildFolder(rootId, USERS_FOLDER_NAME);
      if (usersRoot) {
        const userFolder = await listChildFolder(usersRoot.id, prefix);
        if (userFolder) {
          const role = prefix.toUpperCase();
          _resolvedRole = role;
          writeCachedRole(user.email, role);
          return role;
        }
      }
    } catch (_) { /* probe missed — fall through to NOT_PROVISIONED */ }
  }

  // Employee path (subfolder-first): users/{prefix} fork is shared directly to them (F-27-01),
  // visible via sharedWithMe without the root. Decoupled — resolves even when rootId is null.
  const subfolderId = await findSharedSubfolder(prefix);
  if (subfolderId) {
    const role = prefix.toUpperCase();
    _resolvedRole = role;
    writeCachedRole(user.email, role);
    return role;
  }

  _resolvedRole = NOT_PROVISIONED_ID;
  writeCachedRole(user.email, NOT_PROVISIONED_ID);
  return NOT_PROVISIONED_ID;
}

function readCachedRole(email) {
  try {
    const raw = localStorage.getItem(ROLE_CACHE_KEY);
    if (!raw) return null;
    const { email: e, role, ts } = JSON.parse(raw);
    if (e !== email) return null;
    if (Date.now() - ts > ROLE_CACHE_TTL_MS) return null;
    return role;
  } catch { return null; }
}

function writeCachedRole(email, role) {
  try { localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify({ email, role, ts: Date.now() })); }
  catch { /* quota — ignore */ }
}

export function clearRoleCache() {
  localStorage.removeItem(ROLE_CACHE_KEY);
  _resolvedRole = null;
}

// ── auth gate ─────────────────────────────────────────────────────────────────

let _loginMounted = false;

// F-19-01: safeAwait guard — detectRoleViaDrive has internal 5s race; outer 8s catches stalls
async function _detectRoleOrThrow(user, tag) {
  const roleResult = await safeAwait(detectRoleViaDrive(user), AUTH_DETECT_ROLE_TIMEOUT_MS, null, tag);
  if (!roleResult.ok) throw roleResult.error;
}

export async function requireAuth(onSignedIn) {
  const user = getCurrentUser();
  if (user) {
    await _detectRoleOrThrow(user, 'auth-gate:requireAuth');
    await onSignedIn(user);
    return;
  }

  // F-19-84 AC-05 — id_token missing/expired but the underlying Google session may still be
  // live: attempt a bounded silent bootstrap (re-mint id_token + userinfo, same hydrate as
  // sign-in/reconnect) before dumping to login. Gated on the existing access_token_exp marker
  // so a first-time visitor never triggers a GIS call.
  if (wasPreviouslySignedIn()) {
    try {
      const resp  = await silentBootstrapToken();
      const boot  = await hydrateSessionFromToken(resp);
      if (boot) {
        await _detectRoleOrThrow(boot, 'auth-gate:requireAuth-bootstrap');
        await onSignedIn(boot);
        return;
      }
    } catch {
      // live Google session gone/revoked — fall through to login, same as today
    }
  }

  // No user — defensive clear of any orphan auth/role keys (F-15-50 AC-05).
  // Idempotent: removeItem on absent key is a no-op.
  signOut();

  // Signed out — show login screen, block routing
  if (!_loginMounted) {
    _loginMounted = true;
    await mountLoginScreen(async (u) => {
      await _detectRoleOrThrow(u, 'auth-gate:loginCb');
      onSignedIn(u);
    });
  }
}

async function mountLoginScreen(onSignedIn) {
  const { renderLoginPage } = await import('../views/login.js');
  let loginRoot = document.getElementById(LOGIN_ROOT_ID);
  if (!loginRoot) {
    loginRoot = document.createElement('div');
    loginRoot.id = LOGIN_ROOT_ID;
    loginRoot.style.cssText = LOGIN_OVERLAY_STYLE;
    document.body.appendChild(loginRoot);
  }
  loginRoot.innerHTML = '';
  renderLoginPage(loginRoot, (user) => {
    loginRoot.remove();
    _loginMounted = false;
    onSignedIn(user);
  });
}

// red-signedOut chip click → re-launch login overlay
window.addEventListener('vdg:auth-signin-request', () => {
  if (_loginMounted) return;
  _loginMounted = true;
  mountLoginScreen(async (u) => {
    await _detectRoleOrThrow(u, 'auth-gate:signin-request');
    location.reload();
  });
});
