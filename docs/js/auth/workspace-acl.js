// workspace-acl.js — pre-WASM read of the roster for role detection (#16).
//
// A listable folder proves only that the workspace ROOT is visible. A manager who shares the root
// grants that visibility to every invitee, so the old folder probe resolved each of them MANAGER
// (QC 2026-08-09: "ai cũng là manager"). The ROSTER is the ACL contract — read the role from it
// and treat the folder probe as a first-run fallback only.
//
// The auth gate runs before the wasm module loads, so `UserStore` (data_repo/user_store.rs) is
// unreachable here; this is a deliberate, minimal JS mirror of it. That mirror used to have real
// work to do — latest `_ledger_version` per email out of one appended bundle. It does not any
// more: one person is one file, so the file IS the record. What is left is "read it, is it
// active". Keep the two in step (owner 2026-08-17: `admin/` dropped, one record one file).

import { listChildren, getFile } from './drive-api.js';

/// The roster's folder. Deliberately not `users/` — that name is the per-user fork namespace.
export const ROSTER_FOLDER_NAME = 'roster';
const RECORD_SUFFIX = '.json';
const ROLE_MANAGER  = 'Manager';

/// One person's file name. Mirrors user_store.rs::roster_file_name.
export function rosterFileName(email) {
  return `${email}${RECORD_SUFFIX}`;
}

/// A row speaks for its person only while they are active — a soft-removed colleague is not
/// authority, though the row stays so the past keeps its author.
export function activeRecord(row) {
  return row?.active === true ? row : null;
}

// #28: the record's ROLE SET. `roles` is the contract going forward; an older record carries a
// single `role`, which reads back as a one-element set so nothing needs migrating. Returned in
// file order — no primary/secondary ranking, a user simply holds N roles.
export function rolesFromRecord(record) {
  if (!record) return [];
  const raw = Array.isArray(record.roles) ? record.roles : [record.role];
  return raw.filter((r) => typeof r === 'string' && r.length > 0);
}

// Role token for auth-gate's _resolvedRole. Manager keeps the sentinel; everyone else carries
// their fork prefix — the existing employee contract, which route-guard's normalizeRole maps to
// a real role once the roster resolves post-boot.
export function roleTokenFromRecord(record, managerId, emailPrefix) {
  if (!record) return null;
  if (record.role === ROLE_MANAGER) return managerId;
  const fork = record.user_prefix || emailPrefix;
  return fork ? String(fork).toUpperCase() : null;
}

/**
 * Read the workspace ACL. Returns { seeded, record }:
 *   seeded:false — the roster is empty, i.e. nobody provisioned yet; the caller may treat the
 *                  creator as Manager (genuine first run).
 *   seeded:true  — a null record means this email is NOT an active user of this workspace.
 * Errors propagate: a transient Drive failure must never read as "not authorized".
 */
export async function readWorkspaceAcl(rosterFolderId, email) {
  const files = (await listChildren(rosterFolderId)).filter((f) => f.name.endsWith(RECORD_SUFFIX));
  if (files.length === 0) return { seeded: false, record: null };

  const mine = files.find((f) => f.name === rosterFileName(email));
  if (!mine) return { seeded: true, record: null };   // roster exists; this email is not in it

  const res = await getFile(mine.id);
  const raw = typeof res === 'string' ? res : (res?.content ?? res?._raw ?? '');
  let row = null;
  try { row = JSON.parse(String(raw).trim()); } catch { row = null; }
  return { seeded: true, record: activeRecord(row) };
}
