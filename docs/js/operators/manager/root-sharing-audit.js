// root-sharing-audit.js — #20/#22: find permissions on the workspace ROOT that the app did not grant.
//
// Drive permissions are inherited by descendants, so anyone holding access on the root holds it on
// admin/users.jsonl too — the file #16 reads as the ACL contract. An Editor there can hand-edit
// their own row to role:"Manager" and the app cannot tell.
//
// #22 correction: the app DOES grant on the root itself. The protection table gives Manager
// {path:"*",access:"write"} and Auditor {path:"*",access:"read"}, and resolvePathToFolderId maps
// "*" straight to rootId (role-assignment-service.js) — so an in-app Manager/Auditor assignment is
// exactly a root permission. Flagging those was a false positive that told managers to break their
// own grants. What is genuinely wrong is a root permission held by anyone who is NOT an active
// Manager/Auditor (a manual "share this folder"), or an Auditor holding write instead of read.

const ROLE_MANAGER = 'Manager';
const ROLE_AUDITOR = 'Auditor';

const PERMISSION_ROLE_OWNER  = 'owner';
const PERMISSION_ROLE_WRITER = 'writer';

/// The app's own root grant for a workspace role, or null when the role has no business there.
export function expectedRootAccess(appRole) {
  if (appRole === ROLE_MANAGER) return 'write';
  if (appRole === ROLE_AUDITOR) return 'read';
  return null;
}

function _isExpected(appRole, canWrite) {
  const expected = expectedRootAccess(appRole);
  if (expected === 'write') return true;      // Manager: write on the root IS their grant
  if (expected === 'read')  return !canWrite; // Auditor: read is theirs, write exceeds the role
  return false;                               // everyone else: nothing on the root is app-granted
}

/// Pure. Every non-owner permission on the root, annotated against the workspace roles, writers
/// first (they are the ones who can rewrite users.jsonl; readers leak data but cannot escalate).
/// rolesByEmail maps email → role from users.jsonl; absent means "no active record" → unexpected.
export function classifyRootPermissions(permissions, rolesByEmail = {}) {
  const shared = (permissions || [])
    .filter((p) => p && p.role !== PERMISSION_ROLE_OWNER)
    .map((p) => {
      const email    = p.emailAddress || '';
      const canWrite = p.role === PERMISSION_ROLE_WRITER;
      const appRole  = rolesByEmail[email] || rolesByEmail[email.toLowerCase()] || null;
      return { email, role: p.role || '', canWrite, appRole, expected: _isExpected(appRole, canWrite) };
    });
  shared.sort((a, b) => Number(b.canWrite) - Number(a.canWrite));
  return shared;
}

/// Only the permissions the app did not grant — what the manager actually has to act on.
/// Errors propagate: a failed permissions read must never render as "sharing is clean".
export async function auditRootSharing(driveApi, rootId, rolesByEmail = {}) {
  if (!rootId || typeof driveApi?.listPermissions !== 'function') return [];
  const all = classifyRootPermissions(await driveApi.listPermissions(rootId), rolesByEmail);
  return all.filter((p) => !p.expected);
}
