// mount-overlay.js — the owner of a body-attached overlay's lifetime.
//
// The router swaps only <main id="view-root"> (view-root.js), so nothing appended to <body> is
// torn down by a route change: a drawer, modal or wizard opened by one view stays painted over
// the next one, with its state-changing buttons still live on a route that never offered them.
// Every view-scoped overlay registers here and the view-root swap ends them all — that seam is
// the one place that knows a route is over, so the teardown belongs to it and not to each caller.
//
// Removing the NODE is what matters, not hiding it: an open <dialog> leaves the top layer (and
// stops holding `inert` over the rest of the page) only when it leaves the DOM.
//
// The old per-overlay `hashchange` listener this replaces missed two real navigations — router.js
// `navigate()` re-dispatches without a hash change when the route is unchanged, and the
// `vdg:auth-reconnected` path re-renders the same way.

const OVERLAY_ATTR = 'data-vdg-overlay';

const _tracked = new Set(); // { el, dispose }

/// Register an already-mounted overlay WITHOUT displacing its siblings — a drawer and the confirm
/// dialog it opens are both live at once. `dispose` settles whatever the overlay owns (a pending
/// promise, a document-level listener) before the node goes. Returns an untrack thunk.
export function trackOverlay(el, dispose) {
  el.setAttribute(OVERLAY_ATTR, '');
  const entry = { el, dispose };
  _tracked.add(entry);
  return () => _tracked.delete(entry);
}

/// Mount an EXCLUSIVE overlay: ends any overlay already open, then appends. For modals.
export function mountOverlay(overlay, dispose) {
  closeRouteOverlays();
  const untrack = trackOverlay(overlay, dispose);
  document.body.appendChild(overlay);
  return untrack;
}

/// End every tracked overlay. Called from the route seam only — never from a timer.
export function closeRouteOverlays() {
  for (const entry of [..._tracked]) {
    _tracked.delete(entry);
    try {
      entry.dispose?.();
    } catch (err) {
      // A caller's teardown must never leave the user stranded on a half-rendered route.
      console.warn('[overlay] dispose failed:', err); // DEV
    }
    entry.el.remove();
  }
}
