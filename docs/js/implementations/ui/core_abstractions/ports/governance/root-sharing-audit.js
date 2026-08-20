// root-sharing-audit — port: non-owner permissions on the workspace ROOT, writers first. Anyone
// granted there inherits it onto the staff table, so this is the one sharing mistake the ACL model
// cannot survive. A failed read THROWS — it must never render as "sharing is clean".

let _impl = null;

/// Root bootstrap binds { auditRootSharing, classifyRootPermissions } once.
export function bindRootSharingAudit(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/root-sharing-audit: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (driveApi, rootId) -> [{ email, role, canWrite }]
export const auditRootSharing = (...a) => _i().auditRootSharing(...a);
/// (permissions) -> the same list, from permissions the caller already read
export const classifyRootPermissions = (...a) => _i().classifyRootPermissions(...a);
