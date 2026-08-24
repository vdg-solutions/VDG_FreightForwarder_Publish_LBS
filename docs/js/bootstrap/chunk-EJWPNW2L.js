// output/web/js.tmp/implementations/ui/core_abstractions/ports/wasm-loader.js
var _impl = null;
function bindWasmLoader(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/wasm-loader: no adapter bound (compose-ui binds it)");
  return _impl;
}
var loadWasm = (...a) => _i().loadWasm(...a);

export {
  bindWasmLoader,
  loadWasm
};
