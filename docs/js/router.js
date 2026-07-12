const NAV_EVENT         = 'vdg:navigate';
// Hash values that should resolve to the caller-supplied defaultRoute.
// '#/' is included: `.slice(1)` of '#/' is '/', which matches no view.
const EMPTY_HASH_VALUES = ['', '#', '#/'];

export function initRouter(defaultRoute) {
  if (EMPTY_HASH_VALUES.includes(location.hash)) {
    // replaceState — no push, so Back doesn't bounce to the empty URL
    history.replaceState(null, '', '#' + defaultRoute);
  }
  window.addEventListener('hashchange', () => {
    const route = location.hash.slice(1) || defaultRoute;
    dispatch(route);
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
