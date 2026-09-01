// server-users.js — F-46-03: user management is server-side, and the calls themselves are Rust's
// (freight_http::users_*, planned/read in freight_wire). This file only names the wasm exports
// for the user-directory port — no paths, no statuses, no bodies built here.
//
// GET is the safe projection (email, display_name, roles, active) any signed-in account may read
// — the sales-rep picker's source. `includeInactive` also returns deactivated rows and is
// Manager/owner-only server-side (the admin Users screen's own reactivate flow); every other
// caller stays active-only by omitting it. POST/PATCH are Manager/owner-only; the server enforces
// that. A refusal rejects as Error{message: reason code, params} straight from the wasm bridge —
// users-error-message.js renders it.

// Free exports on the wasm MODULE (no repo state), set by wasm-loader.js at boot.
function wasmApi() {
  const m = window.__vdg_wasm;
  if (!m?.users_directory_list) throw new Error('WASM module not loaded');
  return m;
}

/// {role, includeInactive} -> { users: [{email, display_name, roles, active}] }
export async function listUsers({ role, includeInactive } = {}) {
  return wasmApi().users_directory_list(role || '', !!includeInactive);
}

/// {email, display_name, roles} -> the created row. Strict create (H3-a): rejects with
/// `already_exists` if the email already has a grant row -- use patchUser to change an
/// existing person.
export async function createUser({ email, display_name, roles }) {
  return wasmApi().users_directory_create(email, display_name, JSON.stringify(roles));
}

/// (email, {display_name?, roles?, active?}) -> the updated row. `active: false` deactivates.
export async function patchUser(email, body) {
  return wasmApi().users_directory_patch(email, JSON.stringify(body));
}
