// Single service-worker registration + update lifecycle. Base-path-aware: resolves sw.js
// against document.baseURI, and the worker is served from the deploy BASE ROOT (not /js/)
// so its default scope is the base path and it actually controls the app document. A worker
// under /js/ scopes to /js/ and never controls the page (controller stays null). Exactly one
// register() call in the app — app.js and index.html defer to this.

import { shouldPromptUpdate, consumeReloadGuard, rearmReloadGuard } from './util/sw-update-guard.js';

const UPDATE_DEBOUNCE_MS = 60_000;   // don't spam update() on rapid tab switches
const DUE_SOON_SYNC_TAG  = 'due-soon-check';
// Minimum request only — Chromium decides real cadence, not a schedule.
const PERIODIC_SYNC_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  // Root-relative 'sw.js' (against document.baseURI) → served from the base path, so scope
  // defaults to the base path and covers the document. No explicit scope: the script location
  // sets it correctly; a hand-built scope would risk being wrong under the deploy subpath.
  navigator.serviceWorker.register(new URL('sw.js', document.baseURI).href)
    .then((reg) => {
      _wireUpdateChecks(reg); _wireUpdatePrompt(reg);
      _wireDueSoonPeriodicSync(reg); _wireDueSoonBackgroundSync(reg);
    })
    .catch((err) => console.warn('[SW] registration failed:', err)); // DEV
}

// F-48-01 Tier 1 — best case: notifies while the tab is fully closed. Requires Chromium +
// an installed PWA (F-54, nice-to-have — not a prerequisite for F-48-01) + the
// periodic-background-sync permission actually granted. Any unmet precondition silently
// falls to tier 2/3/4 — this is never a hard failure.
async function _wireDueSoonPeriodicSync(reg) {
  if (!('periodicSync' in reg)) return false;                              // → fall to tier 2
  const status = await navigator.permissions.query({ name: 'periodic-background-sync' }).catch(() => null);
  if (status?.state !== 'granted') return false;                           // not installed (pre-F-54) → fall to tier 2
  try {
    await reg.periodicSync.register(DUE_SOON_SYNC_TAG, { minInterval: PERIODIC_SYNC_MIN_INTERVAL_MS });
    return true;
  } catch { return false; }                                                // low engagement heuristic etc — fall to tier 2
}

// F-48-01 Tier 2(b) — opportunistic one-off Background Sync (Chromium-only, no PWA install
// or PBS permission needed). Requested when the tab goes hidden — closer to true
// opportunistic background firing than the message-relay alone (tier 2(a), wired from the
// main-thread due-soon-checker.js tick).
function _wireDueSoonBackgroundSync(reg) {
  if (!('sync' in reg)) return;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    reg.sync.register(DUE_SOON_SYNC_TAG).catch(() => { /* opportunistic request — unsupported/denied is silent, no user-facing effect */ });
  });
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

  // A worker already waiting at registration has nothing to interrupt — the document just
  // booted, no mid-edit state for the reload to lose (the risk F-44-01's banner exists for).
  // Take it live NOW instead of parking behind a banner the user may never click, which is what
  // lets a stale/poisoned worker keep controlling the tab across deploys (the manual-Unregister
  // trap). A worker that becomes ready DURING the session still goes through notify()'s banner.
  if (shouldPromptUpdate({ hasWaiting: !!reg.waiting, hasController: !!navigator.serviceWorker.controller })) {
    rearmReloadGuard(sessionStorage);            // fresh cycle — allow the post-activation reload
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
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
