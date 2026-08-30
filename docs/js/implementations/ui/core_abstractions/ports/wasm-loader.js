// wasm-loader.js — ui port: on-demand wasm load (upload's Excel parse, the sales form's
// Section-A customer search wiring). Root bootstrap owns wasm loading (bootstrap/boot/wasm-loader.js);
// ui code cannot import root bootstrap directly (no upward dependency), so it calls this port
// instead — compose-ui/platform.js binds it once the app boots.

let _impl = null;

/// The adapter registers { loadWasm } once, from compose-ui/platform.js.
export function bindWasmLoader(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/wasm-loader: no adapter bound (compose-ui binds it)');
  return _impl;
}

/// () -> Promise<wasm module | null>
export const loadWasm = (...a) => _i().loadWasm(...a);

/// Test seam.
export function _resetWasmLoader() { _impl = null; }
