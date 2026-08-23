// grant-reader.js — read an employee's grant off Drive: the file is shared to them by name prefix
// (sharedWithMe, no root dependency), the roles/areas parse is the core's (grant-file.js).

import { findSharedFilesByNamePrefix, getFile } from '../../core_abstractions/storage-api.js';
import { grantSearchKey, forkFromGrantName, parseGrant, parseGrantAreas } from '../../core_abstractions/grant-file.js';

/// The signed-in user's grant, found from what they actually know at sign-in: the workspace they
/// are entering and the local-part of their own email. The file reports the real `fork`
/// back, and every later lookup uses that.
///
/// Returns { fork, roles }; roles [] means no grant was found, which the caller must treat as
/// "no roles", never as a permissive default. Errors propagate: a transient Drive failure must not
/// read as "this user has no roles".
async function readGrant(workspace, emailBase, email) {
  const candidates = await findSharedFilesByNamePrefix(grantSearchKey(workspace, emailBase));
  for (const file of candidates) {
    const fork = forkFromGrantName(file.name, workspace);
    if (!fork) continue;
    const res   = await getFile(file.id);
    const json  = res?.content || '';
    const roles = parseGrant(json, email, workspace);
    if (roles.length > 0) return { fork, roles, areas: parseGrantAreas(json, email, workspace) };
  }
  return { fork: null, roles: [], areas: [] };
}

/// What the storage bootstrap binds behind the grant-reader port.
export const grantReader = { readGrant };
