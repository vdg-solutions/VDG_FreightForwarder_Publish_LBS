// RoleAssignmentService — cascades protection-table grants via Drive putPermission (F-24-03,
// F-27-01). Pattern: ledger-reconciler.js / workspace-bootstrap.js (DI over injected
// driveApi, no direct implementations/* import). UserDriveRepo (F-24-02) is consumed through
// its existing contract; the grant list now comes from the WASM permission_resolve_grants
// bridge (protection_table.rs) instead of fetching role-drive-acl.json.

// #30: the per-user grant file half lives in its own module (350-line cap).
import { publishGrant, unpublishGrant, backfillGrants, grantFileOp } from './grant-publisher.js';
// F-37-05: `users/*/billing_published` is a CROSS PRODUCT — see fork-grants.js for why it has to
// be maintained from both ends and why CS needs none of it.
import { roleSetToken, resolvePathToFolderId, _aclHas, _driveOpsFromAcl,
  _isNotAuthorizedToChild, _isSharingRateLimited, _buildUserRecord } from './role-assignment-helpers.js';
import { splitInteriorWildcard, grantAcrossForks, grantNewForkToReaders }
  from './fork-grants.js';
// The raw Drive permission primitives (put/list/delete) live next door, api-first.
import { grantChildFolders, grantEntry, revokeEntry, rollbackGrants } from './grant-cascade.js';

const WILDCARD_PATH      = '*';
const WILDCARD_SUFFIX    = '/*';
const ACCESS_WRITE       = 'write';
const DRIVE_ROLE_WRITER  = 'writer';
const DRIVE_ROLE_READER  = 'reader';
const ROLE_MANAGER       = 'Manager';
const DRIVE_FOLDER_MIME     = 'application/vnd.google-apps.folder';
const REASON_NOT_AUTH_CHILD = 'appNotAuthorizedToChild'; // drive.file scope limit (see _isNotAuthorizedToChild)

const AUDIT_KIND    = 'role_assignment';
const AUDIT_ASSIGN  = 'assign';
const AUDIT_CHANGE  = 'change_role';
const AUDIT_REVOKE  = 'revoke';

// F-24-06 user-audit-log.jsonl action + drive_ops vocabulary (canonical schema)
const USER_AUDIT_ASSIGN_ROLE = 'assign_role';
const USER_AUDIT_CHANGE_ROLE = 'change_role';
const USER_AUDIT_REVOKE_ROLE = 'revoke_role';
const DRIVE_OP_GRANT_WRITE   = 'grant_write';
const DRIVE_OP_GRANT_READ    = 'grant_read';
const DRIVE_OP_REVOKE        = 'revoke';
const DRIVE_OP_RESULT_OK     = 'ok';

export class RoleAssignmentService {
  /// `workspaceNameFn` is injected rather than imported: activeWorkspaceName lives behind
  /// workspace-registry → workspace-root → drive-api → google-oauth, and this module is
  /// deliberately free of that chain (DI over injected driveApi, same as ledger-reconciler).
  constructor(driveApi, userRepo, findWorkspaceRootFn, auditLog = null, userAuditLog = null, wasm = null,
              workspaceNameFn = null) {
    this._api         = driveApi;
    this._userRepo     = userRepo;
    this._findRoot      = findWorkspaceRootFn;
    this._auditLog      = auditLog;
    this._userAuditLog  = userAuditLog;
    this._wasm          = wasm;
    this._workspaceName = workspaceNameFn;
  }

  /// F-27-01: grant list resolved via the WASM permission_resolve_grants bridge
  /// (protection_table.rs), replacing the role-drive-acl.json fetch.
  /// #24: the wire format is the role SET, primary first — "SalesRep,Pricing". A bare role string
  /// still resolves as a one-element set, so existing callers are unaffected.
  async resolveAcl(role, userPrefix = null, extraRoles = []) {
    const wasm = this._wasm || window.__vdg_wasm;
    return wasm.permission_resolve_grants(roleSetToken(role, extraRoles), userPrefix);
  }

