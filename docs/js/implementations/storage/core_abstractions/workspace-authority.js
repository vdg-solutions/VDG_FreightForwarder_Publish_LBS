// workspace-authority.js — port: who is this signed-in account for the active workspace, as the
// storage authority sees it. ONE question, answered by the bound adapter: GET /api/me, where the
// server already applied the ownership/grant rules; server-role.js only carries the body.
// The verdict is data; the auth-gate (freight_app) turns it into session roles + caches. The
// adapter never touches the app's caches — that is what keeps a second adapter (Firebase, a plain
// server login) a one-file job.

/// Verdicts. `token` is the ACCOUNT the rest of the app keys on (MANAGER sentinel or the
/// the account, upper-cased); `roles` the role names; `areas` the folder-id manifest an
/// employee's data layer starts from ({ path, folder_id }[]).
export const VERDICT_MANAGER = 'manager';
export const VERDICT_GRANT = 'grant';
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
  if (!_adapter) throw new Error('storage/workspace-authority: no adapter bound (the storage bootstrap binds it)');
  return _adapter;
}

/// Test seam.
export function _resetWorkspaceAuthority() { _adapter = null; }
