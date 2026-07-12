// F-17-03 — workspace root resolution + rename. Split out of drive-api.js (350-line cap);
// re-exported from there so `driveApi.findWorkspaceRoot` keeps working for every caller.

import { driveFetch, findFolder, FOLDER_MIME } from './drive-api.js';
import { globalOwnerQuery, dedupeGlobalOwnerFolders } from './drive-folder-dedup.js';

// Legacy-only: used by onboarding's checkWorkspaceExists() to offer a one-time migrate/bind
// prompt for a pre-license folder (greenfield rule — NOT a fallback for findWorkspaceRoot).
export const WORKSPACE_NAME = (() => {
  const raw = 'LBS';
  return raw.startsWith('WORKSPACE_NAME_') ? 'LBS' : raw;
})();

const DRIVE_ROOT_PARENT_ID = 'root';

// F-24-20: Drive query boolean term for "shared to me, not owned by me" — named so the
// query string composition below isn't an opaque literal concat.
const SHARED_WITH_ME_CLAUSE = 'sharedWithMe';

// F-24-20: separate from globalOwnerQuery on purpose — that query is consumed unchanged by
// repo-init-steps.js's owner-wide orphan re-count (AC-02) and must stay owner-only. This
// query is owner-blind by design and its result is NEVER fed to dedupeGlobalOwnerFolders,
// moveToParent, or any delete helper — the signed-in user does not own a shared folder, so
// this app must never reparent or trash it.
async function sharedWorkspaceQuery(name) {
  const q = `name='${name}' and ${SHARED_WITH_ME_CLAUSE} and mimeType='${FOLDER_MIME}' and trashed=false`;
  return (await driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`)).files || [];
}

// PM decision (F-17-03): the workspace registry is the SOLE source of `name` — no
// localStorage read here, no hardcoded fallback. A missing name means NOT_PROVISIONED;
// resolve to null WITHOUT probing Drive. globalOwnerQuery only ever queries the signed-in
// user's OWN Drive, so a fallback could never bind another company's folder — the only
// hazard it would reopen is one user holding several workspaces in a single Drive and
// binding the wrong one (F-17-05).
//
// F-24-19 contract: `null` means exactly one thing — the query ran and no such folder
// exists. A missing Drive scope, a transport failure, a 5xx, a quota error are NOT that;
// each is an error and MUST reach the caller. A blanket catch here previously mapped all of
// them to null, which boot read as "workspace absent" and answered by CREATING a second
// workspace folder — the duplicate-folder class dedupeGlobalOwnerFolders exists to clean up.
// No catch: errors propagate. (dedupeGlobalOwnerFolders keeps its own narrow, documented
// /files/root-404 degradation — that is a specific classify step, not an error swallow.)
export async function findWorkspaceRoot(name) {
  if (!name) return null;
  const found  = await globalOwnerQuery(driveFetch, name);
  const winner = await dedupeGlobalOwnerFolders(driveFetch, found, DRIVE_ROOT_PARENT_ID);
  if (winner) return winner.id;

  // AC-01/AC-03: not owned by the signed-in user — check whether it was shared instead.
  // Read-only: pick a folder id straight off the list, never dedupe/move/delete (F-24-20).
  const shared = await sharedWorkspaceQuery(name);
  if (shared.length === 0) return null;
  const sorted = shared.slice().sort((a, b) => a.id.localeCompare(b.id));
  return sorted[0].id;
}

export async function listChildFolder(parentId, name) {
  return findFolder(parentId, name);
}

// AC-11: rename an existing folder in place for migrate/bind — children preserved,
// no delete/recreate.
export async function renameFolder(fileId, newName) {
  return driveFetch('PATCH', `/files/${fileId}`, { name: newName });
}
