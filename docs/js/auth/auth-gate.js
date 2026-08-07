// F-13-P2 — Auth gate: Google sign-in + Drive folder probe for role (DYNAMIC, no hardcoded map)
//
// Role detection = Drive ACL enforced:
//   - probe folder admin/         → 200 OK = admin role
//   - probe folder users/<email-prefix>/ → 200 OK = that sales rep
//   - none → not provisioned (admin must invite)

import { getCurrentUser, signOut, ROLE_CACHE_KEY, hasDriveScopeGrant, wasPreviouslySignedIn } from './google-oauth.js';
import { findWorkspaceRoot, findSharedSubfolder, listChildFolder, DriveApiError } from './drive-api.js';
import { activeWorkspaceName } from '../operators/workspace-registry.js';
import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../util/safe-await.js';
import { DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT } from './drive-error-classifier.js';
import { MANAGER_SENTINEL } from '../util/sales-rep-i18n.js';
import { sqlCountEntities } from '../cache/store-client.js';

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

// F-57-01 AC-04: TTL-unbounded raw read of the role cache — a degraded cold-boot restore is a
// best-effort local render, not a live permission grant (Drive ACL still gates every write), so
// a role cached minutes/hours ago is still the best available signal once the network itself is
// the thing that's down. Deliberately bypasses readCachedRole's ROLE_CACHE_TTL_MS gate below.
function _readCachedIdentityRaw() {
  try {
    const raw = localStorage.getItem(ROLE_CACHE_KEY);
    if (!raw) return null;
    const { email, role } = JSON.parse(raw);
    return email && role ? { email, role } : null;
  } catch { return null; }
}

// F-57-01 AC-04: does the local SQLite workspace already hold at least one synced entity row
// (any kind)? Runs before repo-init, straight to the store-client singleton (which opens the worker
// + creates the schema on first op). Bounded via safeAwait — any failure (no OPFS, timeout) reads
// as "no cache", the same safe fall-through AC-03 already exercises.
async function _hasCachedWorkspace() {
  // Runs before repo-init, so window.__vdg_store isn't set yet — go straight to the SQLite
  // singleton (store-client spawns/opens the worker on first op, creating the schema). A count of
  // the entities table answers "does this browser already hold a workspace?".
  const result = await safeAwait(
    sqlCountEntities(),
    SAFE_AWAIT_DEFAULT_MS, 0, 'auth-gate:hasCachedWorkspace',
  );
  return result.ok ? (result.value ?? 0) > 0 : false;
}

export async function requireAuth(onSignedIn) {
  const user = getCurrentUser();
  if (user) {
    await _detectRoleOrThrow(user, 'auth-gate:requireAuth');
    await onSignedIn(user);
    return;
  }

  // Owner model ("lúc 401 mới cần") — id_token missing/expired: NEVER fire a proactive GIS bootstrap
  // here; that popped a Google sign-in on every cold load. If a synced local workspace already
  // exists, degrade to a cached render and let the reconnect chip re-mint on the user's gesture;
  // otherwise fall through to login. Token re-mint happens ONLY via the sign-in button or the 401
  // reactive path in drive-api.
  if (wasPreviouslySignedIn()) {
    // F-57-01 AC-04: cached identity + a synced local workspace → degrade to a local render instead
    // of a blind sign-out. AC-03: no cached identity or no cached workspace falls through to login.
    const cachedIdentity = _readCachedIdentityRaw();
    if (cachedIdentity && await _hasCachedWorkspace()) {
      _resolvedRole = cachedIdentity.role; // best-effort — same source detectRoleViaDrive would cache
      const degradedUser = { email: cachedIdentity.email, name: '', picture: '', sub: '', id_token: null };
      await onSignedIn(degradedUser);
      window.dispatchEvent(new CustomEvent('vdg:auth-needs-reconnect')); // chip — user re-mints on gesture
      return;
    }
    // nothing local to degrade into — fall through to login
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
