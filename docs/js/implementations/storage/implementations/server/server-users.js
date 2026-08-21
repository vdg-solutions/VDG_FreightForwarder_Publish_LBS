// server-users.js — F-46-03: user management moves server-side. Three thin calls onto
// vdg-server's /api/users routes; the server does the grant write + fork-folder create in one
// request now (no more read-grant / CAS-write-grant / create-fork-folder round trips from here).
//
// GET is the safe projection (email, display_name, roles) any signed-in account may read — the
// sales-rep picker's source. POST/PATCH are Manager/owner-only; the server enforces that, this
// file just carries the call.

import { apiFetch } from '../../core_abstractions/backend.js';

const USERS_PATH = '/users';

/// {role} -> { users: [{email, display_name, roles}] }
export async function listUsers({ role } = {}) {
  const qs = role ? `?role=${encodeURIComponent(role)}` : '';
  return apiFetch('GET', `${USERS_PATH}${qs}`);
}

/// {email, display_name, roles} -> the created/updated row. Idempotent: a repeat call with the
/// same email updates the existing grant, never creates a second one.
export async function createUser({ email, display_name, roles }) {
  return apiFetch('POST', USERS_PATH, { email, display_name, roles });
}

/// (email, {display_name?, roles?, active?}) -> the updated row. `active: false` deactivates.
export async function patchUser(email, body) {
  return apiFetch('PATCH', `${USERS_PATH}/${encodeURIComponent(email)}`, body);
}
