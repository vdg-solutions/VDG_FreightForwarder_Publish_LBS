// boot/maintenance.js — fire-and-forget housekeeping kicked off after the repo stack is live.
// Boot must never wait on any of this; every job degrades to "retry next boot" on failure.

/// Storage-side upkeep: error-log retention (F-37-08) + legacy-bundle explode (F-38-04).
export function runBootMaintenance(driveApi) {
  // Retention. The error log's write side is capped per session but never expires, so without
  // a prune it is append-only for the life of the workspace.
  window.__vdg_wasm.governance_prune_error_log({ now_ms: Date.now() })
    .catch((err) => console.warn('[VDG] error-log prune skipped:', err.message)); // DEV

  // Per-record migration: explode leftover month bundles of registry kinds into record files.
  // Manager-only (single exploder), bounded per sweep, converges across boots.
  const isManager = (window.__vdg_current_user?.roles || []).includes('Manager');
  Promise.resolve(window.__vdg_wasm.cache_migrate_per_record_kinds({ is_manager: isManager }))
    .then(async (report) => {
      let relocated = report.relocated.some((r) => r.moved > 0);
      for (const r of report.kinds) {
        if (r.written || r.trashed || r.moved) console.log('[per-record-migrator]', r.kind, r); // DEV
        if (r.error) console.warn('[per-record-migrator]', r.kind, 'sweep failed:', r.error); // DEV
        if (r.moved || r.legacy.some((l) => l.retired)) relocated = true;
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
  try {
    // A rate limit inside is expected and self-healing: grants are idempotent, so the next boot
    // picks up where this one stopped — the reply reports per user rather than throwing.
    const result = await window.__vdg_wasm.governance_regrant_everyone({});
    if (result.error) throw new Error(result.error);
    for (const failure of result.failed) console.warn('[VDG] re-grant after move:', failure.email, failure.error); // DEV
    console.log('[VDG] tables moved — grant manifests re-issued', result.regranted.length); // DEV
  } catch (err) {
    console.warn('[VDG] re-grant after move skipped:', err.message); // DEV
  }
}
