// grant-cascade.js — the four raw Drive permission primitives behind RoleAssignmentService,
// split out at the 350-line cap. Same shape as fork-grants.js: `api` is the first argument, so
// nothing here reaches for class state and each one reads as what it does to Drive.

import { resolvePathToFolderId, _isNotAuthorizedToChild } from './role-assignment-helpers.js';
import { splitInteriorWildcard, revokeAcrossForks } from './fork-grants.js';

const ACCESS_WRITE          = 'write';
const DRIVE_ROLE_WRITER     = 'writer';
const DRIVE_ROLE_READER     = 'reader';
const DRIVE_FOLDER_MIME     = 'application/vnd.google-apps.folder';
const REASON_NOT_AUTH_CHILD = 'appNotAuthorizedToChild';

const driveRoleFor = (access) => (access === ACCESS_WRITE ? DRIVE_ROLE_WRITER : DRIVE_ROLE_READER);

/// Wildcard-root fallback: grant `access` on each app-visible child FOLDER of `rootId`
/// individually, so one hand-created file at the workspace root no longer blocks the
/// manager's whole-workspace grant. drive.file only lists app-created children, so the
/// offending stray file is never touched. Idempotent per folder; folders that are themselves
/// blocked by a nested stray go to `skipped`.
export async function grantChildFolders(api, rootId, email, access, granted, skipped) {
  const driveRole = driveRoleFor(access);
  const children  = typeof api.listChildren === 'function' ? await api.listChildren(rootId) : [];
  for (const child of children.filter((c) => c.mimeType === DRIVE_FOLDER_MIME)) {
    try {
      const perms = await api.listPermissions(child.id);
      if (perms.some((p) => p.emailAddress === email && p.role === driveRole)) continue;
      const perm = await api.putPermission(child.id, email, driveRole);
      granted.push({ folderId: child.id, permissionId: perm.id });
    } catch (err) {
      if (!_isNotAuthorizedToChild(err)) throw err;
      skipped.push({ path: child.name, reason: REASON_NOT_AUTH_CHILD });
    }
  }
}

/// AC-02: idempotent — no-op (returns null) when the email already holds this exact
/// Drive role on the folder. That read is also what makes a rate-limited fan-out resumable:
/// a re-run spends no sharing op on a folder it already granted.
export async function grantEntry(api, rootId, email, entry, preResolvedFolderId = null) {
  const folderId  = preResolvedFolderId ?? await resolvePathToFolderId(api, rootId, entry.path);
  const driveRole = driveRoleFor(entry.access);
  const perms     = await api.listPermissions(folderId);
  if (perms.some((p) => p.emailAddress === email && p.role === driveRole)) return null;
  const perm = await api.putPermission(folderId, email, driveRole);
  return { folderId, permissionId: perm.id };
}

export async function revokeEntry(api, rootId, email, entry) {
  if (splitInteriorWildcard(entry.path)) {
    await revokeAcrossForks(api, resolvePathToFolderId, rootId, email, entry);
    return;
  }
  const folderId = await resolvePathToFolderId(api, rootId, entry.path);
  const perms    = await api.listPermissions(folderId);
  const match    = perms.find((p) => p.emailAddress === email);
  if (match) await api.deletePermission(folderId, match.id);
}

export async function rollbackGrants(api, granted) {
  for (const g of granted) {
    try { await api.deletePermission(g.folderId, g.permissionId); }
    catch (err) { console.error('[role-assignment] rollback delete failed:', err); } // DEV — best-effort compensation
  }
}
