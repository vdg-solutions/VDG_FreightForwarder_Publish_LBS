// drive-workspace-authority.js — the Drive adapter of the workspace-authority port: ownership of
// the root, else the grant shared to this account, else a bare fork, else nothing. Lifted verbatim
// out of auth-gate.js (its `_probeInner`) so the gate keeps only the orchestration.

import { hasDriveScopeGrant } from '../../core_abstractions/identity.js';
import { findWorkspaceRoot, findSharedSubfolder, listChildFolder, ownsWorkspaceRoot } from '../../core_abstractions/storage-api.js';
import { DriveApiError } from '../../core_abstractions/drive-errors.js';
import { readGrant } from '../../core_abstractions/grant-reader.js';
import { isBoundBuild } from '../../core_abstractions/workspace-config.js';
import { DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT } from '../../core_abstractions/drive-error-classifier.js';
import { isUndecidable } from '../../core_abstractions/undecidable.js';
import { emailPrefix } from '../../../kernel/core_abstractions/util/email-prefix.js';
import { RoleUndeterminedError, VERDICT_FORK, VERDICT_GRANT, VERDICT_MANAGER, VERDICT_NOT_PROVISIONED }
  from '../../core_abstractions/workspace-authority.js';

const USERS_FOLDER_NAME = 'users';
const HTTP_FORBIDDEN = 403;

/// AC-03: read BEFORE any Drive request (findWorkspaceRoot swallows every error to null, which
/// would silently degrade a missing scope into NOT_PROVISIONED).
function assertDriveScope() {
  if (hasDriveScopeGrant()) return;
  const err = new DriveApiError(HTTP_FORBIDDEN, 'Drive scope not granted');
  err.driveErrorKind = DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT;
  throw err;
}

/// The user's fork, by either route: under a root they can see, or shared directly to them
/// (F-27-04 — an employee never owns the root, so sharedWithMe resolves it with no root at all).
/// Identity only; the role set comes from the grant file.
async function resolveForkToken(rootId, prefix) {
  if (rootId) {
    try {
      const usersRoot = await listChildFolder(rootId, USERS_FOLDER_NAME);
      const fork      = usersRoot && await listChildFolder(usersRoot.id, prefix);
      if (fork) return prefix.toUpperCase();
    } catch (err) {
      if (isUndecidable(err)) throw err;
      /* probe missed — try the shared-to-me route */
    }
  }
  return (await findSharedSubfolder(prefix)) ? prefix.toUpperCase() : null;
}

export async function probeRole(user, wsName) {
  assertDriveScope();
  const prefix = emailPrefix(user.email);

  // Owner path — ONE question, and it is not "can you see the root". Sharing the root makes it
  // visible to every invitee, and reading MANAGER off that visibility is the QC-2026-08-09 bug
  // ("ai cũng là manager"). Drive assigns ownership and an invitee cannot forge it.
  //
  // Ownership answers both cases at once: on a genuine first run the creator owns the folder they
  // just made, and afterwards the owner is the person who issues the grants — so they must never
  // be locked out by lacking one. `ensure_seeded` writes the owner their own grant on the next
  // manager boot. A Manager who does NOT own the root (E-43) reads their role from their grant
  // below, the same call a rep uses.
  const rootId = await findWorkspaceRoot(wsName);
  if (rootId && await ownsWorkspaceRoot(wsName)) {
    return { kind: VERDICT_MANAGER };
  }

  // Employee path (#30): the grant file is the only authority an employee can actually read —
  // it is found via sharedWithMe with no root dependency, so it resolves even when rootId is null,
  // and it reports the real user_prefix (a collision appended random digits).
  const grant = await readGrant(wsName, prefix, user.email);
  if (grant.roles.length > 0) {
    return { kind: VERDICT_GRANT, token: grant.userPrefix.toUpperCase(), roles: grant.roles, areas: grant.areas };
  }

  // A fork with no grant still identifies WHERE this user's data lives — but it is NOT a role.
  const forkToken = await resolveForkToken(rootId, prefix);
  if (forkToken) return { kind: VERDICT_FORK, token: forkToken };

  // E-43: in a tenant build the workspace folder demonstrably exists, so a null rootId says only
  // that THIS account cannot see it — a permission gap, not an absent account.
  if (isBoundBuild() && !rootId) {
    throw new RoleUndeterminedError(
      'workspace root is not visible to this account — permissions have not been applied to it');
  }
  return { kind: VERDICT_NOT_PROVISIONED };
}

export const driveWorkspaceAuthority = { probeRole };
