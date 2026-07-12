// workspace-bootstrap.js — pre-creates every ACL-target folder on Manager boot (F-24-07).
// role-assignment-service.js::resolvePathToFolderId throws "ACL path not found" if a folder
// listed in role-drive-acl.json doesn't exist yet under the workspace root. This closes that
// gap for the Manager-side folders (users/{prefix} is handled separately, at add-user time,
// by getOrCreateFolderPath — see user-add-modal.js).
//
// Pattern: DI over injected driveApi (role-assignment-service.js / ledger-reconciler.js), no
// direct implementations/* import.
//
// F-24-15 hardening: F-24-07 QA found a mid-loop Drive failure aborted the whole function (outer
// .catch(console.warn) at the repo-init-steps.js call site swallowed it), silently dropping every
// folder after the one that failed. Each folder is now created in its own try/catch so one
// failure never blocks the rest; callers get a result summary instead of an all-or-nothing throw.
// awb-books also dropped from SHARED_SUBFOLDERS — role-drive-acl.json never referenced it (D2).

const SHARED_DIR = '_shared';
// Exported for test-side alignment assertions against role-drive-acl.json (F-24-15 AC-03/AC-04).
export const SHARED_SUBFOLDERS = ['customers', 'fx-rates', 'ledger'];
const ROOT_FOLDERS = ['users', 'admin'];

// Idempotent — getOrCreateFolder dedups on repeat calls (F-15-19/F-20-02 pattern), so calling
// this on every Manager boot is safe and cheap once the folders already exist.
export async function bootstrapAclTargetFolders(driveApi, wsRootId) {
  const result = { succeeded: 0, failed: 0, errors: [] };
  const sharedFolder = await driveApi.getOrCreateFolder(wsRootId, SHARED_DIR);

  for (const name of SHARED_SUBFOLDERS) {
    try {
      await driveApi.getOrCreateFolder(sharedFolder.id, name);
      result.succeeded++;
    } catch (err) {
      result.failed++;
      result.errors.push({ folder: `${SHARED_DIR}/${name}`, error: err.message });
      console.warn(`[bootstrap] Failed to create ${SHARED_DIR}/${name}:`, err.message);
    }
  }

  // users + admin at root level
  for (const name of ROOT_FOLDERS) {
    try {
      await driveApi.getOrCreateFolder(wsRootId, name);
      result.succeeded++;
    } catch (err) {
      result.failed++;
      result.errors.push({ folder: name, error: err.message });
      console.warn(`[bootstrap] Failed to create ${name}:`, err.message);
    }
  }

  // Diag event so a manager-side UI can surface a partial bootstrap instead of it staying silent
  if (result.failed > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vdg:bootstrap-partial', { detail: result }));
  }

  return result;
}
