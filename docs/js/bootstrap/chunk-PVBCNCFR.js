// output/web/js.tmp/implementations/ui/bootstrap/helpers/mount-overlay.js
var OVERLAY_ATTR = "data-vdg-overlay";
var _tracked = /* @__PURE__ */ new Set();
function trackOverlay(el, dispose) {
  el.setAttribute(OVERLAY_ATTR, "");
  const entry = { el, dispose };
  _tracked.add(entry);
  return () => _tracked.delete(entry);
}
function mountOverlay(overlay, dispose) {
  closeRouteOverlays();
  const untrack = trackOverlay(overlay, dispose);
  document.body.appendChild(overlay);
  return untrack;
}
function closeRouteOverlays() {
  for (const entry of [..._tracked]) {
    _tracked.delete(entry);
    try {
      entry.dispose?.();
    } catch (err) {
      console.warn("[overlay] dispose failed:", err);
    }
    entry.el.remove();
  }
}

export {
  trackOverlay,
  mountOverlay,
  closeRouteOverlays
};
