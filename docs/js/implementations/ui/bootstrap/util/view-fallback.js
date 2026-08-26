// view-fallback.js — bounded, user-actionable view-mount recovery. F-19-17.
// Replaces the previous auto-navigate + VDG_BUST_VIEW_CACHE loop (defect #2). No cache-bust,
// no automatic re-dispatch, no "Loading view…" relabel — the panel reflects the TRUE outcome.
import { renderViewMountRecovery } from '../components/offline-banner.js';

export const MAX_VIEW_MOUNT_RETRIES = 2;

const _attempts = new Map(); // route → user-clicked retries used

export function renderViewFallback(root, route, reason = 'timeout') {
  const used      = _attempts.get(route) ?? 0;
  const exhausted = used >= MAX_VIEW_MOUNT_RETRIES;
  const offline   = typeof navigator !== 'undefined' && navigator.onLine === false;
  renderViewMountRecovery(root, {
    route, offline, exhausted, reason,
    onRetry: () => {                       // fires ONLY on user click — never on a timer
      _attempts.set(route, used + 1);
      window.dispatchEvent(new CustomEvent('vdg:navigate', { detail: { route } }));
    },
    onReload: healOrReloadViaServiceWorker, // fires ONLY on user click — never automatic
  });
}

// A `reason: 'network'` fallback means the chunk's exact URL 404/503'd — the likely cause is a
// build that moved on while this tab is still running the old shell. Reloading blind risks
// re-fetching the SAME stale hash if the old service worker is still in control, so this checks
// for a new worker parked in `waiting` first and, if one exists, activates it through the SAME
// SKIP_WAITING plumbing the update banner uses (sw-register.js _wireUpdatePrompt +
// sw-update-guard.js's one-shot reload guard) instead of a bare location.reload(). No parallel
// heal path — this dispatches the identical event a human clicking that banner would.
// Exported: app.js's boot-critical wasm-load failure (boot/wasm-boot-loader.js) reuses this
// exact function too — one heal path, not one per caller. Safe to share there specifically
// because that code only runs AFTER app.js's own module graph has already loaded successfully;
// entry-loader.js (index.html's pre-app.js bootstrapper) deliberately does NOT import this — see
// its own header comment for why.
export async function healOrReloadViaServiceWorker() {
  const reg = await navigator.serviceWorker?.getRegistration?.().catch(() => null);
  if (reg?.waiting) {
    window.dispatchEvent(new CustomEvent('vdg:sw-update-accept'));
  } else {
    location.reload();
  }
}

export function resetViewMountRetries(route) { _attempts.delete(route); }
