// view-root.js — latest-wins view mount seam (F-19-16).
// Each navigation swaps #view-root for a fresh empty element with the same id/classes, so a
// superseded render's captured node reference is detached and its late innerHTML write is a no-op.
// Element identity is the generation token: only the newest element stays attached as #view-root.
const VIEW_ROOT_ID = 'view-root';

// F-19-72 AC-05: same-route supersession — a mount timeout paints the shell fallback into the
// STILL-ATTACHED root (no navigation happened, so freshViewRoot's detach never fires); a bare
// root.isConnected check doesn't catch that case. Additive registry: mountView marks a root on
// timeout, views check it before writing root.innerHTML.
const _superseded = new WeakSet();

export function markViewSuperseded(root) { if (root) _superseded.add(root); }
export function isViewSuperseded(root)   { return !root || _superseded.has(root) || root.isConnected === false; }

export function freshViewRoot() {
  const current = document.getElementById(VIEW_ROOT_ID);
  const fresh   = current.cloneNode(false);   // same tag + id + classes, no children
  markViewSuperseded(current);                // belt-and-suspenders — navigation already detaches
  current.removeAttribute('id');              // superseded writers can no longer resolve #view-root
  current.replaceWith(fresh);
  return fresh;
}
