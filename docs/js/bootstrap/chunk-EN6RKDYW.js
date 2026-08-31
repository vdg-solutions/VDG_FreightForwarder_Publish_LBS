// output/web/js.tmp/implementations/ui/bootstrap/util/view-mounted.js
function isMountedRoute(ownRoute) {
  return (location.hash.slice(1).split("?")[0] || "") === ownRoute;
}

export {
  isMountedRoute
};
