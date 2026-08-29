// server-role.js — the server adapter of the workspace-authority port. One call: GET /api/me —
// the server already applied the same rule set (owner => Manager, else the grant's roles) and
// hands back the folder-id manifest the data layer starts from. /me never legitimately answers
// with an HTTP error (its verdicts are all in the 200 body — is_owner, roles, or an empty roles
// array for not-provisioned), so ANY thrown ApiError here — 401 cookie expiry included — is
// undecidable by construction: propagated as-is, never swallowed into a verdict. auth_gate.rs's
// `probe()` is what turns that into "no cache write, no role" instead of the 2026-08-11 lockout.
import { apiFetch } from '../../core_abstractions/backend.js';
import { forkId } from '../../../kernel/core_abstractions/util/fork-id.js';
import { VERDICT_GRANT, VERDICT_MANAGER, VERDICT_NOT_PROVISIONED } from '../../core_abstractions/workspace-authority.js';

export async function probeRole(user, _wsName) {
  const me = await apiFetch('GET', '/me');
  const roles = Array.isArray(me?.roles) ? me.roles.filter(Boolean) : [];
  const areas = Array.isArray(me?.areas) ? me.areas.map((a) => ({ path: a.path, folder_id: a.folder_id })) : [];
  if (me?.is_owner) return { kind: VERDICT_MANAGER };
  if (roles.length > 0) {
    return { kind: VERDICT_GRANT, token: String(me.fork || forkId(user.email)).toUpperCase(), roles, areas };
  }
  return { kind: VERDICT_NOT_PROVISIONED };
}

export const serverWorkspaceAuthority = { probeRole };
