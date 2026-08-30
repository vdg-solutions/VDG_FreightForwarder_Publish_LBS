// server-users.js — F-46-03: user management moves server-side. Three thin calls onto
// vdg-server's /api/users routes; the server does the grant write + fork-folder create in one
// request now (no more read-grant / CAS-write-grant / create-fork-folder round trips from here).
//
// GET is the safe projection (email, display_name, roles, active) any signed-in account may read
// — the sales-rep picker's source. `includeInactive` also returns deactivated rows and is
// Manager/owner-only server-side (the admin Users screen's own reactivate flow); every other
// caller stays active-only by omitting it. POST/PATCH are Manager/owner-only; the server enforces
// that, this file just carries the call.

import { apiFetch } from '../../core_abstractions/backend.js';

const USERS_PATH = '/users';

/// {role, includeInactive} -> { users: [{email, display_name, roles, active}] }
export async function listUsers({ role, includeInactive } = {}) {
  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (includeInactive) params.set('include_inactive', 'true');
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch('GET', `${USERS_PATH}${qs}`);
}

/// {email, display_name, roles} -> the created row. Strict create (H3-a): rejects with 409 if
/// the email already has a grant row -- use patchUser to change an existing person.
export async function createUser({ email, display_name, roles }) {
  return apiFetch('POST', USERS_PATH, { email, display_name, roles });
}

/// (email, {display_name?, roles?, active?}) -> the updated row. `active: false` deactivates.
export async function patchUser(email, body) {
  return apiFetch('PATCH', `${USERS_PATH}/${encodeURIComponent(email)}`, body);
}
