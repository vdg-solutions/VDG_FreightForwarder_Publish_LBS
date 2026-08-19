// server-role.js — the server adapter of the workspace-authority port. One call: GET /api/me —
// the server already applied the same rule set (owner => Manager, else the grant's roles) and
// hands back the folder-id manifest the data layer starts from. A 401 here means the server
// session is gone (cookie expired) while the Google token cache still looks alive: propagate as
// a Drive-shaped 401 so the reconnect path re-signs-in.

import { apiFetch } from '../../core_abstractions/backend.js';
import { ApiError } from '../../core_abstractions/api-error.js';
import { DriveApiError } from '../../core_abstractions/drive-errors.js';
import { emailPrefix } from '../../../kernel/core_abstractions/util/email-prefix.js';
import { VERDICT_GRANT, VERDICT_MANAGER, VERDICT_NOT_PROVISIONED } from '../../core_abstractions/workspace-authority.js';

export async function probeRole(user, _wsName) {
  let me;
  try {
    me = await apiFetch('GET', '/me');
  } catch (err) {
    if (err instanceof ApiError) throw new DriveApiError(err.status, err.message);
    throw err;
  }
  const roles = Array.isArray(me?.roles) ? me.roles.filter(Boolean) : [];
  const areas = Array.isArray(me?.areas) ? me.areas.map((a) => ({ path: a.path, folder_id: a.folder_id })) : [];
  if (me?.is_owner) return { kind: VERDICT_MANAGER };
  if (roles.length > 0) {
    return { kind: VERDICT_GRANT, token: String(me.user_prefix || emailPrefix(user.email)).toUpperCase(), roles, areas };
  }
  return { kind: VERDICT_NOT_PROVISIONED };
}

export const serverWorkspaceAuthority = { probeRole };
