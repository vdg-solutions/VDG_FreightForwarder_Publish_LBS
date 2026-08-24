// output/web/js.tmp/implementations/ui/bootstrap/router.js
var NAV_EVENT = "vdg:navigate";
var EMPTY_HASH_VALUES = ["", "#", "#/"];
var AUTH_STALE_SELECTOR = "[data-auth-stale]";
function initRouter(defaultRoute) {
  if (EMPTY_HASH_VALUES.includes(location.hash)) {
    history.replaceState(null, "", "#" + defaultRoute);
  }
  window.addEventListener("hashchange", () => {
    const route = location.hash.slice(1) || defaultRoute;
    dispatch(route);
  });
  window.addEventListener("vdg:auth-reconnected", () => {
    if (document.querySelector(AUTH_STALE_SELECTOR)) {
      dispatch(location.hash.slice(1) || defaultRoute);
    }
  });
  queueMicrotask(() => dispatch(location.hash.slice(1) || defaultRoute));
}
function navigate(route) {
  if (location.hash.slice(1) === route) {
    dispatch(route);
    return;
  }
  location.hash = route;
}
function dispatch(route) {
  window.dispatchEvent(new CustomEvent(NAV_EVENT, { detail: { route } }));
}

export {
  initRouter,
  navigate
};
