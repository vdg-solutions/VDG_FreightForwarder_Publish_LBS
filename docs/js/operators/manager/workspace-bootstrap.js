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

const SHARED_DIR = '_shared';
const MASTERS_DIR = 'shared/masters';
const TEAM_AUDIENCE = 'team';
// E-43: the policy table now governs the master-data folders too, so resolvePathToFolderId walks
// `shared/masters/<kind>` at assign time and THROWS on a missing segment. Those folders used to
// appear only when someone first wrote that kind — so assigning a role on a fresh workspace failed
// for whichever masters nobody had touched yet. Derived from MASTER_REGISTRY (already pinned to the
// Rust registry by master-kind-parity.test.mjs) rather than hand-listed, so a new kind cannot drift.
export function masterSubfolderPaths(registry = MASTER_REGISTRY) {
  return Object.entries(registry)
    .filter(([, e]) => e.audience === TEAM_AUDIENCE)
    .map(([kind]) => `${MASTERS_DIR}/${kind}`);
}
// One folder per PROTECTED REF (seed/permissions/protection-table.json). This list must cover the
// table, because resolve_grants emits `_shared/{ref}` for every ref and resolvePathToFolderId
// THROWS "ACL path not found" on a missing segment: a ref with no folder makes assigning the role
// that maintains it fail outright. The three rate refs were missing here, so assigning the Pricing
// hat only worked once something else had lazily created their folders — an ordering accident, not
// a guarantee. Exported so the alignment stays asserted (F-24-15 AC-03/AC-04).
export const SHARED_SUBFOLDERS = [
  'customers', 'fx-rates', 'ledger',        // Accountant's refs
  'air-rates', 'local-charges', 'ocean-tariff', // the Pricing hat's rate refs (#24)
  // E-37: the job file left the sales rep's fork — CS and Sales both write it, so no single fork
  // can hold it — and publish materializes the financial snapshot into `billing`, which is the
  // only shipment area Accounting is granted. Both are CONFIDENTIAL refs: a role outside their
  // reader set gets no permission at all, so these folders must exist before anyone is assigned.
  'shipments', 'billing',
  // E-43: awbs had storage (_shared/awbs) and no policy row, so nothing was ever granted on it
  // and no folder was ever pre-created. Both halves are fixed together.
  'awbs',
];
// #30: `grants` holds one read-only grant file per user. It is created here but NEVER appears in
// resolve_grants — a permission on the folder would inherit down to every child and hand each user
// everyone else's role set, which is the exact leak the per-file share exists to prevent.
// E-43: `grants` DOES appear in resolve_grants now — as a Manager-only row, which is what lets a
// Manager who does not own the root read the grant files and administer at all (F-42-08). It still
// never reaches an employee: the row's reader set is [Manager], so nobody else is emitted anything.
// `admin/users` is the `user` master kind's folder (KIND_PATH_OVERRIDES), granted by the same row.
export const ROOT_FOLDERS = ['users', 'admin', 'admin/users', 'grants'];
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

  // users + admin + grants at root level, and every master-data folder the policy table governs.
  // Nested paths ('admin/users', 'shared/masters/<kind>') walk segment by segment — the same walk
  // resolvePathToFolderId does at assign time, so what bootstrap creates is exactly what it looks
  // for. One failure never blocks the rest (F-24-15).
  for (const path of [...ROOT_FOLDERS, ...masterSubfolderPaths()]) {
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
