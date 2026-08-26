// view-loader.js — safeAwait wrapper for lazy view module loading (F-19-17)
// Prevents perpetual "Loading view…" by racing every import against a 5 s deadline.

import { safeAwait } from '../../../kernel/core_abstractions/util/safe-await.js';
import { renderViewFallback } from './view-fallback.js';

// Named constant — no magic number at call sites. Raised to 25s for slow cold-start unbundled ESM fetches
export const VIEW_LOAD_TIMEOUT_MS = 25000;

// One automatic retry after a short backoff — a GitHub Pages deploy-window 503 (edge hasn't
// propagated the new chunk yet) self-heals within seconds, so a single retry recovers it
// transparently. Beyond one retry we're just stacking multiple 25s timeout budgets on what is
// likely a genuinely broken/removed chunk — that case belongs to the user-actionable fallback,
// not to more silent waiting.
export const VIEW_LOAD_RETRY_COUNT = 1;
export const VIEW_LOAD_RETRY_DELAY_MS = 1200;

/**
 * Load a lazy view module with a hard timeout and one automatic retry.
 *
 * @param {() => Promise<any>} importFn  — lazy import thunk, e.g. () => import('../views/manager/awb.js')
 * @param {Element}            root      — DOM node (already cleared by caller)
 * @param {string}             route     — route string for tag + retry dispatch
 * @param {Function}           _fb       — injectable fallback renderer (unit-test seam)
 * @param {number}             _ms       — injectable timeout ms (unit-test seam)
 * @param {number}             _delayMs  — injectable retry backoff ms (unit-test seam)
 * @returns {Promise<any|null>}          — resolved module or null (fallback rendered)
 */
export async function loadView(
  importFn,
  root,
  route,
  _fb      = renderViewFallback,
  _ms      = VIEW_LOAD_TIMEOUT_MS,
  _delayMs = VIEW_LOAD_RETRY_DELAY_MS,
) {
  let result = await safeAwait(importFn(), _ms, null, `view-mount:${route}`);

  for (let attempt = 1; !result.ok && attempt <= VIEW_LOAD_RETRY_COUNT; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, _delayMs));
    result = await safeAwait(importFn(), _ms, null, `view-mount:${route}:retry${attempt}`);
  }

  if (!result.ok) {
    // Timeout vs a real fetch/import rejection are different failures — a timeout is "still
    // waiting", a rejection is "the file isn't there" (stale hash from a mid-flight deploy).
    // The fallback UI tells them apart instead of flattening both into one generic message.
    const reason = result.error?.name === 'SafeAwaitTimeoutError' ? 'timeout' : 'network';
    if (reason === 'network') {
      console.error(`[view-loader] Import failed for ${route} after retry:`, result.error); // DEV
    }
    _fb(root, route, reason);
    return null;
  }
  return result.value;
}
