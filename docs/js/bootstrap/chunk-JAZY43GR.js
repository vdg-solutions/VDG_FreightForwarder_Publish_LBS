// output/web/js.tmp/implementations/kernel/core_abstractions/ports/timer.js
var _impl = null;
function bindTimer(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("kernel/timer: no adapter bound (the kernel bootstrap binds it)");
  return _impl;
}
var startTimer = (...a) => _i().startTimer(...a);
var stopTimer = (...a) => _i().stopTimer(...a);
var startInterval = (...a) => _i().startInterval(...a);
var stopInterval = (...a) => _i().stopInterval(...a);

// output/web/js.tmp/implementations/kernel/core_abstractions/ports/log.js
var _impl2 = null;
function bindLog(impl) {
  _impl2 = impl;
}
function _i2() {
  if (!_impl2) throw new Error("kernel/log: no adapter bound (the kernel bootstrap binds it)");
  return _impl2;
}
var logWarn = (...a) => _i2().warn(...a);

// output/web/js.tmp/implementations/kernel/core_abstractions/util/safe-await.js
var SAFE_AWAIT_DEFAULT_MS = 8e3;
var NOOP_FALLBACK = () => {
};
var TIMEOUT_SENTINEL = /* @__PURE__ */ Symbol("safeAwaitTimeout");
var SafeAwaitTimeoutError = class extends Error {
  constructor(tag, timeoutMs) {
    super(`SafeAwaitTimeout:${tag}`);
    this.name = "SafeAwaitTimeoutError";
    this.tag = tag;
    this.timeoutMs = timeoutMs;
  }
};
async function safeAwait(promise, timeoutMs = SAFE_AWAIT_DEFAULT_MS, fallback = NOOP_FALLBACK, tag = "unknown") {
  let timer;
  const timeoutPromise = new Promise((resolve) => {
    timer = startTimer(() => resolve(TIMEOUT_SENTINEL), timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (result === TIMEOUT_SENTINEL) {
      logWarn(`[safe-await:${tag}] timeout ${timeoutMs}ms`);
      try {
        (fallback ?? NOOP_FALLBACK)();
      } catch {
      }
      return { ok: false, error: new SafeAwaitTimeoutError(tag, timeoutMs) };
    }
    return { ok: true, value: result };
  } catch (err) {
    return { ok: false, error: err };
  } finally {
    stopTimer(timer);
  }
}

export {
  bindTimer,
  startInterval,
  stopInterval,
  bindLog,
  SAFE_AWAIT_DEFAULT_MS,
  SafeAwaitTimeoutError,
  safeAwait
};
