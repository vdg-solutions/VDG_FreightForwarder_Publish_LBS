// mount-view.js — bounds the render/data-await (import already bounded by loadView). F-19-17.
// F-52-01: two-phase timing — a soft ceiling shows a non-blocking loading affordance and keeps
// awaiting the SAME render promise (no abandon-and-supersede); only the hard ceiling is the
// genuine anti-stuck backstop that marks superseded + paints the dead-end fallback.
import { safeAwait, SafeAwaitTimeoutError } from './safe-await.js';
import { renderViewFallback, resetViewMountRetries } from './view-fallback.js';
import { markViewSuperseded }    from './view-root.js';
import { t }                     from '../i18n/index.js';

// Drive-backed render needs headroom over the 5 s import budget (VIEW_LOAD_TIMEOUT_MS).
// Matches SAFE_AWAIT_DEFAULT_MS for one consistent slow-path budget. Soft threshold: past this
// point the render is merely slow, not stuck — keep waiting, show a loading affordance.
export const RENDER_MOUNT_TIMEOUT_MS = 8000;

// Hard ceiling: the genuine anti-stuck backstop (no-loading-view guarantee). Only past this does
// a still-pending render get abandoned (superseded + dead-end fallback painted).
export const RENDER_MOUNT_HARD_TIMEOUT_MS = 20000;

// Non-blocking loading affordance painted at the soft ceiling — never a dead-end, no retry button.
function paintSoftLoadingAffordance(root) {
  if (!root || root.innerHTML !== '') return; // AC-05: never clobber a view's own painted shell
  root.innerHTML = `<div class="p-6 text-slate-500 text-sm">${t('loading')}</div>`;
}

// Bound a view module's render() call. Resolves exactly once, never throws, never hangs.
//   renderFn — thunk, e.g. () => mod.render(root, id)
//   root     — #view-root (already cleared)
//   route    — route string for fallback context + safe-await tag
//   _fb      — injectable fallback renderer (unit-test seam)
//   _softMs  — injectable soft timeout ms (unit-test seam)
//   _hardMs  — injectable hard timeout ms (unit-test seam)
// Returns true when render settled in time, false when it timed out/errored (fallback rendered).
export async function mountView(
  renderFn, root, route,
  _fb     = renderViewFallback,
  _softMs = RENDER_MOUNT_TIMEOUT_MS,
  _hardMs = RENDER_MOUNT_HARD_TIMEOUT_MS,
) {
  const renderPromise = Promise.resolve().then(renderFn); // invoked exactly once, reused below

  const soft = await safeAwait(renderPromise, _softMs, null, `view-render:${route}`);
  if (soft.ok) { resetViewMountRetries(route); return true; }
  if (!(soft.error instanceof SafeAwaitTimeoutError)) {
    // real rejection/throw — fail fast, no waiting for the soft/hard grace period.
    markViewSuperseded(root); _fb(root, route); return false;
  }

  // Soft ceiling hit, render still pending — do NOT supersede, do NOT paint the fallback.
  // Keep awaiting the identical render promise through the hard ceiling.
  paintSoftLoadingAffordance(root);

  const hard = await safeAwait(renderPromise, Math.max(0, _hardMs - _softMs), null, `view-render-hard:${route}`);
  if (!hard.ok) {
    // AC-05 (F-19-72): mark BEFORE painting the fallback — a still-running detached render()
    // checks this and bails instead of clobbering the fallback the shell just showed.
    markViewSuperseded(root); _fb(root, route); return false;
  }
  resetViewMountRetries(route); // successful mount clears the route's retry budget
  return true;
}
