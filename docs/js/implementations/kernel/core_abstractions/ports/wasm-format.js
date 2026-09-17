// wasm-format.js — port: the display formatters Rust owns (fmt_date_display /
// fmt_date_pattern_hint, js_bridge.rs). The kernel bootstrap binds the browser adapter that
// actually reaches the wasm exports; core only calls through this door, so no core module holds
// tech. Unbound is a normal state, not an error: these are read during boot before wasm is up,
// and both callers already carry a documented fallback for exactly that moment.

let _impl = null;

/// The adapter registers { dateDisplay, datePatternHint, stampDisplay } once, from the kernel
/// bootstrap.
export function bindWasmFormat(impl) { _impl = impl; }

/// (iso) -> formatted date, or null when wasm has not been bound/loaded yet.
export function dateDisplay(iso) { return _impl?.dateDisplay(iso) ?? null; }
/// () -> the literal pattern (e.g. "dd/mm/yyyy"), or null before wasm is up.
export function datePatternHint() { return _impl?.datePatternHint() ?? null; }
/// (iso) -> a stored UTC instant on the reader's clock, or null before wasm is up. The adapter
/// states the zone; this side never converts one.
export function stampDisplay(iso) { return _impl?.stampDisplay(iso) ?? null; }

/// Test seam.
export function _resetWasmFormat() { _impl = null; }
