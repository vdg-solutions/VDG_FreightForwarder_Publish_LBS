// mount-view.js — bounds the render/data-await (import already bounded by loadView). F-19-17.
import { safeAwait }             from './safe-await.js';
import { renderViewFallback, resetViewMountRetries } from './view-fallback.js';
import { markViewSuperseded }    from './view-root.js';

// Drive-backed render needs headroom over the 5 s import budget (VIEW_LOAD_TIMEOUT_MS).
// Matches SAFE_AWAIT_DEFAULT_MS for one consistent slow-path budget.
export const RENDER_MOUNT_TIMEOUT_MS = 8000;

// Bound a view module's render() call. Resolves exactly once, never throws, never hangs.
//   renderFn — thunk, e.g. () => mod.render(root, id)
//   root     — #view-root (already cleared)
//   route    — route string for fallback context + safe-await tag
//   _fb      — injectable fallback renderer (unit-test seam)
//   _ms      — injectable timeout ms (unit-test seam)
// Returns true when render settled in time, false when it timed out/errored (fallback rendered).
export async function mountView(
  renderFn, root, route,
  _fb = renderViewFallback,
  _ms = RENDER_MOUNT_TIMEOUT_MS,
) {
  const result = await safeAwait(
    Promise.resolve().then(renderFn), _ms, null, `view-render:${route}`,
  );
  // AC-05: mark BEFORE painting the fallback — a still-running detached render() checks this
  // and bails instead of clobbering the fallback the shell just showed for this route.
  if (!result.ok) { markViewSuperseded(root); _fb(root, route); return false; }
  resetViewMountRetries(route); // successful mount clears the route's retry budget
  return true;
}
