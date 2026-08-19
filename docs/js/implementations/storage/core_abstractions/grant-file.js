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

/// E-43: the manifest half — `[{path, folder_id}]` the manager resolved when they granted. Same
/// address and workspace checks as parseGrant, because a manifest from another company's grant
/// would point this session at another company's folders. An older grant file carries no `areas`
/// and yields [], which the caller reads as "fall back to the root walk".
export function parseGrantAreas(json, email, workspace) {
  let grant;
  try { grant = JSON.parse(json); } catch { return []; }
  if (!grant || typeof grant.email !== 'string') return [];
  if (grant.email.toLowerCase() !== String(email || '').toLowerCase()) return [];
  if (String(grant.workspace || '').toLowerCase() !== String(workspace || '').toLowerCase()) return [];
  if (!Array.isArray(grant.areas)) return [];
  return grant.areas.filter((a) => a && typeof a.path === 'string' && typeof a.folder_id === 'string');
}


/// Where the session keeps its manifest so the data layer can reach it without re-reading Drive.
///
/// localStorage, NOT sessionStorage. It was session-scoped first, on the reasoning that a stale
/// manifest would outlive a revoke — but the manifest is only written when the ROLE PROBE runs, and
/// a warm role cache short-circuits that probe. So a second tab, or any reload with a cached role,
/// had a role and no manifest, and every Drive read threw "Workspace root not found" (measured: a
/// shipment saved locally and its bundle write failed). It shares the role cache's lifetime because
/// it answers the same question — what this user was granted — and `clearCachedRole` drops both.
export const GRANT_AREAS_KEY = 'vdg.grant.areas';

export function rememberGrantAreas(areas) {
  if (!Array.isArray(areas) || areas.length === 0) return; // never overwrite a good manifest with nothing
  try { localStorage.setItem(GRANT_AREAS_KEY, JSON.stringify(areas)); }
  catch { /* storage-less context (tests) — the data layer falls back to the root walk */ }
}

export function recallGrantAreas() {
  try { return JSON.parse(localStorage.getItem(GRANT_AREAS_KEY) || '[]'); }
  catch { return []; }
}

export function clearGrantAreas() {
  try { localStorage.removeItem(GRANT_AREAS_KEY); } catch { /* nothing stored */ }
}
