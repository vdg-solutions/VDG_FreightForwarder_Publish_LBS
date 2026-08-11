// F-13-P2 — Auth gate: Google sign-in + Drive folder probe for role (DYNAMIC, no hardcoded map)
//
// Role detection = Drive ACL enforced:
//   - admin/users.jsonl carries the role (#16) — an unseeded workspace means first run, so its
//     creator is Manager; a seeded one grants only what the user's own record says
//   - probe folder users/<email-prefix>/ → 200 OK = that sales rep
//   - none → not provisioned (admin must invite)

import { getCurrentUser, signOut, hasDriveScopeGrant, wasPreviouslySignedIn, rebuildSessionFromStoredToken } from './google-oauth.js';
import { findWorkspaceRoot, findSharedSubfolder, listChildFolder, DriveApiError } from './drive-api.js';
import { readWorkspaceAcl, roleTokenFromRecord, rolesFromRecord } from './workspace-acl.js';
import { readGrant } from './grant-file.js';
import { activeWorkspaceName } from '../operators/workspace-registry.js';
import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../util/safe-await.js';
import { DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT } from './drive-error-classifier.js';
import { MANAGER_SENTINEL } from '../util/sales-rep-i18n.js';
import { sqlCountEntities, setStoreScope } from '../cache/store-client.js';
import { readCachedRole, writeCachedRole, clearCachedRole, readCachedIdentityRaw } from './role-cache.js';

const MANAGER_ID            = MANAGER_SENTINEL; // single source, F-19-66
const UNKNOWN_ID            = 'OTHER';
const NOT_PROVISIONED_ID    = 'NOT_PROVISIONED';
const ADMIN_FOLDER_NAME     = 'admin';
const USERS_FOLDER_NAME     = 'users';
const DRIVE_PROBE_TIMEOUT_MS     = 5000;           // F-15-19 AC-4: surface banner if probe hangs
const AUTH_DETECT_ROLE_TIMEOUT_MS = SAFE_AWAIT_DEFAULT_MS; // F-19-01: outer safeAwait guard
const LOGIN_ROOT_ID           = 'login-root';
const LOGIN_OVERLAY_STYLE     = 'position:fixed;inset:0;z-index:50;background:#f8fafc;';

// A failed request is not an answer about authority. 403 and 404 legitimately fall through — an
// employee cannot read admin/, and an absent file means nobody is provisioned yet — but a dead
// token or an unreachable Drive means "cannot tell", and app.js already renders that as the retry
// screen. Swallowing them is how an expired access token turned the workspace OWNER into a
// pending-access account: the 401 fell through to "fork exists, no grant" = zero roles, which the
// route guard then parked on /pending-access.
const AUTH_FAILED_STATUS = 401;
const SERVER_ERROR_FLOOR = 500;
const RATE_LIMITED_STATUS = 429;

function _isUndecidable(err) {
  if (err?.name !== 'DriveApiError') return true;   // transport/TypeError — no verdict either
  const s = err.status;
  return s === AUTH_FAILED_STATUS || s === RATE_LIMITED_STATUS || s >= SERVER_ERROR_FLOOR;
}

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

