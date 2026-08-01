// RoleAssignmentService — cascades protection-table grants via Drive putPermission (F-24-03,
// F-27-01). Pattern: ledger-reconciler.js / workspace-bootstrap.js (DI over injected
// driveApi, no direct implementations/* import). UserDriveRepo (F-24-02) is consumed through
// its existing contract; the grant list now comes from the WASM permission_resolve_grants
// bridge (protection_table.rs) instead of fetching role-drive-acl.json.

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
  constructor(driveApi, userRepo, findWorkspaceRootFn, auditLog = null, userAuditLog = null, wasm = null) {
    this._api         = driveApi;
    this._userRepo     = userRepo;
    this._findRoot      = findWorkspaceRootFn;
    this._auditLog      = auditLog;
    this._userAuditLog  = userAuditLog;
    this._wasm          = wasm;
  }

  /// F-27-01: grant list resolved via the WASM permission_resolve_grants bridge
  /// (protection_table.rs), replacing the role-drive-acl.json fetch.
  async resolveAcl(role, userPrefix = null) {
    const wasm = this._wasm || window.__vdg_wasm;
    return wasm.permission_resolve_grants(role, userPrefix);
  }

  /// AC-01/AC-02/AC-04: grant every ACL folder for `role`, rollback on partial failure,
  /// upsert the user record last (only once the Drive side is fully consistent).
  async assignRole(email, role, userPrefix = null) {
    const acl    = await this.resolveAcl(role, userPrefix);
    const rootId = await this._requireRoot();

    const { granted, skipped } = await this._grantAll(rootId, email, acl);

    const existing = await this._userRepo.get(email);
    const result   = await this._userRepo.upsert(_buildUserRecord(existing, email, role, userPrefix));
    this._auditLog?.append(AUDIT_KIND, email, AUDIT_ASSIGN, { role, user_prefix: userPrefix, granted: granted.length, skipped: skipped.length });
    this._userAuditLog?.write(
      USER_AUDIT_ASSIGN_ROLE,
      email,
      existing ? { role: existing.role, user_prefix: existing.user_prefix } : { role: null },
      { role, user_prefix: userPrefix },
      _driveOpsFromAcl(acl),
    );
    return { user: result, skipped };
  }

  /// AC-01/AC-02/AC-05 (F-24-08): diff old vs new ACL — revoke what's no longer granted, grant
  /// what's new, leave untouched entries alone. Takes the full `user` record so the OLD ACL is
  /// always resolved from the user's ACTUAL prior role + user_prefix, never from a caller-passed
  /// value that may already be the new one (F-24-08 D-02: a bare oldRole+userPrefix pair let
  /// callers pass the NEW prefix for both sides, silently losing the old ACL's {user_prefix}
  /// substitution). Guards the last-manager lockout before any Drive call.
  async changeRole(user, newRole, newUserPrefix = null) {
    const { email, role: oldRole, user_prefix: oldUserPrefix } = user;
    if (oldRole === ROLE_MANAGER && newRole !== ROLE_MANAGER) {
      await this._assertNotLastManager(email);
    }

    const oldAcl = await this.resolveAcl(oldRole, oldUserPrefix);
    const newAcl = await this.resolveAcl(newRole, newUserPrefix);
    const rootId = await this._requireRoot();

    const toRevoke = oldAcl.filter((o) => !_aclHas(newAcl, o));
    const toGrant  = newAcl.filter((n) => !_aclHas(oldAcl, n));

    for (const entry of toRevoke) await this._revokeEntry(rootId, email, entry);
    const { skipped } = await this._grantAll(rootId, email, toGrant);

    const existing = await this._userRepo.get(email);
    await this._userRepo.upsert(_buildUserRecord(existing, email, newRole, newUserPrefix));
    this._auditLog?.append(AUDIT_KIND, email, AUDIT_CHANGE, { oldRole, newRole, user_prefix: newUserPrefix });
    this._userAuditLog?.write(
      USER_AUDIT_CHANGE_ROLE,
      email,
      { role: oldRole, user_prefix: oldUserPrefix },
      { role: newRole, user_prefix: newUserPrefix },
      [..._driveOpsFromAcl(toRevoke, DRIVE_OP_REVOKE), ..._driveOpsFromAcl(toGrant)],
    );
    return { skipped };
  }

  /// AC-06: revoke every ACL folder for `role`, then soft-delete the user record.
  async revokeRole(email, role, userPrefix = null) {
    if (role === ROLE_MANAGER) await this._assertNotLastManager(email);

    const acl    = await this.resolveAcl(role, userPrefix);
    const rootId = await this._requireRoot();
    for (const entry of acl) await this._revokeEntry(rootId, email, entry);

    await this._userRepo.remove(email);
    this._auditLog?.append(AUDIT_KIND, email, AUDIT_REVOKE, { role, user_prefix: userPrefix });
    this._userAuditLog?.write(
      USER_AUDIT_REVOKE_ROLE,
      email,
      { role, user_prefix: userPrefix },
      { active: false },
      _driveOpsFromAcl(acl, DRIVE_OP_REVOKE),
    );
  }

  // ── private ──────────────────────────────────────────────────────────────

  async _requireRoot() {
    const rootId = await this._findRoot();
    if (!rootId) throw new Error('Workspace root not found');
    return rootId;
  }

  /// AC-04: grants `entries`, compensating-deletes everything granted THIS call before
  /// re-throwing on a GENUINE failure. A drive.file `appNotAuthorizedToChild` 403 is NOT a
  /// genuine failure — the target folder holds a file the app didn't create; rather than abort
  /// the whole assignment (which blocked adding a Manager whenever the workspace held any
  /// hand-created file), the wildcard-root grant fans out to each app-visible child folder and
  /// any still-blocked target is recorded in `skipped` and surfaced to the admin.
  /// Returns { granted, skipped }.
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
    const folderId = await resolvePathToFolderId(this._api, rootId, entry.path);
    const perms    = await this._api.listPermissions(folderId);
    const match    = perms.find((p) => p.emailAddress === email);
    if (match) await this._api.deletePermission(folderId, match.id);
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

