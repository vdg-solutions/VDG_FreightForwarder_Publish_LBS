// Single service-worker registration + update lifecycle. Base-path-aware: resolves sw.js
// against document.baseURI, and the worker is served from the deploy BASE ROOT (not /js/)
// so its default scope is the base path and it actually controls the app document. A worker
// under /js/ scopes to /js/ and never controls the page (controller stays null). Exactly one
// register() call in the app — app.js and index.html defer to this.

const UPDATE_DEBOUNCE_MS = 60_000;   // don't spam update() on rapid tab switches

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  // Auto-reload once when a freshly-activated SW takes control — only if a controller
  // already existed (skip first-ever load so a fresh visit isn't reloaded). Guarded
  // against reload loops.
  if (navigator.serviceWorker.controller) {
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      location.reload();
    });
  }

  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type === 'VDG_SW_UPDATE_AVAILABLE')
      window.dispatchEvent(new CustomEvent('vdg:sw-update-available'));
  });

  // Root-relative 'sw.js' (against document.baseURI) → served from the base path, so scope
  // defaults to the base path and covers the document. No explicit scope: the script location
  // sets it correctly; a hand-built scope would risk being wrong under the deploy subpath.
  navigator.serviceWorker.register(new URL('sw.js', document.baseURI).href)
    .then(_wireUpdateChecks)
    .catch((err) => console.warn('[SW] registration failed:', err)); // DEV
}

// Force an update check when the user returns to the tab. The spec's implicit per-navigation
// check never fires for an SPA tab left open across a deploy, so a redeploy would otherwise
// go unnoticed until a hard reload. Debounced against rapid focus/visibility churn.
function _wireUpdateChecks(reg) {
  let last = 0;
  const check = () => {
    if (document.visibilityState !== 'visible') return;
    const now = Date.now();
    if (now - last < UPDATE_DEBOUNCE_MS) return;
    last = now;
    reg.update().catch(() => { /* offline — nothing to update, ignore */ });
  };
  document.addEventListener('visibilitychange', check);
  window.addEventListener('focus', check);
}
