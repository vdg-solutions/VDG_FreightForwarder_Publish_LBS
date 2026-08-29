// user-provisioning — port: the sales-rep PROFILE (sales_code, commission overrides, name).
//
// F-46-04: invite/promote/disable are gone from here — they wrote a role/status into the "user"
// collection, which the server's RoleResolver never reads (it authorizes from "grants" only, see
// server/src/implementations/freight_grants.rs). Granting, changing or revoking a role goes
// through storage/core_abstractions/user-directory.js (POST/PATCH /api/users) — the mechanism
// implementations/ui/bootstrap/views/admin/users-view.js already uses correctly. This port never
// touches authorization, only the rep's own profile fields.

let _impl = null;

/// Root bootstrap binds { editProfile } once.
export function bindUserProvisioning(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/user-provisioning: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (userId, fields) — throws with the form's i18n message on a refused sales_code
export const editProfile = (...a) => _i().editProfile(...a);
