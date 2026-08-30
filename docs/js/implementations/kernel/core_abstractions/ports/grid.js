// grid.js — port: the data-grid library the host page loads (ag-grid-community, a global script,
// not a module import). The kernel bootstrap binds the browser adapter; core keeps only the
// locale table it hands the grid, never the mounting.

let _impl = null;

/// The adapter registers { create } once, from the kernel bootstrap.
export function bindGrid(impl) { _impl = impl; }

/// (container, options) -> the grid api.
export function createGrid(container, options) {
  if (!_impl) throw new Error('kernel/grid: no adapter bound (the kernel bootstrap binds it)');
  return _impl.create(container, options);
}

/// Test seam.
export function _resetGrid() { _impl = null; }
