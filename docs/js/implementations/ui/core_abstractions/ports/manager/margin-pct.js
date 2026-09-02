// margin-pct — port: the one margin-percent convention, answered by wasm.
//
// Three views used to carry their own `margin / revenue * 100`, and they disagreed on the case
// that decides whether the figure appears at all: at zero revenue pivot-table answered 0,
// finance-dashboard answered null, and sales-new-form rendered nothing. wasm
// (`manager_rules::margin_pct`) has always answered 0. A percentage a manager reads off two
// screens must not depend on which screen did the arithmetic.
//
// Synchronous on purpose: it is called per rendered row, and an async hop per cell would trade a
// correctness fix for a visible one.

let _impl = null;

/// Root bootstrap binds { marginPct } once.
export function bindMarginPct(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/margin-pct: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (margin, revenue) -> percent. Zero or negative revenue is 0, not null and not blank.
export const marginPct = (...a) => _i().marginPct(...a);
