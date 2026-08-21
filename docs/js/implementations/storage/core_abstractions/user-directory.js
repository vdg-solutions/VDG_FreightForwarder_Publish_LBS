// user-directory.js — port: server-side user management (F-46-03). GET/POST/PATCH /api/users —
// UI views import THIS, never the server adapter directly (storage-api.js's own rule, same reason).

let _impl = null;

/// The storage bootstrap binds { listUsers, createUser, patchUser } once (compose.js — a static
/// binding, this feature is server-only by design, no Drive-mode branch).
export function bindUserDirectory(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('storage/user-directory: no adapter bound (the storage bootstrap binds it)');
  return _impl;
}

/// ({role?}) -> { users: [{email, display_name, roles}] }
export const listUsers = (...a) => _i().listUsers(...a);
/// ({email, display_name, roles}) -> the created/updated row
export const createUser = (...a) => _i().createUser(...a);
/// (email, {display_name?, roles?, active?}) -> the updated row
export const patchUser = (...a) => _i().patchUser(...a);
