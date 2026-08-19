// first-run-provision.js — NOT_PROVISIONED first run: create the workspace root + ACL target
// folders (admin/ makes the creator recognised MANAGER on reload), guarded so an account that is
// already in a workspace can never create a second one. Extracted from boot/license-boot-gate.js
// so the pending-access view (ui) can offer it without reaching into the composition root.

import { bootstrapAclTargetFolders } from '../../core_abstractions/ports/workspace-bootstrap.js';
import { recallGrantAreas } from '../../../storage/core_abstractions/grant-file.js';
import { readCachedIdentityRaw } from '../../core_abstractions/ports/role-cache.js';

const ROLE_NOT_PROVISIONED = 'NOT_PROVISIONED';

export const DRIVE_ROOT_PARENT_ID = 'root';

// A company has exactly ONE workspace. A second one is not a variant to tolerate — it is a
// defect: the data splits in two, half the company writes into a folder nobody else can read,
// and no reconciliation puts it back. So creation is guarded, not merely avoided.
//
// The way it happened: `findWorkspaceRoot` answers null both for "no workspace exists" and for
// "you cannot see the one that does" — an employee holds no permission on the root, and Drive
// answers a query it cannot authorize with an empty list rather than an error. That null used to
// mean "create", and a duplicate "LBS" folder appeared in the employee's own Drive.
export class SecondWorkspaceForbiddenError extends Error {
  constructor(evidence) {
    super(`Refusing to create a second workspace — this account is already provisioned (${evidence})`);
    this.name     = 'SecondWorkspaceForbiddenError';
    this.evidence = evidence;
  }
}

// Membership evidence held locally. Either one proves a workspace EXISTS and this account is
// already in it, which makes an invisible root a visibility problem, never a missing workspace.
// Same verdict as a predicate, for the UI: a screen must not even OFFER to create a workspace
// to an account that is already in one.
export function isAlreadyProvisionedLocally() { return _existingMembershipEvidence() !== null; }

function _existingMembershipEvidence() {
  if (recallGrantAreas().length > 0) return 'grant manifest names granted folders';
  const cached = readCachedIdentityRaw();
  if (cached?.role && cached.role !== ROLE_NOT_PROVISIONED) return `cached role ${cached.role}`;
  return null;
}

// workspace name comes ONLY from the build-injected const — never derived from a licence.
export async function ensureWorkspaceRoot(driveApi, workspaceName) {
  const existing = await driveApi.findWorkspaceRoot(workspaceName);
  if (existing) return { rootId: existing, created: false };
  const evidence = _existingMembershipEvidence();
  if (evidence) throw new SecondWorkspaceForbiddenError(evidence);
  const root = await driveApi.getOrCreateFolder(DRIVE_ROOT_PARENT_ID, workspaceName, { scoped: false });
  return { rootId: root.id, created: true };
}

// NOT_PROVISIONED first run: create the workspace root + ACL target folders (admin/ makes the
// creator recognised MANAGER on reload). A bundled licence has no per-role provisioning screen
// left to show — the caller reloads into the ordinary licence gate once this resolves (F-17-03).
export async function runFirstRunProvision(driveApi, workspaceName) {
  const { rootId } = await ensureWorkspaceRoot(driveApi, workspaceName);
  await bootstrapAclTargetFolders(driveApi, rootId);
  return { rootId };
}
