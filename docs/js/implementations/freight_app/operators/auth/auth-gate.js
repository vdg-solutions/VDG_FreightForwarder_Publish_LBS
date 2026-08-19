// F-13-P2 — Auth gate: Google sign-in + Drive folder probe for role (DYNAMIC, no hardcoded map)
//
// Role detection = Drive ACL enforced:
//   - `grants/grant.{workspace}.{prefix}` carries the roles — one file per person, the same read
//     for a manager as for a rep
//   - Drive-reported OWNERSHIP of the workspace root resolves Manager without a grant: that is
//     the account that created the workspace and issues the grants, so it cannot be locked out
//     by lacking one
//   - probe folder users/<email-prefix>/ → identity only, never a role
//   - none → not provisioned (manager must invite)

import { getCurrentUser, signOut, wasPreviouslySignedIn, rebuildSessionFromStoredToken } from '../../../storage/core_abstractions/identity.js';
import { rememberGrantAreas } from '../../../storage/core_abstractions/grant-file.js';
import { activeWorkspaceName } from '../../../storage/core_abstractions/workspace-registry.js';
import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../../../kernel/core_abstractions/util/safe-await.js';
import { MANAGER_SENTINEL } from '../../../kernel/core_abstractions/util/sales-rep-i18n.js';
import { sqlCountEntities, setStoreScope } from '../../../storage/core_abstractions/local-store.js';
import { readCachedRole, writeCachedRole, clearCachedRole, readCachedIdentityRaw } from '../../core_abstractions/ports/role-cache.js';
import { workspaceAuthority, VERDICT_FORK, VERDICT_GRANT, VERDICT_MANAGER }
  from '../../../storage/core_abstractions/workspace-authority.js';
import { setResolvedRoles } from '../../core_abstractions/session-roles.js';
import { ROLE_MANAGER } from '../../core_abstractions/roles.js';


const MANAGER_ID            = MANAGER_SENTINEL; // single source, F-19-66
const NOT_PROVISIONED_ID    = 'NOT_PROVISIONED';

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

export class RoleProbeTimeoutError extends Error {
  constructor() {
    super('Drive probe timeout');
    this.name = 'RoleProbeTimeoutError';
  }
}

/// Keeps the fork token and the role set in lockstep. Roles come from the ACL record when there
/// is one, else from the token (_rolesForToken).
function _setResolved(token, roles = null) {
  return setResolvedRoles(token, roles ?? _rolesForToken(token));
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

// ── role detection (Drive folder probe) ──────────────────────────────────────

export async function detectRoleViaDrive(user, options = {}) {
  if (!user) return null;
  if (options.force) clearRoleCache();
  const cached = readCachedRole(user.email);
  if (cached) { _setResolved(cached.role, cached.roles); return cached.role; }

  return Promise.race([
    _probe(user),
    new Promise((_, rej) => setTimeout(() => rej(new RoleProbeTimeoutError()), DRIVE_PROBE_TIMEOUT_MS)),
  ]);
}

/// The storage authority answers "who is this account for the workspace"; this turns the
/// verdict into the session's roles + caches. PM decision (F-17-03): the registry is the SOLE
/// name source — no name means no registered workspace yet, so route to onboarding WITHOUT
/// probing (a probe with a guessed name risks binding the wrong folder — F-17-05).
async function _probe(user) {
  const wsName = activeWorkspaceName();
  if (!wsName) {
    _setResolved(NOT_PROVISIONED_ID);
    return NOT_PROVISIONED_ID;
  }
  const verdict = await workspaceAuthority().probeRole(user, wsName);
  switch (verdict.kind) {
    case VERDICT_MANAGER:
      _setResolved(MANAGER_ID, [ROLE_MANAGER]);
      writeCachedRole(user.email, MANAGER_ID, [ROLE_MANAGER]);
      return MANAGER_ID;
    case VERDICT_GRANT:
      // E-43: the manifest is the only map an employee has — they hold nothing on the workspace
      // root, so every granted folder is unreachable by path. Stash it before the role resolves,
      // because the data layer starts resolving folders the moment boot continues.
      rememberGrantAreas(verdict.areas ?? []);
      _setResolved(verdict.token, verdict.roles);
      writeCachedRole(user.email, verdict.token, verdict.roles);
      return verdict.token;
    case VERDICT_FORK:
      // Storage, no authority: the token resolves (WHERE this user's data lives) but with an empty
      // role set the guard parks them on /pending-access — the truthful state.
      _setResolved(verdict.token, []);
      writeCachedRole(user.email, verdict.token, []);
      return verdict.token;
    default:
      _setResolved(NOT_PROVISIONED_ID);
      writeCachedRole(user.email, NOT_PROVISIONED_ID, []);
      return NOT_PROVISIONED_ID;
  }
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

/// The login screen is a view (ui module); the gate cannot import it, so bootstrap hands the
/// renderer in once: `configureAuthGate({ renderLoginPage })`.
let _renderLoginPage = null;
export function configureAuthGate({ renderLoginPage } = {}) {
  if (renderLoginPage) _renderLoginPage = renderLoginPage;
}

async function mountLoginScreen(onSignedIn) {
  if (!_renderLoginPage) throw new Error('auth-gate: configureAuthGate({ renderLoginPage }) was not called by bootstrap');
  const renderLoginPage = _renderLoginPage;
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
