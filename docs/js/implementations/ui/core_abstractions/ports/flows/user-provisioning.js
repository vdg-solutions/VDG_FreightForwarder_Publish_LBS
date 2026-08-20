// user-provisioning — port: the user lifecycle (invite, promote, disable, edit profile).

let _impl = null;

/// Root bootstrap binds { inviteSales, promoteToManager, disableUser, editProfile } once.
export function bindUserProvisioning(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/user-provisioning: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (email, name, driveApi, repo, workspaceRootId) -> the created user record
export const inviteSales = (...a) => _i().inviteSales(...a);
/// (userId, driveApi, repo, adminFolderId)
export const promoteToManager = (...a) => _i().promoteToManager(...a);
/// (userId, driveApi, repo)
export const disableUser = (...a) => _i().disableUser(...a);
/// (userId, fields, repo) — throws with the form's i18n message on a refused sales_code
export const editProfile = (...a) => _i().editProfile(...a);
