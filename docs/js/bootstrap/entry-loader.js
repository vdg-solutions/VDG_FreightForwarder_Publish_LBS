// entry-loader.js — index.html's bootstrapper for the app.js entry module. Deliberately kept
// OUTSIDE app.js's own module graph (no shared imports with it): a STATIC import failing
// anywhere in that graph — app.js's own code, or a chunk esbuild splits out and shares between
// dynamically-imported views, e.g. a GitHub Pages deploy-window 503 — fails the WHOLE graph
// atomically before a single line of app.js runs. No try/catch inside app.js can ever see that.
// The one seam that can: a <script type="module"> fires an `error` event on the element itself
// when it — or anything it statically imports — fails to load.
//
// A failed module URL is poisoned in this Document's module map for the rest of the page's life
// (the HTML spec's "fetch a single module script" returns the cached failed entry instead of
// re-fetching), so re-mounting a <script> pointed at the SAME import graph cannot force a real
// network retry of a chunk that already failed — only a fresh navigation clears the module map.
// That is why the one automatic "retry" here is a bounded, one-shot RELOAD after a short backoff
// (long enough for a mid-flight deploy to finish propagating), guarded so a genuinely broken
// build gets ONE reload, never a loop.

const RELOAD_GUARD_KEY = 'vdg.entry.reload.once';
const RETRY_DELAY_MS   = 1200; // mirrors view-loader.js's VIEW_LOAD_RETRY_DELAY_MS

// The actionable text lives as plain, pre-rendered Vietnamese markup in index.html itself
// (#entry-load-failed), NOT as a string built here — two reasons: (1) this recovery layer must
// have zero import-time dependencies of its own, including the app's i18n module, since it
// exists to survive exactly the case where that module failed to load too; (2) this repo's
// i18n-completeness gate hard-fails on a literal Vietnamese string inside frontend/js/**, so a
// hardcoded-VN fallback could not live in this file even if it were otherwise desirable. The
// markup's wording is hand-mirrored from view_mount_failed_network / view_mount_reload in
// vi.json — keep them in sync by eye if that copy changes.

function bootMount(doc) {
  return doc.getElementById('entry-load-failed');
}

// Deliberately NOT imported from view-fallback.js's healOrReloadViaServiceWorker — that file is
// part of app.js's own graph, i.e. exactly the thing that may have just failed to load. This
// recovery layer must not be able to fail for the same reason it exists, so the same few lines
// are reproduced here rather than shared.
async function healOrReload() {
  const reg = await navigator.serviceWorker?.getRegistration?.().catch(() => null);
  if (reg?.waiting) window.dispatchEvent(new CustomEvent('vdg:sw-update-accept'));
  else location.reload();
}

function renderEntryLoadFailed(doc) {
  const loading = doc.getElementById('view-loading');
  if (loading) loading.hidden = true;
  const banner = bootMount(doc);
  if (!banner) return;
  banner.hidden = false;
  banner.querySelector('#entry-reload-btn')?.addEventListener('click', healOrReload);
}

/**
 * @param {{getItem,setItem,removeItem}}   storage        — sessionStorage in prod, a fake in tests
 * @param {Document}                       doc            — document in prod, a fake in tests
 * @param {(ms:number, fn:()=>void)=>void} scheduleReload — injectable timer (unit-test seam)
 * @param {() => void}                     doReload       — injectable reload trigger (unit-test seam)
 * @param {(doc) => void}                  onGiveUp       — injectable renderer (unit-test seam)
 */
export function handleEntryLoadError(
  storage,
  doc            = document,
  scheduleReload = (ms, fn) => setTimeout(fn, ms),
  doReload       = () => location.reload(),
  onGiveUp       = renderEntryLoadFailed,
) {
  if (storage.getItem(RELOAD_GUARD_KEY)) {
    // Already spent this cycle's one automatic reload and it failed again right after — a
    // genuine break, not a deploy window. Stop here: failing loudly beats looping.
    storage.removeItem(RELOAD_GUARD_KEY);
    onGiveUp(doc);
    return;
  }
  storage.setItem(RELOAD_GUARD_KEY, '1');
  scheduleReload(RETRY_DELAY_MS, doReload);
}

export function wireEntryLoad(doc, src, storage = sessionStorage) {
  const s = doc.createElement('script');
  s.type = 'module';
  s.addEventListener('error', () => handleEntryLoadError(storage, doc), { once: true });
  // A later, genuinely separate deploy-window failure in the same long-lived tab still gets its
  // own automatic reload — mirrors sw-update-guard.js's rearmReloadGuard.
  s.addEventListener('load', () => storage.removeItem(RELOAD_GUARD_KEY), { once: true });
  s.src = src;
  doc.body.appendChild(s);
}
