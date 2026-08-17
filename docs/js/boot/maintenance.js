// boot/maintenance.js — fire-and-forget housekeeping kicked off after the repo stack is live.
// Boot must never wait on any of this; every job degrades to "retry next boot" on failure.

/// Storage-side upkeep: error-log retention (F-37-08) + legacy-bundle explode (F-38-04).
export function runBootMaintenance(driveApi, ioPort) {
  // Retention. The error log's write side is capped per session but never expires, so without
  // a prune it is append-only for the life of the workspace.
  import('../operators/manager/error-log-store.js')
    .then((m) => m.pruneErrorLog(driveApi))
    .catch((err) => console.warn('[VDG] error-log prune skipped:', err.message)); // DEV

  // Per-record migration: explode leftover month bundles of registry kinds into record files.
  // Manager-only (single exploder), bounded per sweep, converges across boots.
  import('../cache/per-record-migrator.js')
    .then((m) => m.migratePerRecordKinds({
      wasm: window.__vdg_wasm,
      ws: ioPort,
      // Not a plain trash: the account that created a file owns it, and only an owner may trash.
      // A non-owner detaches it from the folder instead — see drive-file-retire.js.
      trashFile: (fileId, parentId) => import('../data/drive-file-retire.js')
        .then((m) => m.retireFile(driveApi, fileId, parentId)),
      moveFile: (fileId, addParent, removeParent) => driveApi.driveFetch(
        'PATCH', `/files/${fileId}?addParents=${addParent}&removeParents=${removeParent}`, {}),
      isManager: (window.__vdg_current_user?.roles || []).includes('Manager'),
    }))
    .then(async (reports) => {
      let relocated = false;
      for (const r of reports ?? []) {
        if (r.written || r.trashed || r.moved) console.log('[per-record-migrator]', r.kind, r); // DEV
        if (r.moved || (r.legacy ?? []).some((l) => l.retired)) relocated = true;
      }
      // MOVING A TABLE IS TWO MOVES: the data, and the permission. The migration does the first.
      // Without the second, every employee keeps a grant manifest pointing at the old folder —
      // and an employee holds no permission on the root, so that manifest is the only map they
      // have. Measured live: the roster moved to `roster/`, the manifests still said `admin`, and
      // every screen needing a colleague's name died with "Không mở được màn hình".
      //
      // So the manager who just moved the data re-issues the maps, in the same breath.
      if (relocated) await _regrantEveryone();
    })
    .catch((err) => console.warn('[VDG] per-record migration skipped:', err.message)); // DEV
}

/// Re-publish every provisioned user's grant so their manifest names the tables' CURRENT homes.
/// Idempotent: `_grantEntry` reads listPermissions first, so a user already holding their ACL
/// costs reads and no sharing operation — which matters, because Drive rate-limits sharing.
async function _regrantEveryone() {
  const svc = window.__vdg_role_assignment_service;
  if (!svc?._userRepo) return;
  try {
    const users = await svc._userRepo.list();
    for (const u of users) {
      if (!u.user_prefix) continue;   // no fork = nothing was ever granted to re-issue
      const roles = (u.roles?.length ? u.roles : [u.role, ...(u.extra_roles || [])]).filter(Boolean);
      if (!roles.length) continue;
      try { await svc.changeRole(u, roles[0], u.user_prefix, roles.slice(1)); }
      catch (err) {
        // A rate limit here is expected and self-healing: grants are idempotent, so the next
        // boot picks up where this one stopped.
        console.warn('[VDG] re-grant after move:', u.email, err.message); // DEV
      }
    }
    console.log('[VDG] tables moved — grant manifests re-issued'); // DEV
  } catch (err) {
    console.warn('[VDG] re-grant after move skipped:', err.message); // DEV
  }
}
