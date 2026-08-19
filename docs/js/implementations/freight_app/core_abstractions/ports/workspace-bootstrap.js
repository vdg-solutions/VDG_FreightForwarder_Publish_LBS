// workspace-bootstrap.js — port: the workspace bootstrap use-case as its collaborators call it; the freight_app bootstrap binds
// the operator (operators/manager/workspace-bootstrap.js) behind it. Constants and error shapes are contract and live here.

export const WALLED_TABLES = ['user', 'user_audit_log', 'commission_rules'];

export const ROOT_FOLDERS = [
  'users', 'roster', 'user-audit-log', 'grants',
  'shipments', 'billing', 'awbs', 'commission_rules',
];

export const PENDING_DIR = '_pending';

let _impl = null;

/// The operator registers { bootstrapAclTargetFolders } once, from the freight_app bootstrap.
export function bindWorkspaceBootstrap(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('freight_app/workspace-bootstrap: no operator bound (the freight_app bootstrap binds it)');
  return _impl;
}

export const bootstrapAclTargetFolders = (...a) => _i().bootstrapAclTargetFolders(...a);

/// Test seam.
export function _resetWorkspaceBootstrap() { _impl = null; }
