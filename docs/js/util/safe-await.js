// F-19-01 — safe-await: timeout-wrapped promise helper. Eradicates silent-hang boot chains.
// Usage: const { ok, value, error } = await safeAwait(promise, ms, fallback, tag)

export const SAFE_AWAIT_DEFAULT_MS = 8000; // matches REPO_INIT_TIMEOUT_MS (F-15-51)

const NOOP_FALLBACK = () => {};

// Sentinel: private Symbol avoids any collision with real resolved values
const TIMEOUT_SENTINEL = Symbol('safeAwaitTimeout');

export class SafeAwaitTimeoutError extends Error {
  constructor(tag, timeoutMs) {
    super(`SafeAwaitTimeout:${tag}`);
    this.name      = 'SafeAwaitTimeoutError';
    this.tag       = tag;
    this.timeoutMs = timeoutMs;
  }
}

// Wrap a promise with a named timeout. Always resolves (never throws).
//   promise   — the async op to race
//   timeoutMs — ms before giving up (default 8000)
//   fallback  — optional fn called once on timeout; errors inside are swallowed
//   tag       — identifies the call site in console.warn for triage
//
// Returns:
//   { ok: true,  value }   — promise settled before timeout
//   { ok: false, error }   — timeout (SafeAwaitTimeoutError) or rejection
export async function safeAwait(
  promise,
  timeoutMs = SAFE_AWAIT_DEFAULT_MS,
  fallback  = NOOP_FALLBACK,
  tag       = 'unknown',
) {
  let timer;
  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => resolve(TIMEOUT_SENTINEL), timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);

    if (result === TIMEOUT_SENTINEL) {
      console.warn(`[safe-await:${tag}] timeout ${timeoutMs}ms`); // DEV
      try { (fallback ?? NOOP_FALLBACK)(); } catch { /* fallback errors swallowed — caller controls */ }
      return { ok: false, error: new SafeAwaitTimeoutError(tag, timeoutMs) };
    }

    return { ok: true, value: result };
  } catch (err) {
    return { ok: false, error: err };
  } finally {
    clearTimeout(timer);
  }
}
