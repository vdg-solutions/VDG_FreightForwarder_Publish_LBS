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
  _isNotAuthorizedToChild, _buildUserRecord } from './role-assignment-helpers.js';
import { splitInteriorWildcard, grantAcrossForks, revokeAcrossForks, grantNewForkToReaders }
  from './fork-grants.js';

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

    const { granted, skipped } = await this._grantAll(rootId, email, acl);
    // F-37-05: the other end of the cross product. Without this an Accountant hired before this
    // user silently never sees anything they publish — nothing errors, the invoices just never
    // arrive. Ordered after the fork's own grant, which is what creates the fork.
    await this._backGrantNewFork(rootId, userPrefix);
    // #30: publish the role set to the user themselves. Ordered AFTER the folder grants so a
    // failed cascade never leaves a readable grant promising access that was not actually given.
    await this._publishGrant(rootId, email, userPrefix, roleSetToken(role, extraRoles));

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

    for (const entry of toRevoke) await this._revokeEntry(rootId, email, entry);
    const { skipped } = await this._grantAll(rootId, email, toGrant);

    // #30: a renamed fork leaves the OLD grant file still shared. readGrant takes the first
    // candidate it can parse, so a stale file could keep handing out the previous role set —
    // unshare it before the new one is published.
    if (oldUserPrefix && oldUserPrefix !== newUserPrefix) {
      await this._unpublishGrant(rootId, email, oldUserPrefix);
    }
    await this._publishGrant(rootId, email, newUserPrefix, roleSetToken(newRole, extraRoles));

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
    for (const entry of acl) await this._revokeEntry(rootId, email, entry);
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
    return backfillGrants(this._api, this._wasm || window.__vdg_wasm, {
      rootId:    await this._requireRoot(),
      workspace: this._requireWorkspaceName(),
      users:     await this._userRepo.list(),
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

  async _publishGrant(rootId, email, userPrefix, roleToken) {
    if (!userPrefix) return null;
    return publishGrant(this._api, this._wasm || window.__vdg_wasm, {
      rootId, workspace: this._requireWorkspaceName(), email, userPrefix, roleToken,
    });
  }

  async _unpublishGrant(rootId, email, userPrefix) {
    return unpublishGrant(this._api, this._wasm || window.__vdg_wasm, {
      rootId, workspace: this._requireWorkspaceName(), email, userPrefix,
    });
  }

  async _grantAll(rootId, email, entries) {
    const granted = [];
    const skipped = [];
    try {
      for (const entry of entries) {
        await this._grantEntryResilient(rootId, email, entry, granted, skipped);
      }
    } catch (err) {
      await this._rollback(granted);
      throw err;
    }
    return { granted, skipped };
  }

  /// Grants one ACL entry, tolerating drive.file's appNotAuthorizedToChild: for the wildcard
  /// root it fans out to app-visible child folders; a specific subfolder is recorded in
  /// `skipped`. Any other error propagates (caller rolls back). Mutates `granted`/`skipped`.
  async _grantEntryResilient(rootId, email, entry, granted, skipped) {
    // An interior wildcard names one subfolder of EVERY fork, so it has no single folder id.
    if (splitInteriorWildcard(entry.path)) {
      granted.push(...await grantAcrossForks(this._api, resolvePathToFolderId, rootId, email, entry));
      return;
    }
    try {
      const result = await this._grantEntry(rootId, email, entry);
      if (result) granted.push(result);
    } catch (err) {
      if (!_isNotAuthorizedToChild(err)) throw err;
      if (entry.path === WILDCARD_PATH) {
        await this._grantChildFolders(rootId, email, entry.access, granted, skipped);
      } else {
        skipped.push({ path: entry.path, reason: REASON_NOT_AUTH_CHILD });
      }
    }
  }

  /// Wildcard-root fallback: grant `access` on each app-visible child FOLDER of `rootId`
  /// individually, so one hand-created file at the workspace root no longer blocks the
  /// manager's whole-workspace grant. drive.file only lists app-created children, so the
  /// offending stray file is never touched. Idempotent per folder; folders that are themselves
  /// blocked by a nested stray go to `skipped`.
  async _grantChildFolders(rootId, email, access, granted, skipped) {
    const driveRole = access === ACCESS_WRITE ? DRIVE_ROLE_WRITER : DRIVE_ROLE_READER;
    const children  = typeof this._api.listChildren === 'function'
      ? await this._api.listChildren(rootId)
      : [];
    for (const child of children.filter((c) => c.mimeType === DRIVE_FOLDER_MIME)) {
      try {
        const perms = await this._api.listPermissions(child.id);
        if (perms.some((p) => p.emailAddress === email && p.role === driveRole)) continue;
        const perm = await this._api.putPermission(child.id, email, driveRole);
        granted.push({ folderId: child.id, permissionId: perm.id });
      } catch (err) {
        if (!_isNotAuthorizedToChild(err)) throw err;
        skipped.push({ path: child.name, reason: REASON_NOT_AUTH_CHILD });
      }
    }
  }

  /// AC-02: idempotent — no-op (returns null) when the email already holds this exact
  /// Drive role on the folder.
  async _grantEntry(rootId, email, entry) {
    const folderId  = await resolvePathToFolderId(this._api, rootId, entry.path);
    const driveRole = entry.access === ACCESS_WRITE ? DRIVE_ROLE_WRITER : DRIVE_ROLE_READER;
    const perms     = await this._api.listPermissions(folderId);
    if (perms.some((p) => p.emailAddress === email && p.role === driveRole)) return null;
    const perm = await this._api.putPermission(folderId, email, driveRole);
    return { folderId, permissionId: perm.id };
  }

  async _revokeEntry(rootId, email, entry) {
    if (splitInteriorWildcard(entry.path)) {
      await revokeAcrossForks(this._api, resolvePathToFolderId, rootId, email, entry);
      return;
    }
    const folderId = await resolvePathToFolderId(this._api, rootId, entry.path);
    const perms    = await this._api.listPermissions(folderId);
    const match    = perms.find((p) => p.emailAddress === email);
    if (match) await this._api.deletePermission(folderId, match.id);
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

  async _rollback(granted) {
    for (const g of granted) {
      try { await this._api.deletePermission(g.folderId, g.permissionId); }
      catch (err) { console.error('[role-assignment] rollback delete failed:', err); } // DEV — best-effort compensation
    }
  }

  async _assertNotLastManager(email) {
    const users   = await this._userRepo.list();
    const others  = users.filter((u) => u.role === ROLE_MANAGER && u.email !== email);
    if (others.length === 0) throw new Error('Cannot remove the last remaining Manager');
  }
}

export { roleSetToken, resolvePathToFolderId };