// ── module-level helpers ─────────────────────────────────────────────────────

/// drive.file scope limit: granting a permission on a folder 403s with `appNotAuthorizedToChild`
/// when that folder holds a file the app itself did not create. Distinct from a genuine Drive
/// failure (network / auth / permission on an app-owned file), which must still abort + roll back.
/// The reason string is embedded in DriveApiError.message (`Drive API 403: {..."reason":...}`).
function _isNotAuthorizedToChild(err) {
  return err?.status === 403 && String(err?.message || '').includes(REASON_NOT_AUTH_CHILD);
}

function _aclHas(acl, entry) {
  return acl.some((e) => e.path === entry.path && e.access === entry.access);
}

/// F-24-06: shapes ACL entries into user-audit-log.jsonl drive_ops records. Grant vs revoke
/// share the same entry list — kind='revoke' overrides the access-derived grant_write/grant_read.
function _driveOpsFromAcl(entries, kind = null) {
  return entries.map((e) => ({
    folder: e.path,
    op:     kind === DRIVE_OP_REVOKE ? DRIVE_OP_REVOKE : (e.access === ACCESS_WRITE ? DRIVE_OP_GRANT_WRITE : DRIVE_OP_GRANT_READ),
    result: DRIVE_OP_RESULT_OK,
  }));
}

/// Wildcards resolve to the containing folder itself — Drive permission grants are inherited
/// by everything nested under a shared folder, so '*' -> workspace root and 'users/*' -> the
/// 'users' folder, never a per-child fan-out.
async function resolvePathToFolderId(driveApi, rootId, path) {
  if (path === WILDCARD_PATH) return rootId;
  const trimmed = path.endsWith(WILDCARD_SUFFIX) ? path.slice(0, -WILDCARD_SUFFIX.length) : path;

  let current = rootId;
  for (const segment of trimmed.split('/').filter(Boolean)) {
    const folder = await driveApi.listChildFolder(current, segment);
    if (!folder) throw new Error(`ACL path not found: ${path} (missing "${segment}")`);
    current = folder.id;
  }
  return current;
}

// F-24-08 D-02: both call sites (assignRole/changeRole) always pass an explicit resolved
// userPrefix (string or null) — never omit it — so an explicit null here means "this role has
// no fork prefix" and must be written as-is, not silently backfilled from the stale existing
// record (that backfill previously kept an old SalesRep prefix alive after demoting to a role
// that shouldn't carry one).
function _buildUserRecord(existing, email, role, userPrefix) {
  return {
    email,
    display_name: existing?.display_name || email,
    role,
    user_prefix: userPrefix,
    created_at:  existing?.created_at || new Date().toISOString(),
    active:      true,
  };
}
