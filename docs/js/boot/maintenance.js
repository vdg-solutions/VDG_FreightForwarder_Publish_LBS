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
      trashFile: (fileId) => driveApi.driveFetch('PATCH', `/files/${fileId}`, { trashed: true }),
      moveFile: (fileId, addParent, removeParent) => driveApi.driveFetch(
        'PATCH', `/files/${fileId}?addParents=${addParent}&removeParents=${removeParent}`, {}),
      isManager: (window.__vdg_current_user?.roles || []).includes('Manager'),
    }))
    .then((reports) => {
      for (const r of reports ?? []) {
        if (r.written || r.trashed || r.moved) console.log('[per-record-migrator]', r.kind, r); // DEV
      }
    })
    .catch((err) => console.warn('[VDG] per-record migration skipped:', err.message)); // DEV
}
