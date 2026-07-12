// view-loader.js — safeAwait wrapper for lazy view module loading (F-19-17)
// Prevents perpetual "Loading view…" by racing every import against a 5 s deadline.

import { safeAwait } from './safe-await.js';
import { renderViewFallback } from './view-fallback.js';

// Named constant — no magic number at call sites
export const VIEW_LOAD_TIMEOUT_MS = 5000;

/**
 * Load a lazy view module with a hard timeout.
 *
 * @param {() => Promise<any>} importFn  — lazy import thunk, e.g. () => import('./views/awb.js')
 * @param {Element}            root      — DOM node (already cleared by caller)
 * @param {string}             route     — route string for tag + retry dispatch
 * @param {Function}           _fb       — injectable fallback renderer (unit-test seam)
 * @param {number}             _ms       — injectable timeout ms (unit-test seam)
 * @returns {Promise<any|null>}          — resolved module or null (fallback rendered)
 */
export async function loadView(
  importFn,
  root,
  route,
  _fb  = renderViewFallback,
  _ms  = VIEW_LOAD_TIMEOUT_MS,
) {
  const result = await safeAwait(importFn(), _ms, null, `view-mount:${route}`);
  if (!result.ok) {
    if (result.error && result.error.name !== 'SafeAwaitTimeoutError') {
      console.error(`[view-loader] Import failed for ${route}:`, result.error); // DEV
    }
    _fb(root, route);
    return null;
  }
  return result.value;
}