/// Token -> roles when no authority record is available at all.
/// #30: a fork prefix used to answer SalesRep here, which is where the bug lived — owning
/// `users/{prefix}` proves the user has STORAGE, not what they are allowed to do. Employees cannot
/// read admin/users.jsonl (resolve_grants never grants on admin/), so every Accountant, Auditor and
/// Pricing holder took this branch and resolved as SalesRep on their own machine. Authority now
/// comes from their own grant file; with no grant there is no role, and the route guard parks them
/// on /pending-access instead of handing out someone else's job.
function _rolesForToken(token) {
  if (token === MANAGER_ID) return [ROLE_MANAGER];
  return [];
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
  if (cached) { _setResolved(cached.role, cached.roles); return cached.role; }

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
          writeCachedRole(user.email, MANAGER_ID, [ROLE_MANAGER]);
          return MANAGER_ID;
        }
        const role = roleTokenFromRecord(acl.record, MANAGER_ID, prefix);
        if (role) {
          // #28: authority comes from the record's role set, not from which token we minted.
          const roles = rolesFromRecord(acl.record);
          _setResolved(role, roles);
          writeCachedRole(user.email, role, roles);
          return role;
        }
        // seeded, but this email is not an active user — fall through to the users/ probe
      }
    } catch (err) {
      if (_isUndecidable(err)) throw err;   // no verdict — never "no roles"
      /* 403/404: this account cannot read admin/, which is the employee case — fall through */
    }
  }

  // Employee path (#30): the grant file is the only authority an employee can actually read —
  // admin/users.jsonl lives under admin/, which resolve_grants never shares. It is found via
  // sharedWithMe with no root dependency, so it resolves even when rootId is null, and it reports
  // the real user_prefix (a collision appended random digits, so the fork name is not guessable).
  const grant = await readGrant(wsName, prefix, user.email);
  if (grant.roles.length > 0) {
    const role = grant.userPrefix.toUpperCase();
    _setResolved(role, grant.roles);
    writeCachedRole(user.email, role, grant.roles);
    return role;
  }

  // A fork with no grant still identifies WHERE this user's data lives, so the token resolves —
  // but it is NOT a role. This branch used to answer SalesRep off the folder's mere existence,
  // which is what gave every Accountant and Auditor a sales session. With an empty role set the
  // guard parks them on /pending-access, which is the truthful state: storage, no authority.
  const forkToken = await _resolveForkToken(rootId, prefix);
  if (forkToken) {
    _setResolved(forkToken, []);
    writeCachedRole(user.email, forkToken, []);
    return forkToken;
  }

  _setResolved(NOT_PROVISIONED_ID);
  writeCachedRole(user.email, NOT_PROVISIONED_ID, []);
  return NOT_PROVISIONED_ID;
}

/// The user's fork, by either route: under a root they can see, or shared directly to them
/// (F-27-04 — an employee never owns the root, so sharedWithMe resolves it with no root at all).
/// Identity only; the role set comes from the grant file.
async function _resolveForkToken(rootId, prefix) {
  if (rootId) {
    try {
      const usersRoot = await listChildFolder(rootId, USERS_FOLDER_NAME);
      const fork      = usersRoot && await listChildFolder(usersRoot.id, prefix);
      if (fork) return prefix.toUpperCase();
    } catch (err) {
      if (_isUndecidable(err)) throw err;
      /* probe missed — try the shared-to-me route */
    }
  }
  return (await findSharedSubfolder(prefix)) ? prefix.toUpperCase() : null;
}

export function clearRoleCache() {
  clearCachedRole();
  _setResolved(null);
}

// ── auth gate ─────────────────────────────────────────────────────────────────

let _loginMounted = false;

// F-19-01: safeAwait guard — detectRoleViaDrive has internal 5s race; outer 8s catches stalls
async function _detectRoleOrThrow(user, tag) {
  const roleResult = await safeAwait(detectRoleViaDrive(user), AUTH_DETECT_ROLE_TIMEOUT_MS, null, tag);
  if (!roleResult.ok) throw roleResult.error;
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
    // Degrade only into a session that actually HOLDS something. The role set comes from the cache
    // when it has one, else from the token (the manager sentinel still answers Manager; a fork
    // token answers nothing, which is the point). An empty set is not a session: it renders as
    // "no role granted yet", an ACL claim, when the truth is only that the token is dead — that is
    // what put the workspace owner on /pending-access. Sign-in re-probes and heals it.
    const cachedIdentity = readCachedIdentityRaw();
    if (cachedIdentity) setStoreScope(cachedIdentity.email); // scope BEFORE the entity count reads it
    const cachedRoles = cachedIdentity
      ? (cachedIdentity.roles.length ? cachedIdentity.roles : _rolesForToken(cachedIdentity.role))
      : [];
    if (cachedRoles.length && await _hasCachedWorkspace()) {
      _setResolved(cachedIdentity.role, cachedRoles);
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
