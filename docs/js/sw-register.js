// Single service-worker registration + update lifecycle. Base-path-aware: resolves sw.js
// against document.baseURI, and the worker is served from the deploy BASE ROOT (not /js/)
// so its default scope is the base path and it actually controls the app document. A worker
// under /js/ scopes to /js/ and never controls the page (controller stays null). Exactly one
// register() call in the app — app.js and index.html defer to this.

import { shouldPromptUpdate, consumeReloadGuard, rearmReloadGuard } from './util/sw-update-guard.js';

const UPDATE_DEBOUNCE_MS = 60_000;   // don't spam update() on rapid tab switches

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  // Root-relative 'sw.js' (against document.baseURI) → served from the base path, so scope
  // defaults to the base path and covers the document. No explicit scope: the script location
  // sets it correctly; a hand-built scope would risk being wrong under the deploy subpath.
  navigator.serviceWorker.register(new URL('sw.js', document.baseURI).href)
    .then((reg) => { _wireUpdateChecks(reg); _wireUpdatePrompt(reg); })
    .catch((err) => console.warn('[SW] registration failed:', err)); // DEV
}

// User-triggered update prompt: detect a genuine waiting worker (not first install), let
// the banner ask the user, and reload once the new worker actually takes control. Never
// auto-skipWaiting — SKIP_WAITING is sent only from the user's explicit banner click.
function _wireUpdatePrompt(reg) {
  const notify = () => {
    if (shouldPromptUpdate({ hasWaiting: !!reg.waiting, hasController: !!navigator.serviceWorker.controller })) {
      rearmReloadGuard(sessionStorage);          // a fresh update cycle — allow one more reload
      window.dispatchEvent(new CustomEvent('vdg:sw-update-available'));
    }
  };

  if (reg.waiting) notify();                     // a worker was already waiting when we registered
  reg.addEventListener('updatefound', () => {
    const installing = reg.installing;
    if (!installing) return;
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed') notify();
    });
  });

  window.addEventListener('vdg:sw-update-accept', () => {
    reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (consumeReloadGuard(sessionStorage)) location.reload();
  });
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
