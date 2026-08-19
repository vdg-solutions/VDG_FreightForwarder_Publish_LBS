// migration-signal.js — migrators announce "a background migration is running" as `vdg:migration`
// CustomEvents (detail.delta = +1 start / -1 end). The UI's migration overlay listens; the
// migrators never import the overlay. Window-guarded so node tests and any non-DOM caller are
// unaffected.

export const MIGRATION_EVENT = 'vdg:migration';

export function beginMigration() { _emit(+1); }
export function endMigration()   { _emit(-1); }

function _emit(delta) {
  // Browser-only. Node/tests may have a PARTIAL window stub (no dispatchEvent / no CustomEvent) —
  // guard on the actual APIs and swallow, so migrators stay unaffected off-DOM.
  try {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function'
        || typeof CustomEvent === 'undefined') return;
    window.dispatchEvent(new CustomEvent(MIGRATION_EVENT, { detail: { delta } }));
  } catch { /* non-DOM / partial-stub env — the overlay is a browser affordance only */ }
}
