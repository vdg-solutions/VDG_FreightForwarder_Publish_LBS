// first-run-provision — port: the NOT_PROVISIONED first run. A company has exactly ONE workspace;
// creating a second splits the data in two and nothing puts it back, so creation is GUARDED and
// the refusal is its own error the screen can name.

/// Drive's own name for the signed-in account's My Drive.
export const DRIVE_ROOT_PARENT_ID = 'root';

export class SecondWorkspaceForbiddenError extends Error {
  constructor(evidence) {
    super('Refusing to create a second workspace — this account is already provisioned (' + evidence + ')');
    this.name     = 'SecondWorkspaceForbiddenError';
    this.evidence = evidence;
  }
}

let _impl = null;

/// Root bootstrap binds { isAlreadyProvisionedLocally, ensureWorkspaceRoot, runFirstRunProvision } once.
export function bindFirstRunProvision(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/first-run-provision: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// () -> true when local evidence already proves this account is in a workspace
export const isAlreadyProvisionedLocally = (...a) => _i().isAlreadyProvisionedLocally(...a);
/// (driveApi, workspaceName) -> { rootId, created }
export const ensureWorkspaceRoot = (...a) => _i().ensureWorkspaceRoot(...a);
/// (driveApi, workspaceName) -> { rootId }
export const runFirstRunProvision = (...a) => _i().runFirstRunProvision(...a);
