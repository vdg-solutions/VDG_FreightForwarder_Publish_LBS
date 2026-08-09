// root-sharing-audit.js — #20: detect the one sharing mistake the ACL model cannot survive.
//
// Drive permissions are inherited by descendants, so anyone granted access on the workspace ROOT
// holds that access on admin/users.jsonl too — an Editor there can hand-edit their own row to
// role:"Manager" and the app has no way to tell (#16 reads that file as the ACL contract).
// The app's own grants never touch the root: inviteSales grants users/{prefix}, the protection
// table grants _shared/*, and only Manager / promoteToManager reach admin/. So ANY non-owner
// permission sitting on the root itself came from a manual "share this folder" and must be
// surfaced.

const PERMISSION_ROLE_OWNER = 'owner';
const PERMISSION_ROLE_WRITER = 'writer';

/// Pure: non-owner permissions on the root, writers first (they are the ones who can rewrite
/// users.jsonl; readers leak data but cannot escalate).
export function classifyRootPermissions(permissions) {
  const shared = (permissions || [])
    .filter((p) => p && p.role !== PERMISSION_ROLE_OWNER)
    .map((p) => ({
      email:    p.emailAddress || '',
      role:     p.role || '',
      canWrite: p.role === PERMISSION_ROLE_WRITER,
    }));
  shared.sort((a, b) => Number(b.canWrite) - Number(a.canWrite));
  return shared;
}

/// Errors propagate: a failed permissions read must never render as "sharing is clean".
export async function auditRootSharing(driveApi, rootId) {
  if (!rootId || typeof driveApi?.listPermissions !== 'function') return [];
  return classifyRootPermissions(await driveApi.listPermissions(rootId));
}
