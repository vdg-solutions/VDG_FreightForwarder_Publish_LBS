// grant-publisher.js — #30: the per-user grant file half of role assignment. Split out of
// role-assignment-service.js for the 350-line cap (same reason protection_table.rs left
// permission.rs). Pure functions over an injected driveApi + wasm bridge, no module state.
//
// `grants/grant.{workspace}.{prefix}` is a user's own row, and the ONLY place their assigned role
// set is legible to them: admin/users.jsonl lives under admin/, which resolve_grants never shares.
// The folder itself is granted to NOBODY — a permission there inherits down to every child and
// hands each user everyone else's roles. The file carries one READER permission for one email;
// reader and not writer is the point, since a writer could edit their own row to Manager.

export const GRANTS_DIR = 'grants';
export const DRIVE_ROLE_READER = 'reader';
export const DRIVE_OP_GRANT_ROLE_FILE = 'grant_role_file';

/// Audit row for the grant file — its own op, because it is the only one that changes what the
/// USER can see about their own permissions.
export function grantFileOp(userPrefix, op = DRIVE_OP_GRANT_ROLE_FILE, result = 'ok') {
  return { folder: `${GRANTS_DIR}/${userPrefix}`, op, result };
}

/// Write the grant and share it reader to `email` alone. Idempotent: an existing file is PATCHed in
/// place so its fileId — and the permission already on it — survives a role change.
export async function publishGrant(api, wasm, { rootId, workspace, email, userPrefix, roleToken }) {
  if (!userPrefix) return null;
  const content = wasm.grant_file_build(email, workspace, userPrefix, roleToken);
  const name    = wasm.grant_file_target_name(workspace, userPrefix);

  const folder   = await api.getOrCreateFolder(rootId, GRANTS_DIR);
  const existing = (await api.listChildren(folder.id)).find((f) => f.name === name);
  const written  = existing
    ? await api.uploadFile(existing.id, name, content, null, { isUpdate: true })
    : await api.uploadFile(folder.id, name, content);

  const fileId = existing ? existing.id : written.id;
  const perms  = await api.listPermissions(fileId);
  if (!perms.some((p) => p.emailAddress === email && p.role === DRIVE_ROLE_READER)) {
    await api.putPermission(fileId, email, DRIVE_ROLE_READER);
  }
  return fileId;
}

/// Unshare rather than delete: the file is the record of what was granted, and a user who cannot
/// read it cannot act on it. A missing file is not an error — nothing to unshare.
export async function unpublishGrant(api, wasm, { rootId, workspace, email, userPrefix }) {
  const name   = wasm.grant_file_target_name(workspace, userPrefix);
  const folder = await api.getOrCreateFolder(rootId, GRANTS_DIR);
  const file   = (await api.listChildren(folder.id)).find((f) => f.name === name);
  if (!file) return;
  const match = (await api.listPermissions(file.id)).find((p) => p.emailAddress === email);
  if (match) await api.deletePermission(file.id, match.id);
}

/// Users provisioned BEFORE grant files existed have none, and with authority moved off the fork
/// inference that means no roles at all — they would each land on /pending-access. Publishes only
/// what is MISSING (a role change always republishes through assignRole/changeRole) and reports
/// rather than throws: one unwritable user must not stop the rest, and a manager who is not the
/// workspace owner may legitimately fail on some.
export async function backfillGrants(api, wasm, { rootId, workspace, users }) {
  const result = { published: [], failed: [] };
  const folder = await api.getOrCreateFolder(rootId, GRANTS_DIR);
  const have   = new Set((await api.listChildren(folder.id)).map((f) => f.name));

  for (const user of users) {
    const userPrefix = user.user_prefix;
    if (!userPrefix) continue;          // no fork yet — assignRole publishes when one is made
    if (have.has(wasm.grant_file_target_name(workspace, userPrefix))) continue;

    // A legacy record carries role + extra_roles rather than roles; both must survive.
    const roles = (user.roles?.length ? user.roles : [user.role, ...(user.extra_roles || [])])
      .filter(Boolean);
    if (roles.length === 0) continue;   // an empty set is not a grant — nothing to hand out
    try {
      await publishGrant(api, wasm, {
        rootId, workspace, email: user.email, userPrefix, roleToken: roles.join(','),
      });
      result.published.push(user.email);
    } catch (err) {
      result.failed.push({ email: user.email, error: err.message });
      console.warn(`[grant-publisher] backfill failed for ${user.email}:`, err.message); // DEV
    }
  }
  return result;
}
