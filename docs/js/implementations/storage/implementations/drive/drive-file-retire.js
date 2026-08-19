// drive-file-retire.js — how a row leaves a table when you do not own the file.
//
// Drive's rule, measured live 2026-08-17: the account that CREATES a file owns it, and in My Drive
// only the owner may trash it. Everyone else — including the workspace owner, including a writer on
// the parent folder — gets `403 insufficientFilePermissions`. That is not an ACL mistake to fix; it
// is how Drive works, and a database built on folders has to answer for it.
//
// It surfaced as a migration that reported doing nothing: `shared/masters/customers/all.jsonl` had
// been written by an EMPLOYEE's session, so the manager's sweep could not trash it, the per-kind
// catch swallowed the 403, and the whole run said "0 moved" while the bundle sat there. The
// neighbouring kinds converted fine — their bundles happened to be manager-created.
//
// Removing the file from its PARENT is a different right: it needs edit access to the file and the
// folder, which a writer has. The row leaves the table; the bytes stay in their owner's Drive,
// which is a kinder outcome than trashing anyway.

const REASON_NOT_OWNER = 'insufficientFilePermissions';

/// Take a file out of a table. Trash it if we own it; otherwise orphan it out of the folder.
/// Returns 'trashed' | 'detached' | 'failed'.
export async function retireFile(driveApi, fileId, parentId) {
  try {
    await driveApi.driveFetch('PATCH', `/files/${fileId}`, { trashed: true });
    return 'trashed';
  } catch (err) {
    if (!String(err?.message || '').includes(REASON_NOT_OWNER)) throw err;
  }
  if (!parentId) return 'failed'; // nothing to detach from — the caller keeps it, loudly
  await driveApi.driveFetch('PATCH', `/files/${fileId}?removeParents=${parentId}`, {});
  return 'detached';
}

/// Bound `retireFile` to one folder, in the shape the migrator wants: `(fileId) => Promise`.
export function retireFrom(driveApi, parentIdFor) {
  return async (fileId, parentId) => retireFile(driveApi, fileId, parentId ?? parentIdFor);
}
