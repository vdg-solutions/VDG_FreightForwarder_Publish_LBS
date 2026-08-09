// root-sharing-audit.js — #20: detect the one sharing mistake the ACL model cannot survive.
//
// Drive permissions are inherited by descendants, so anyone granted access on the workspace ROOT
// holds that access on admin/users.jsonl too — an Editor there can hand-edit their own row to
// role:"Manager" and the app has no way to tell (#16 reads that file as the ACL contract).
//
// #23: the app NEVER grants on the root. The live grant source is the Rust protection table
// (js_bridge_permission.rs → resolve_grants), which emits exactly `users/{prefix}` write plus one
// `_shared/{ref}` entry per protected ref — no wildcard, no root. role-drive-acl.json still carries
// an old `{"path":"*"}` row for Manager/Auditor, but protection_table.rs states it supersedes that
// file and RoleAssignmentService.resolveAcl() only ever calls the wasm bridge, so those rows are
// dead config. #22 briefly trusted them and suppressed the warning for anyone holding a
// Manager/Auditor record — which is precisely the account a self-promoting Editor would hold.
// So: any non-owner permission on the root came from a manual "share this folder" and is reported.

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
