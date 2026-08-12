// role-assignment-helpers.js — the pure half of role-assignment-service.js, split out at the
// 350-line cap (R-B). Everything here is a function of its arguments: no Drive calls, no class
// state, nothing that has to be mocked to be read.

const WILDCARD_PATH     = '*';
const WILDCARD_SUFFIX   = '/*';
const ACCESS_WRITE      = 'write';
const DRIVE_OP_GRANT_WRITE = 'grant_write';
const DRIVE_OP_GRANT_READ  = 'grant_read';
const DRIVE_OP_RESULT_OK   = 'ok';
const DRIVE_OP_REVOKE      = 'revoke';
const REASON_NOT_AUTH_CHILD = 'appNotAuthorizedToChild';

// ── module-level helpers ─────────────────────────────────────────────────────

/// drive.file scope limit: granting a permission on a folder 403s with `appNotAuthorizedToChild`
/// when that folder holds a file the app itself did not create. Distinct from a genuine Drive
/// failure (network / auth / permission on an app-owned file), which must still abort + roll back.
/// The reason string is embedded in DriveApiError.message (`Drive API 403: {..."reason":...}`).
export function _isNotAuthorizedToChild(err) {
  return err?.status === 403 && String(err?.message || '').includes(REASON_NOT_AUTH_CHILD);
}

/// #24 wire format for the wasm bridge: primary role first, secondary hats after, comma-separated.
export function roleSetToken(role, extraRoles = []) {
  return [role, ...(extraRoles || [])].filter(Boolean).join(',');
}

export function _aclHas(acl, entry) {
  return acl.some((e) => e.path === entry.path && e.access === entry.access);
}

/// F-24-06: shapes ACL entries into user-audit-log.jsonl drive_ops records. Grant vs revoke
/// share the same entry list — kind='revoke' overrides the access-derived grant_write/grant_read.
export function _driveOpsFromAcl(entries, kind = null) {
  return entries.map((e) => ({
    folder: e.path,
    op:     kind === DRIVE_OP_REVOKE ? DRIVE_OP_REVOKE : (e.access === ACCESS_WRITE ? DRIVE_OP_GRANT_WRITE : DRIVE_OP_GRANT_READ),
    result: DRIVE_OP_RESULT_OK,
  }));
}

/// Wildcards resolve to the containing folder itself — Drive permission grants are inherited
/// by everything nested under a shared folder, so '*' -> workspace root and 'users/*' -> the
/// 'users' folder, never a per-child fan-out.
export async function resolvePathToFolderId(driveApi, rootId, path) {
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
// #24: extra_roles carries secondary hats (Pricing). Always written as an array — an older record
// without the field reads back as [], so nothing needs migrating.
export function _buildUserRecord(existing, email, role, userPrefix, extraRoles = []) {
  return {
    email,
    display_name: existing?.display_name || email,
    role,                                  // legacy readers — roles[0]
    roles: [role, ...extraRoles].filter(Boolean),
    user_prefix: userPrefix,
    extra_roles: [...extraRoles],
    created_at:  existing?.created_at || new Date().toISOString(),
    active:      true,
  };
}
