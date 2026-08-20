// workspace-bootstrap — port: pre-creates every ACL-target folder, so granting a path later never
// fails on a folder that was never made. Idempotent, and one failure never blocks the rest.

let _impl = null;

/// Root bootstrap binds { bootstrapAclTargetFolders } once.
export function bindWorkspaceBootstrap(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/workspace-bootstrap: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (driveApi, wsRootId) -> { succeeded, failed, errors }
export const bootstrapAclTargetFolders = (...a) => _i().bootstrapAclTargetFolders(...a);
