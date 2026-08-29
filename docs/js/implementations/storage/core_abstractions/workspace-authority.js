// workspace-authority.js — port: who is this signed-in account for the active workspace, as the
// storage authority sees it. ONE question, answered by whichever adapter the bootstrap bound:
//   drive  — ownership of the workspace root (bootstrap Manager) or the grant file shared to the
//            account, or a bare fork, or nothing (implementations/drive/drive-workspace-authority.js)
//   server — GET /api/me: the server already applied the same rules (implementations/server/server-role.js)
// The verdict is data; the auth-gate (freight_app) turns it into session roles + caches. Neither
// adapter touches the app's caches — that is what keeps a third adapter (gdrive-db, Firebase) a
// one-file job.

/// Verdicts. `token` is the fork token the rest of the app keys on (MANAGER sentinel or the
/// user's prefix upper-cased); `roles` the role names; `areas` the folder-id manifest an
/// employee's data layer starts from ({ path, folder_id }[]).
export const VERDICT_MANAGER = 'manager';
export const VERDICT_GRANT = 'grant';
export const VERDICT_FORK = 'fork';
export const VERDICT_NOT_PROVISIONED = 'not_provisioned';

/// E-43: "could not determine" is NOT "not provisioned" — the adapter throws this when the
/// workspace demonstrably exists but this account cannot see it (a permission gap), so the gate
/// never caches a verdict for it.
export class RoleUndeterminedError extends Error {
  constructor(reason) {
    super(`Role undetermined: ${reason}`);
    this.name = 'RoleUndeterminedError'; // undecidable by construction — never cached as a role
  }
}

let _adapter = null;

/// The bound adapter exposes `probeRole(user, workspaceName) → Promise<verdict>` where verdict is
/// { kind, token?, roles?, areas? } — see the VERDICT_* constants.
export function bindWorkspaceAuthority(adapter) { _adapter = adapter; }

export function workspaceAuthority() {
  if (!_adapter) throw new Error('storage/workspace-authority: no adapter bound (bootstrap selects drive | server)');
  return _adapter;
}

/// Test seam.
export function _resetWorkspaceAuthority() { _adapter = null; }
