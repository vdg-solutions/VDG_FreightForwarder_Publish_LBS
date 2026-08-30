// output/web/js.tmp/implementations/kernel/core_abstractions/ports/grid.js
var _impl = null;
function bindGrid(impl) {
  _impl = impl;
}
function createGrid(container, options) {
  if (!_impl) throw new Error("kernel/grid: no adapter bound (the kernel bootstrap binds it)");
  return _impl.create(container, options);
}

export {
  bindGrid,
  createGrid
};
