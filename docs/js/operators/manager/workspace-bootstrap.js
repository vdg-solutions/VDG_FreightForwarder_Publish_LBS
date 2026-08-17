// workspace-bootstrap.js — pre-creates every ACL-target folder on Manager boot (F-24-07).
// role-assignment-service.js::resolvePathToFolderId throws "ACL path not found" if a folder
// listed in role-drive-acl.json doesn't exist yet under the workspace root. This closes that
// gap for the Manager-side folders (users/{prefix} is handled separately, at add-user time,
// by getOrCreateFolderPath — see user-add-modal.js).
//
// Pattern: DI over injected driveApi (role-assignment-service.js / ledger-reconciler.js), no
// direct implementations/* import.
//
// F-24-15 hardening: F-24-07 QA found a mid-loop Drive failure aborted the whole function (outer
// .catch(console.warn) at the repo-init-steps.js call site swallowed it), silently dropping every
// folder after the one that failed. Each folder is now created in its own try/catch so one
// failure never blocks the rest; callers get a result summary instead of an all-or-nothing throw.
// awb-books was dropped from SHARED_SUBFOLDERS — no grant ever referenced it (D2).

import { MASTER_REGISTRY } from '../../data/master-registry.js';

const SHARED_DIR    = '_shared';
const TEAM_AUDIENCE = 'team';

// Tables whose reader set is NOT everyone. They sit OUTSIDE the wholesale zone on purpose:
// inheritance only ever widens, so a folder inside `_shared` cannot be kept from anyone.
//   shipments — Accounting is not a reader
//   billing   — CS is not a reader
//   awbs      — same audience as shipments
//   commission_rules / admin / grants — administration
export const WALLED_TABLES = ['user', 'user_audit_log', 'commission_rules'];

// Every table the WHOLE COMPANY may read lives directly under `_shared`, one folder per table
// (owner 2026-08-17). That is what makes provisioning a reader ONE sharing operation instead of
// fifteen: Drive permissions inherit downward, so a read on `_shared` reaches every table under
// it. Derived from MASTER_REGISTRY — already pinned to the Rust storage registry by
// master-kind-parity.test.mjs — so a new kind cannot drift out of the zone.
//
// The refs with their own governance queue are here too: the queue hangs off the table folder,
// and both halves of a priced kind now share one home instead of the two it used to have.
export const SHARED_SUBFOLDERS = [
  ...Object.entries(MASTER_REGISTRY)
    .filter(([, e]) => e.audience === TEAM_AUDIENCE)
    .map(([kind]) => kind)
    .filter((kind) => !WALLED_TABLES.includes(kind)),
  'fx-rates', 'ledger',   // bespoke stores, still tables the policy table governs
];

// #30: `grants` holds one read-only grant file per user. E-43: it appears in resolve_grants as a
// Manager-only row, which is what lets a Manager who does not own the root administer at all
// (F-42-08). It still never reaches an employee — the row's reader set is [Manager].
export const ROOT_FOLDERS = [
  'users', 'admin', 'admin/users', 'admin/audit-log', 'grants',
  'shipments', 'billing', 'awbs', 'commission_rules',
];
// Must equal PENDING_DIR in data_repo/priced_ref_store.rs and boundary/protection_table.rs.
export const PENDING_DIR = '_pending';

// Idempotent — getOrCreateFolder dedups on repeat calls (F-15-19/F-20-02 pattern), so calling
// this on every Manager boot is safe and cheap once the folders already exist.
export async function bootstrapAclTargetFolders(driveApi, wsRootId) {
  const result = { succeeded: 0, failed: 0, errors: [] };
  const sharedFolder = await driveApi.getOrCreateFolder(wsRootId, SHARED_DIR);

  for (const name of SHARED_SUBFOLDERS) {
    try {
      const ref = await driveApi.getOrCreateFolder(sharedFolder.id, name);
      result.succeeded++;
      // The proposal queue is granted separately (resolve_grants gives a non-maintainer write on
      // `_shared/{ref}/_pending` and read on the ref), and resolvePathToFolderId throws on a
      // missing segment — so the queue must exist before anyone can be granted it, not on first
      // proposal. Counted separately so a partial bootstrap names which half failed.
      await driveApi.getOrCreateFolder(ref.id, PENDING_DIR);
      result.succeeded++;
    } catch (err) {
      result.failed++;
      result.errors.push({ folder: `${SHARED_DIR}/${name}`, error: err.message });
      console.warn(`[bootstrap] Failed to create ${SHARED_DIR}/${name}:`, err.message);
    }
  }

  // The walled tables and the administration folders, at root level beside `_shared`. Nested
  // paths ('admin/users') walk segment by segment — the same walk resolvePathToFolderId does at
  // assign time, so what bootstrap creates is exactly what it looks for. One failure never
  // blocks the rest (F-24-15).
  for (const path of ROOT_FOLDERS) {
    try {
      let parent = wsRootId;
      for (const segment of path.split('/').filter(Boolean)) {
        parent = (await driveApi.getOrCreateFolder(parent, segment)).id;
      }
      result.succeeded++;
    } catch (err) {
      result.failed++;
      result.errors.push({ folder: path, error: err.message });
      console.warn(`[bootstrap] Failed to create ${path}:`, err.message);
    }
  }

  // Diag event so a manager-side UI can surface a partial bootstrap instead of it staying silent
  if (result.failed > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vdg:bootstrap-partial', { detail: result }));
  }

  return result;
}