  /// AC-01/AC-02/AC-04: grant every ACL folder for `role`, rollback on partial failure,
  /// upsert the user record last (only once the Drive side is fully consistent).
  async assignRole(email, role, userPrefix = null, extraRoles = []) {
    const acl    = await this.resolveAcl(role, userPrefix, extraRoles);
    const rootId = await this._requireRoot();

    const { granted, skipped, areas } = await this._grantAll(rootId, email, acl);
    // F-37-05: the other end of the cross product. Without this an Accountant hired before this
    // user silently never sees anything they publish — nothing errors, the invoices just never
    // arrive. Ordered after the fork's own grant, which is what creates the fork.
    await this._backGrantNewFork(rootId, userPrefix);
    // #30: publish the role set to the user themselves. Ordered AFTER the folder grants so a
    // failed cascade never leaves a readable grant promising access that was not actually given.
    await this._publishGrant(rootId, email, userPrefix, roleSetToken(role, extraRoles), areas);

    const existing = await this._userRepo.get(email);
    const result   = await this._userRepo.upsert(_buildUserRecord(existing, email, role, userPrefix, extraRoles));
    this._auditLog?.append(AUDIT_KIND, email, AUDIT_ASSIGN, { role, user_prefix: userPrefix, granted: granted.length, skipped: skipped.length });
    this._userAuditLog?.write(
      USER_AUDIT_ASSIGN_ROLE,
      email,
      existing ? { role: existing.role, user_prefix: existing.user_prefix } : { role: null },
      { role, user_prefix: userPrefix },
      [..._driveOpsFromAcl(acl), grantFileOp(userPrefix)],
    );
    return { user: result, skipped };
  }

  /// AC-01/AC-02/AC-05 (F-24-08): diff old vs new ACL — revoke what's no longer granted, grant
  /// what's new, leave untouched entries alone. Takes the full `user` record so the OLD ACL is
  /// always resolved from the user's ACTUAL prior role + user_prefix, never from a caller-passed
  /// value that may already be the new one (F-24-08 D-02: a bare oldRole+userPrefix pair let
  /// callers pass the NEW prefix for both sides, silently losing the old ACL's {user_prefix}
  /// substitution). Guards the last-manager lockout before any Drive call.
  async changeRole(user, newRole, newUserPrefix = null, newExtraRoles = null) {
    const { email, role: oldRole, user_prefix: oldUserPrefix } = user;
    if (oldRole === ROLE_MANAGER && newRole !== ROLE_MANAGER) {
      await this._assertNotLastManager(email);
    }

    // null means "leave the hats alone"; an array (including []) is an explicit new set.
    const oldExtraRoles = user.extra_roles || [];
    const extraRoles    = newExtraRoles === null ? oldExtraRoles : newExtraRoles;

    const oldAcl = await this.resolveAcl(oldRole, oldUserPrefix, oldExtraRoles);
    const newAcl = await this.resolveAcl(newRole, newUserPrefix, extraRoles);
    const rootId = await this._requireRoot();

    const toRevoke = oldAcl.filter((o) => !_aclHas(newAcl, o));
    const toGrant  = newAcl.filter((n) => !_aclHas(oldAcl, n));

    for (const entry of toRevoke) await revokeEntry(this._api, rootId, email, entry);
    // E-43: grant the WHOLE new ACL, not the delta. `_grantEntry` is idempotent — it reads the
    // folder's permissions and no-ops when this email already holds the role — so re-granting what
    // is already there costs one listPermissions per folder and nothing else. The delta form looked
    // efficient and was a repair path that could not repair: re-running changeRole with unchanged
    // roles diffed to an EMPTY set, so a user whose permissions predated a policy change kept
    // missing every folder that policy added. Measured live: sol.vdg01 carried Manager+SalesRep and
    // held nothing at all on the twelve master-data folders; the write came back 404 (Drive's answer
    // for a folder this app may not touch for this user), and 155 records sat in the outbox.
    const { skipped, areas } = await this._grantAll(rootId, email, newAcl);
    // `_grantAll` resolved every path on the way through, so the manifest is a by-product of the
    // grant rather than a second walk over the same folders.

    // #30: a renamed fork leaves the OLD grant file still shared. readGrant takes the first
    // candidate it can parse, so a stale file could keep handing out the previous role set —
    // unshare it before the new one is published.
    if (oldUserPrefix && oldUserPrefix !== newUserPrefix) {
      await this._unpublishGrant(rootId, email, oldUserPrefix);
    }
    await this._publishGrant(rootId, email, newUserPrefix, roleSetToken(newRole, extraRoles), areas);

    const existing = await this._userRepo.get(email);
    await this._userRepo.upsert(_buildUserRecord(existing, email, newRole, newUserPrefix, extraRoles));
    this._auditLog?.append(AUDIT_KIND, email, AUDIT_CHANGE, { oldRole, newRole, user_prefix: newUserPrefix });
    this._userAuditLog?.write(
      USER_AUDIT_CHANGE_ROLE,
      email,
      { role: oldRole, user_prefix: oldUserPrefix },
      { role: newRole, user_prefix: newUserPrefix },
      [..._driveOpsFromAcl(toRevoke, DRIVE_OP_REVOKE), ..._driveOpsFromAcl(toGrant), grantFileOp(newUserPrefix)],
    );
    return { skipped };
  }

