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
export async function publishGrant(api, wasm, { rootId, workspace, email, userPrefix, roleToken, areas = null }) {
  if (!userPrefix) return null;
  // E-43: with the folder ids, the file stops being a badge and becomes the user's MANIFEST — the
  // only way an employee can reach a granted folder, since they hold nothing on the workspace root
  // and Drive returns an empty list (not an error) for a parent they cannot read.
  const content = areas?.length
    ? wasm.grant_file_build_with_areas(email, workspace, userPrefix, roleToken, JSON.stringify(areas))
    : wasm.grant_file_build(email, workspace, userPrefix, roleToken);
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

/// The roster row's role set, tolerating the legacy shape (role + extra_roles) alongside `roles`.
function rolesOf(user) {
  return (user.roles?.length ? user.roles : [user.role, ...(user.extra_roles || [])]).filter(Boolean);
}

/// Users provisioned BEFORE grant files existed have none, and with authority moved off the fork
/// inference that means no roles at all — they would each land on /pending-access.
///
/// E-43: this used to test only whether a file of that NAME existed and `continue` if it did, so a
/// grant file carrying an obsolete role set survived forever — the one repair path that exists for
/// a divergence could not repair anything, only fill gaps. It now READS the file and compares it to
/// what the roster says, and rewrites on difference. `publishGrant` PATCHes in place, so the fileId
/// and the reader permission already on it both survive the rewrite.
///
/// Reports rather than throws: one unwritable user must not stop the rest, and a manager who is not
/// the workspace owner may legitimately fail on some.
export async function backfillGrants(api, wasm, { rootId, workspace, users, resolveAreas = null }) {
  const result = { published: [], repaired: [], failed: [] };
  const folder = await api.getOrCreateFolder(rootId, GRANTS_DIR);
  const byName = new Map((await api.listChildren(folder.id)).map((f) => [f.name, f]));

  for (const user of users) {
    const userPrefix = user.user_prefix;
    if (!userPrefix) continue;          // no fork yet — assignRole publishes when one is made
    const roles = rolesOf(user);
    if (roles.length === 0) continue;   // an empty set is not a grant — nothing to hand out

    const roleToken = roles.join(',');
    const existing  = byName.get(wasm.grant_file_target_name(workspace, userPrefix));
    try {
      if (existing) {
        // A read failure is NOT "the file is wrong": rewriting on a transient error would churn
        // every grant on every 5xx. Only a file we actually read and found different is repaired.
        const current = (await api.getFile(existing.id))?.content || '';
        // A file with no manifest is out of date even when its ROLES are right — that is exactly
        // the pre-E-43 shape, and leaving it alone is what would keep every existing employee
        // locked out. Compare against the manifest form when one can be built.
        const areasNow = resolveAreas ? await resolveAreas(user) : null;
        const wanted   = areasNow?.length
          ? wasm.grant_file_build_with_areas(user.email, workspace, userPrefix, roleToken, JSON.stringify(areasNow))
          : wasm.grant_file_build(user.email, workspace, userPrefix, roleToken);
        if (current === wanted) continue;
        await publishGrant(api, wasm, { rootId, workspace, email: user.email, userPrefix, roleToken, areas: areasNow });
        result.repaired.push(user.email);
        continue;
      }
      const areas = resolveAreas ? await resolveAreas(user) : null;
      await publishGrant(api, wasm, { rootId, workspace, email: user.email, userPrefix, roleToken, areas });
      result.published.push(user.email);
    } catch (err) {
      result.failed.push({ email: user.email, error: err.message });
      console.warn(`[grant-publisher] backfill failed for ${user.email}:`, err.message); // DEV
    }
  }
  return result;
}
