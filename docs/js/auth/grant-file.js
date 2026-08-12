// grant-file.js — #30: pre-WASM read of the per-user grant file `grants/grant.{workspace}.{prefix}`.
//
// The problem it fixes: resolve_grants never grants anything on `admin/`, so an employee could not
// read admin/users.jsonl and auth-gate inferred their role from the mere existence of their fork —
// every Accountant, Auditor and Pricing holder resolved as SalesRep on their own machine.
//
// The grant file is that user's row and nothing else: `grants/` is granted to nobody (so it cannot
// be listed), the file carries one reader permission for one email, and reader means the user
// cannot edit their own roles.
//
// The auth gate runs before the wasm module loads, so boundary/grant_file.rs is unreachable here.
// This is a deliberate, minimal mirror of parse_grant; f-30 asserts the two stay in step.

import { findSharedFilesByNamePrefix } from './workspace-root.js';
import { getFile } from './drive-api.js';

// Mirrors boundary/grant_file.rs.
export const GRANTS_DIR     = 'grants';
export const GRANT_FILE_TAG = 'grant.';
const NAME_SEPARATOR        = '.';

// Mirrors boundary/role.rs::Role::ALL. An unknown name refuses the WHOLE file rather than being
// dropped — a silently dropped hat reads to the user as an unexplained access denial.
const ROLE_NAMES = ['Manager', 'SalesManager', 'SalesRep', 'CustomerService',
                    'Accountant', 'Auditor', 'Pricing'];

export function grantFileName(workspace, userPrefix) {
  return `${GRANT_FILE_TAG}${workspace}${NAME_SEPARATOR}${userPrefix}`;
}

/// Search key: tag + workspace + the local-part of the user's own email. Their real prefix may
/// carry 4 random digits from a collision, so the fork name is not knowable at sign-in.
export function grantSearchKey(workspace, emailBase) {
  return grantFileName(workspace, emailBase);
}

/// Fork name recovered from a grant file's name, for THIS workspace. A grant belonging to another
/// company returns null — sharedWithMe spans the user's whole Drive.
export function userPrefixFromGrantName(name, workspace) {
  const head = grantFileName(workspace, '');
  if (typeof name !== 'string' || !name.startsWith(head)) return null;
  return name.slice(head.length) || null;
}

/// Mirrors boundary/grant_file.rs::parse_grant. Returns the role array, or [] for anything that is
/// not a valid grant addressed to `email` in `workspace`. Both checks matter: the address check
/// because a shared file may not be ours, the workspace check because a user working for two
/// companies is shared a grant from each.
export function parseGrant(json, email, workspace) {
  let grant;
  try { grant = JSON.parse(json); } catch { return []; } // not our file — absence, not a failure
  // user_prefix is required, as it is on the Rust side: GrantFile has no default for it, so a file
  // missing it is not a grant. Accepting one here handed out roles from a half-written file.
  if (!grant || typeof grant.email !== 'string' || typeof grant.user_prefix !== 'string'
      || !grant.user_prefix || !Array.isArray(grant.roles)) return [];
  if (grant.email.toLowerCase() !== String(email || '').toLowerCase()) return [];
  if (String(grant.workspace || '').toLowerCase() !== String(workspace || '').toLowerCase()) return [];
  if (grant.roles.length === 0) return [];
  if (!grant.roles.every((r) => ROLE_NAMES.includes(r))) return [];
  return [...grant.roles];
}

/// The signed-in user's grant, found from what they actually know at sign-in: the workspace they
/// are entering and the local-part of their own email. The file reports the real `user_prefix`
/// back, and every later lookup uses that.
///
/// Returns { userPrefix, roles }; roles [] means no grant was found, which the caller must treat as
/// "no roles", never as a permissive default. Errors propagate: a transient Drive failure must not
/// read as "this user has no roles".
export async function readGrant(workspace, emailBase, email) {
  const candidates = await findSharedFilesByNamePrefix(grantSearchKey(workspace, emailBase));
  for (const file of candidates) {
    const userPrefix = userPrefixFromGrantName(file.name, workspace);
    if (!userPrefix) continue;
    const res   = await getFile(file.id);
    const roles = parseGrant(res?.content || '', email, workspace);
    if (roles.length > 0) return { userPrefix, roles };
  }
  return { userPrefix: null, roles: [] };
}
