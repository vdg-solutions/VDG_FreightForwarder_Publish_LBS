const NAV_EVENT         = 'vdg:navigate';
// Hash values that should resolve to the caller-supplied defaultRoute.
// '#/' is included: `.slice(1)` of '#/' is '/', which matches no view.
const EMPTY_HASH_VALUES = ['', '#', '#/'];
// A view that rendered its signed-out/expired branch stamps this attribute on the message. After
// a chip reconnect re-hydrates the session, the route is re-dispatched so the view renders live —
// but ONLY when the marker is present: a form mid-edit must never be clobbered by a reconnect.
const AUTH_STALE_SELECTOR = '[data-auth-stale]';

export function initRouter(defaultRoute) {
  if (EMPTY_HASH_VALUES.includes(location.hash)) {
    // replaceState — no push, so Back doesn't bounce to the empty URL
    history.replaceState(null, '', '#' + defaultRoute);
  }
  window.addEventListener('hashchange', () => {
    const route = location.hash.slice(1) || defaultRoute;
    dispatch(route);
  });
  window.addEventListener('vdg:auth-reconnected', () => {
    if (document.querySelector(AUTH_STALE_SELECTOR)) {
      dispatch(location.hash.slice(1) || defaultRoute);
    }
  });
  queueMicrotask(() => dispatch(location.hash.slice(1) || defaultRoute));
}

export function navigate(route) {
  if (location.hash.slice(1) === route) {
    dispatch(route);
    return;
  }
  location.hash = route;
}

function dispatch(route) {
  window.dispatchEvent(new CustomEvent(NAV_EVENT, { detail: { route } }));
}
