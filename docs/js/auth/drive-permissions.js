// drive-permissions.js — the three sharing calls, split out of drive-api.js (350-line cap);
// re-exported from there so `driveApi.putPermission` keeps working for every caller, same as
// workspace-root.js. Kept together because they share one constraint the rest of the client
// does not: Drive rate-limits permission CREATION per user over a short window (403
// `sharingRateLimitExceeded`), so a fan-out has to read before it writes.

import { driveFetch } from './drive-api.js';

export async function putPermission(fileId, email, role) {
  return driveFetch('POST', `/files/${fileId}/permissions`, {
    type:         'user',
    role,
    emailAddress: email,
  });
}

// Every grant path calls this FIRST and skips the put when the role is already there. That is
// what keeps a rate-limited fan-out cheap to resume: a re-run spends reads, not sharing ops.
export async function listPermissions(fileId) {
  const res = await driveFetch('GET', `/files/${fileId}/permissions?fields=permissions(id,emailAddress,role)&spaces=drive`);
  return res.permissions || [];
}

export async function deletePermission(fileId, permissionId) {
  await driveFetch('DELETE', `/files/${fileId}/permissions/${permissionId}`);
}
