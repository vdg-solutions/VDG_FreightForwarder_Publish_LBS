// output/web/js.tmp/implementations/kernel/core_abstractions/util/sw-update-guard.js
function shouldPromptUpdate({ hasWaiting, hasController }) {
  return !!hasWaiting && !!hasController;
}
var RELOAD_GUARD_KEY = "vdg.sw.reload.once";
function consumeReloadGuard(storage) {
  if (storage.getItem(RELOAD_GUARD_KEY)) return false;
  storage.setItem(RELOAD_GUARD_KEY, "1");
  return true;
}
function rearmReloadGuard(storage) {
  storage.removeItem(RELOAD_GUARD_KEY);
}

// output/web/js.tmp/bootstrap/sw-register.js
var UPDATE_DEBOUNCE_MS = 6e4;
var DUE_SOON_SYNC_TAG = "due-soon-check";
var PERIODIC_SYNC_MIN_INTERVAL_MS = 24 * 60 * 60 * 1e3;
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register(new URL("sw.js", document.baseURI).href).then((reg) => {
    _wireUpdateChecks(reg);
    _wireUpdatePrompt(reg);
    _wireDueSoonPeriodicSync(reg);
    _wireDueSoonBackgroundSync(reg);
  }).catch((err) => console.warn("[SW] registration failed:", err));
}
async function _wireDueSoonPeriodicSync(reg) {
  if (!("periodicSync" in reg)) return false;
  const status = await navigator.permissions.query({ name: "periodic-background-sync" }).catch(() => null);
  if (status?.state !== "granted") return false;
  try {
    await reg.periodicSync.register(DUE_SOON_SYNC_TAG, { minInterval: PERIODIC_SYNC_MIN_INTERVAL_MS });
    return true;
  } catch {
    return false;
  }
}
function _wireDueSoonBackgroundSync(reg) {
  if (!("sync" in reg)) return;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden") return;
    reg.sync.register(DUE_SOON_SYNC_TAG).catch(() => {
    });
  });
}
function _wireUpdatePrompt(reg) {
  const notify = () => {
    if (shouldPromptUpdate({ hasWaiting: !!reg.waiting, hasController: !!navigator.serviceWorker.controller })) {
      rearmReloadGuard(sessionStorage);
      window.dispatchEvent(new CustomEvent("vdg:sw-update-available"));
    }
  };
  if (shouldPromptUpdate({ hasWaiting: !!reg.waiting, hasController: !!navigator.serviceWorker.controller })) {
    rearmReloadGuard(sessionStorage);
    reg.waiting.postMessage({ type: "SKIP_WAITING" });
  }
  reg.addEventListener("updatefound", () => {
    const installing = reg.installing;
    if (!installing) return;
    installing.addEventListener("statechange", () => {
      if (installing.state === "installed") notify();
    });
  });
  window.addEventListener("vdg:sw-update-accept", () => {
    reg.waiting?.postMessage({ type: "SKIP_WAITING" });
  });
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (consumeReloadGuard(sessionStorage)) location.reload();
  });
}
function _wireUpdateChecks(reg) {
  let last = 0;
  const check = () => {
    if (document.visibilityState !== "visible") return;
    const now = Date.now();
    if (now - last < UPDATE_DEBOUNCE_MS) return;
    last = now;
    reg.update().catch(() => {
    });
  };
  document.addEventListener("visibilitychange", check);
  window.addEventListener("focus", check);
}
export {
  registerServiceWorker
};
