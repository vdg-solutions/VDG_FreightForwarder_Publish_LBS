// view-fallback.js — view-mount timeout recovery (F-19-17 / anh 2026-06-27 re-correction)
//
// PER MEMORY [[no-loading-view]] — anh's standing rule:
// Do NOT rename the placeholder text. The string "Loading view…" stays so any stuck
// state surfaces honestly. Fixing root cause (SW cache invalidation, module hash bust)
// is the only correct response — never disguise an unresolved load behind a "Failed
// to load. Retry" panel. Renaming = chơi chữ = violation.
//
// When safeAwait fires this fallback, we:
//   1. Re-render the canonical "Loading view…" placeholder (honest signal).
//   2. Attempt SW cache bust + auto-retry the navigate (root-cause-aware recovery).
//   3. If a stuck state persists, the user sees the real "Loading view…" and the
//      bug is reproducible — not papered over.

export function renderViewFallback(root, route) {
  root.innerHTML = `<div id="view-loading" class="p-6 text-slate-500 text-sm">Loading view…</div>`;
  if (typeof window === 'undefined') return;
  if (navigator?.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'VDG_BUST_VIEW_CACHE', route });
  }
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('vdg:navigate', { detail: { route } }));
  }, 200);
}
