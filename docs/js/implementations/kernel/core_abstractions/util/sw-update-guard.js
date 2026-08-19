// Pure decision helpers for the SW update-available prompt. No DOM/SW access — callers
// pass plain booleans / a storage-like object so this stays unit-testable without mocking
// ServiceWorkerRegistration or sessionStorage.

// True only for a genuine update: a worker is waiting AND a controller already existed
// (i.e. NOT the first-ever install, which has no controller yet).
export function shouldPromptUpdate({ hasWaiting, hasController }) {
  return !!hasWaiting && !!hasController;
}

// One-shot guard so a controllerchange fired twice in quick succession (browser race, or a
// flaky second activation right after the reload navigation starts) only reloads once.
// `storage` is anything with getItem/setItem/removeItem (sessionStorage in prod, a plain
// object fake in tests).
const RELOAD_GUARD_KEY = 'vdg.sw.reload.once';

export function consumeReloadGuard(storage) {
  if (storage.getItem(RELOAD_GUARD_KEY)) return false; // already consumed this cycle
  storage.setItem(RELOAD_GUARD_KEY, '1');
  return true;
}

// Re-armed the next time a NEW waiting worker is detected (see sw-register.js), so a later,
// genuinely separate deploy in the same tab session can still prompt+reload.
export function rearmReloadGuard(storage) {
  storage.removeItem(RELOAD_GUARD_KEY);
}