  /// AC-06: revoke every ACL folder for `role`, then soft-delete the user record.
  async revokeRole(email, role, userPrefix = null) {
    if (role === ROLE_MANAGER) await this._assertNotLastManager(email);

    const acl    = await this.resolveAcl(role, userPrefix);
    const rootId = await this._requireRoot();
    for (const entry of acl) await revokeEntry(this._api, rootId, email, entry);
    // #30: revoked folders but a still-readable grant would leave the user signing in with a full
    // role set and empty screens — worse to diagnose than a clean "no access".
    if (userPrefix) await this._unpublishGrant(rootId, email, userPrefix);

    await this._userRepo.remove(email);
    this._auditLog?.append(AUDIT_KIND, email, AUDIT_REVOKE, { role, user_prefix: userPrefix });
    this._userAuditLog?.write(
      USER_AUDIT_REVOKE_ROLE,
      email,
      { role, user_prefix: userPrefix },
      { active: false },
      [..._driveOpsFromAcl(acl, DRIVE_OP_REVOKE), grantFileOp(userPrefix, DRIVE_OP_REVOKE)],
    );
  }

  /// #30: publish grants for users provisioned before grant files existed. Manager-boot task.
  async backfillGrants() {
    const rootId = await this._requireRoot();
    return backfillGrants(this._api, this._wasm || window.__vdg_wasm, {
      rootId,
      workspace: this._requireWorkspaceName(),
      users:     await this._userRepo.list(),
      // E-43: a backfilled grant must carry the folder ids too, or it repairs the ROLES and leaves
      // the user with a manifest-less file — which reads fine and resolves nothing, because they
      // have no root to descend from. Resolved per user from their own ACL, by the same function
      // that resolves them at assign time.
      resolveAreas: async (user) => {
        const roles = (user.roles?.length ? user.roles : [user.role, ...(user.extra_roles || [])]).filter(Boolean);
        const acl   = await this.resolveAcl(roles[0], user.user_prefix, roles.slice(1));
        return this._resolveAreas(rootId, acl);
      },
    });
  }

  // ── private ──────────────────────────────────────────────────────────────

  async _requireRoot() {
    const rootId = await this._findRoot();
    if (!rootId) throw new Error('Workspace root not found');
    return rootId;
  }

  /// The workspace name is part of the grant file's NAME and content — an employee working for two
  /// companies tells the two grants apart by it. Defaulting to '' would write a file that silently
  /// matches nothing, so an unwired caller fails loudly instead.
  _requireWorkspaceName() {
    const name = this._workspaceName?.();
    if (!name) throw new Error('RoleAssignmentService: workspaceNameFn not wired');
    return name;
  }

  async _publishGrant(rootId, email, userPrefix, roleToken, areas = null) {
    if (!userPrefix) return null;
    return publishGrant(this._api, this._wasm || window.__vdg_wasm, {
      rootId, workspace: this._requireWorkspaceName(), email, userPrefix, roleToken, areas,
    });
  }

  async _unpublishGrant(rootId, email, userPrefix) {
    return unpublishGrant(this._api, this._wasm || window.__vdg_wasm, {
      rootId, workspace: this._requireWorkspaceName(), email, userPrefix,
    });
  }

