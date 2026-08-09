// F-13-P2 — Auth gate: Google sign-in + Drive folder probe for role (DYNAMIC, no hardcoded map)
//
// Role detection = Drive ACL enforced:
//   - admin/users.jsonl carries the role (#16) — an unseeded workspace means first run, so its
//     creator is Manager; a seeded one grants only what the user's own record says
//   - probe folder users/<email-prefix>/ → 200 OK = that sales rep
//   - none → not provisioned (admin must invite)

import { getCurrentUser, signOut, ROLE_CACHE_KEY, hasDriveScopeGrant, wasPreviouslySignedIn, rebuildSessionFromStoredToken } from './google-oauth.js';
import { findWorkspaceRoot, findSharedSubfolder, listChildFolder, DriveApiError } from './drive-api.js';
import { readWorkspaceAcl, roleTokenFromRecord, rolesFromRecord } from './workspace-acl.js';
import { activeWorkspaceName } from '../operators/workspace-registry.js';
import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../util/safe-await.js';
import { DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT } from './drive-error-classifier.js';
import { MANAGER_SENTINEL } from '../util/sales-rep-i18n.js';
import { sqlCountEntities, setStoreScope } from '../cache/store-client.js';

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

// Resolved role token for the current sign-in session (fork id / sentinel — NOT an authority).
let _resolvedRole = null;
// #28: the actual authority — the role SET read from admin/users.jsonl. hasRole(ROLE_MANAGER) used to
// answer "does the Drive probe sentinel equal __MANAGER__", i.e. it inferred authority from
// which FOLDER the user could see. Permission is read from the ACL record now, and every caller
// asks hasRole() for the specific role it needs.
let _resolvedRoles = [];

export const ROLE_MANAGER    = 'Manager';
export const ROLE_SALES_REP  = 'SalesRep';
export const ROLE_ACCOUNTANT = 'Accountant';
export const ROLE_AUDITOR    = 'Auditor';

// ── public helpers ────────────────────────────────────────────────────────────

export function currentSalesRepId() {
  return _resolvedRole;
}

/// The roles this session holds. Empty until the ACL record resolves — callers gate on a role,
/// never on emptiness meaning "allow".
export function currentRoles() {
  return [..._resolvedRoles];
}

export function hasRole(role) {
  return _resolvedRoles.includes(role);
}

/// Keeps the fork token and the role set in lockstep at every assignment point, so no path can
/// set one and forget the other. Roles may be supplied explicitly (from the ACL record) or
/// derived from the token when there is no record to read.
function _setResolved(token, roles = null) {
  _resolvedRole  = token;
  _resolvedRoles = roles ?? _rolesForToken(token);
  // Published for the route guard: sign-in resolves the role set long before repo-init builds
  // window.__vdg_current_user, and gating on the later snapshot bounced a real manager to
  // /pending-access on every cold boot (#28 regression, caught on the pilot).
  if (typeof window !== 'undefined') window.__vdg_session_roles = [..._resolvedRoles];
  return token;
}

/// Token -> roles when no users.jsonl record is available. Mirrors route-guard's normalizeRole:
/// a fork prefix means a provisioned users/{prefix} exists -> SalesRep; the sentinels mean no
/// fork -> no role at all (ReadOnly is the absence of roles, not a role).
function _rolesForToken(token) {
  if (token === MANAGER_ID) return [ROLE_MANAGER];
  if (!token || token === NOT_PROVISIONED_ID || token === UNKNOWN_ID) return [];
  return [ROLE_SALES_REP];
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
  if (cached) { _setResolved(cached); return cached; }

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
    _setResolved(NOT_PROVISIONED_ID);
    return NOT_PROVISIONED_ID;
  }

  const prefix = emailPrefix(user.email);

  // Manager path (root-first, UNCHANGED): only a root OWNER resolves a rootId + admin/ child.
  // A null rootId no longer short-circuits — an employee never owns the root, so fall through.
  const rootId = await findWorkspaceRoot(wsName);
  if (rootId) {
    // Probe admin/ first. #16: a listable admin/ only proves the root is VISIBLE — sharing the
    // root makes it visible to every invitee, which used to hand each of them MANAGER. The role
    // comes from admin/users.jsonl (the ACL contract); the folder probe is the first-run fallback.
    try {
      const adminFolder = await listChildFolder(rootId, ADMIN_FOLDER_NAME);
      if (adminFolder) {
        const acl = await readWorkspaceAcl(adminFolder.id, user.email);
        if (!acl.seeded) {                       // nobody provisioned yet — creator's first run
          _setResolved(MANAGER_ID, [ROLE_MANAGER]);
          writeCachedRole(user.email, MANAGER_ID);
          return MANAGER_ID;
        }
        const role = roleTokenFromRecord(acl.record, MANAGER_ID, prefix);
        if (role) {
          // #28: authority comes from the record's role set, not from which token we minted.
          _setResolved(role, rolesFromRecord(acl.record));
          writeCachedRole(user.email, role);
          return role;
        }
        // seeded, but this email is not an active user — fall through to the users/ probe
      }
    } catch (_) { /* probe missed — fall through to users/ check */ }

    // Probe users/<email-prefix>/
    try {
      const usersRoot = await listChildFolder(rootId, USERS_FOLDER_NAME);
      if (usersRoot) {
        const userFolder = await listChildFolder(usersRoot.id, prefix);
        if (userFolder) {
          const role = prefix.toUpperCase();
          _setResolved(role);
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
    _setResolved(role);
    writeCachedRole(user.email, role);
    return role;
  }

  _setResolved(NOT_PROVISIONED_ID);
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
  _setResolved(null);
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
    setStoreScope(user.email); // #18: bind the local database to this account before any store op
    await _detectRoleOrThrow(user, 'auth-gate:requireAuth');
    await onSignedIn(user);
    return;
  }

  // Owner model ("lúc 401 mới cần") — id_token missing/expired is a CLOCK claim, not reality.
  // Reality check first: ask Google whether the stored access token still works (/userinfo with
  // the stored Bearer — plain HTTP, no GIS, no popup). 200 → session revives, normal boot, NO red
  // chip, NO sign-in screen. Only a genuinely-dead token degrades: synced local workspace → cached
  // render + true red chip; otherwise login. Re-mint happens ONLY via the sign-in button or the
  // 401 reactive path in drive-api — never proactively here.
  if (wasPreviouslySignedIn()) {
    const revived = await rebuildSessionFromStoredToken();
    if (revived) {
      setStoreScope(revived.email);
      await _detectRoleOrThrow(revived, 'auth-gate:requireAuth-revive');
      await onSignedIn(revived);
      return;
    }
    // F-57-01 AC-04: cached identity + a synced local workspace → degrade to a local render instead
    // of a blind sign-out. AC-03: no cached identity or no cached workspace falls through to login.
    const cachedIdentity = _readCachedIdentityRaw();
    if (cachedIdentity) setStoreScope(cachedIdentity.email); // scope BEFORE the entity count reads it
    if (cachedIdentity && await _hasCachedWorkspace()) {
      _setResolved(cachedIdentity.role); // best-effort — same source detectRoleViaDrive would cache
      const degradedUser = { email: cachedIdentity.email, name: '', picture: '', sub: '', id_token: null };
      await onSignedIn(degradedUser);
      window.dispatchEvent(new CustomEvent('vdg:auth-needs-reconnect')); // token verified dead — true red
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
      setStoreScope(u.email);
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
