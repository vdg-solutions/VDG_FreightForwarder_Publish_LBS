// view-fallback.js — bounded, user-actionable view-mount recovery. F-19-17.
// Replaces the previous auto-navigate + VDG_BUST_VIEW_CACHE loop (defect #2). No cache-bust,
// no automatic re-dispatch, no "Loading view…" relabel — the panel reflects the TRUE outcome.
import { renderViewMountRecovery } from '../components/offline-banner.js';

export const MAX_VIEW_MOUNT_RETRIES = 2;

const _attempts = new Map(); // route → user-clicked retries used

export function renderViewFallback(root, route) {
  const used      = _attempts.get(route) ?? 0;
  const exhausted = used >= MAX_VIEW_MOUNT_RETRIES;
  const offline   = typeof navigator !== 'undefined' && navigator.onLine === false;
  renderViewMountRecovery(root, {
    route, offline, exhausted,
    onRetry: () => {                       // fires ONLY on user click — never on a timer
      _attempts.set(route, used + 1);
      window.dispatchEvent(new CustomEvent('vdg:navigate', { detail: { route } }));
    },
  });
}

export function resetViewMountRetries(route) { _attempts.delete(route); }