  /// path -> folder id for every entry that names ONE folder. A wildcard names a folder per fork
  /// and has no single id, so it is omitted rather than guessed; the client falls back to its own
  /// fork for those. A path that cannot be resolved is skipped, not fatal — a partial manifest is
  /// still better than none, and the reconciler reports what is missing.
  async _resolveAreas(rootId, entries) {
    const areas = [];
    for (const entry of entries) {
      if (entry.path === WILDCARD_PATH || splitInteriorWildcard(entry.path)) continue;
      try {
        areas.push({ path: entry.path, folder_id: await resolvePathToFolderId(this._api, rootId, entry.path) });
      } catch (err) {
        console.warn(`[role-assignment] manifest: cannot resolve ${entry.path}:`, err.message); // DEV
      }
    }
    return areas;
  }

  async _grantAll(rootId, email, entries) {
    const granted = [];
    const skipped = [];
    // E-43: the folder ids resolved here are the ONLY copy anyone will ever have cheaply. An
    // employee holds no permission on the workspace root, so they cannot walk down to find these
    // folders — and Drive answers a parent-scoped list from an account that cannot read the parent
    // with an empty array rather than an error. Handing the ids to them in their grant file costs
    // nothing extra, because resolving them is already the first step of granting them.
    const areas = [];
    try {
      for (const entry of entries) {
        await this._grantEntryResilient(rootId, email, entry, granted, skipped, areas);
      }
    } catch (err) {
      // A sharing rate limit is not a failed grant. The permissions already written are correct,
      // and `_grantEntry` skips them on the next run (it reads listPermissions first), so the
      // operation converges by being re-run. Rolling back would destroy that progress AND spend
      // more sharing ops undoing it — the one thing the limit is telling us not to do.
      if (!_isSharingRateLimited(err)) await rollbackGrants(this._api, granted);
      throw err;
    }
    return { granted, skipped, areas };
  }

  /// Grants one ACL entry, tolerating drive.file's appNotAuthorizedToChild: for the wildcard
  /// root it fans out to app-visible child folders; a specific subfolder is recorded in
  /// `skipped`. Any other error propagates (caller rolls back). Mutates `granted`/`skipped`.
  async _grantEntryResilient(rootId, email, entry, granted, skipped, areas = null) {
    // An interior wildcard names one subfolder of EVERY fork, so it has no single folder id.
    if (splitInteriorWildcard(entry.path)) {
      granted.push(...await grantAcrossForks(this._api, resolvePathToFolderId, rootId, email, entry));
      return;
    }
    try {
      const folderId = await resolvePathToFolderId(this._api, rootId, entry.path);
      // Recorded whether or not the permission was newly written: an idempotent re-grant still
      // has to appear in the manifest, or a user provisioned twice ends up with fewer areas than
      // a user provisioned once.
      if (areas && entry.path !== WILDCARD_PATH) areas.push({ path: entry.path, folder_id: folderId });
      const result = await grantEntry(this._api, rootId, email, entry, folderId);
      if (result) granted.push(result);
    } catch (err) {
      if (!_isNotAuthorizedToChild(err)) throw err;
      if (entry.path === WILDCARD_PATH) {
        await grantChildFolders(this._api, rootId, email, entry.access, granted, skipped);
      } else {
        skipped.push({ path: entry.path, reason: REASON_NOT_AUTH_CHILD });
      }
    }
  }

  /// Grants this fork's cross-product subfolders to everyone whose role already reads them. Who
  /// that is comes from resolveAcl per user — Rust states it once, JS never keeps a second list.
  async _backGrantNewFork(rootId, userPrefix) {
    // Same capability probe as _grantChildFolders: a repo without `list` is a caller that never
    // had a user directory, not a failure to report.
    if (!userPrefix || typeof this._userRepo?.list !== 'function') return;
    const users = await this._userRepo.list().catch(() => []);
    await grantNewForkToReaders(
      this._api, resolvePathToFolderId,
      (u) => this.resolveAcl(u.role, u.user_prefix, u.extra_roles || []),
      users, rootId, userPrefix,
    );
  }

  async _assertNotLastManager(email) {
    const users   = await this._userRepo.list();
    const others  = users.filter((u) => u.role === ROLE_MANAGER && u.email !== email);
    if (others.length === 0) throw new Error('Cannot remove the last remaining Manager');
  }
}

export { roleSetToken, resolvePathToFolderId };
