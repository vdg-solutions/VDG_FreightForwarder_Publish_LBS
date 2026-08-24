// output/web/js.tmp/implementations/ui/bootstrap/util/view-root.js
var VIEW_ROOT_ID = "view-root";
var _superseded = /* @__PURE__ */ new WeakSet();
function markViewSuperseded(root) {
  if (root) _superseded.add(root);
}
function isViewSuperseded(root) {
  return !root || _superseded.has(root) || root.isConnected === false;
}
function freshViewRoot() {
  const current = document.getElementById(VIEW_ROOT_ID);
  const fresh = current.cloneNode(false);
  markViewSuperseded(current);
  current.removeAttribute("id");
  current.replaceWith(fresh);
  return fresh;
}

export {
  markViewSuperseded,
  isViewSuperseded,
  freshViewRoot
};
