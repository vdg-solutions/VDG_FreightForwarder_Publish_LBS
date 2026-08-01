// Boot diagnostics — non-throwing push to window.__vdg_diag.
// AC-04, AC-08: diag entries are best-effort; telemetry must never propagate.

const DIAG_GLOBAL = '__vdg_diag';

export const DIAG_KIND_REPO_INIT_TIMEOUT = 'repo-init-timeout';
export const DIAG_KIND_REPO_INIT_OK      = 'repo-init-ok';

export function pushDiag(entry) {
  try {
    if (!Array.isArray(window[DIAG_GLOBAL])) window[DIAG_GLOBAL] = [];
    window[DIAG_GLOBAL].push(entry);
  } catch (_) { /* telemetry must never throw — AC-04 sub-clause */ }
}
