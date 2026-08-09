// workspace-acl.js — pre-WASM read of admin/users.jsonl for role detection (#16).
//
// A listable admin/ folder proves only that the workspace ROOT is visible. A manager who shares
// the root grants that visibility to every invitee, so the old folder probe resolved each of them
// MANAGER (QC 2026-08-09: "ai cũng là manager"). users.jsonl is the ACL contract — read the role
// from it and treat the folder probe as a first-run fallback only.
//
// The auth gate runs before the wasm module loads, so UserStore::latest_by_email
// (data_repo/user_store.rs) is unreachable here. This is a deliberate, minimal JS mirror of that
// one rule — latest _ledger_version per email, active only. Keep the two in step.

import { listChildren, getFile, parseJsonlBundle } from './drive-api.js';

export const USERS_FILE_NAME = 'users.jsonl';
const VERSION_FIELD          = '_ledger_version';
const ROLE_MANAGER           = 'Manager';

// Mirrors user_store.rs latest_by_email + active_latest, narrowed to a single email.
export function latestActiveRecord(lines, email) {
  let best = null;
  for (const line of lines) {
    if (!line || line.email !== email) continue;
    const ver     = Number(line[VERSION_FIELD] ?? 0);
    const bestVer = Number(best?.[VERSION_FIELD] ?? 0);
    if (!best || ver > bestVer) best = line;
  }
  return best?.active === true ? best : null;
}

// Role token for auth-gate's _resolvedRole. Manager keeps the sentinel; everyone else carries
// their fork prefix — the existing employee contract, which route-guard's normalizeRole maps to
// a real role once users.jsonl resolves post-boot.
export function roleTokenFromRecord(record, managerId, emailPrefix) {
  if (!record) return null;
  if (record.role === ROLE_MANAGER) return managerId;
  const fork = record.user_prefix || emailPrefix;
  return fork ? String(fork).toUpperCase() : null;
}

/**
 * Read the workspace ACL. Returns { seeded, record }:
 *   seeded:false — users.jsonl absent or empty, i.e. nobody provisioned yet; the caller may
 *                  treat the creator as Manager (genuine first run).
 *   seeded:true  — a null record means this email is NOT an active user of this workspace.
 * Errors propagate: a transient Drive failure must never read as "not authorized".
 */
export async function readWorkspaceAcl(adminFolderId, email) {
  const file = (await listChildren(adminFolderId)).find((f) => f.name === USERS_FILE_NAME);
  if (!file) return { seeded: false, record: null };
  const res   = await getFile(file.id);
  const lines = parseJsonlBundle(res?.content || '');
  if (lines.length === 0) return { seeded: false, record: null };
  return { seeded: true, record: latestActiveRecord(lines, email) };
}
