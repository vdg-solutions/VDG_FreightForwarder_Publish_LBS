// self-approved-composer — port: the period-close self-approved decisions review
// (authorization-model.md §4) — a pure filter over the decisions the screen already listed.

let _impl = null;

/// Root bootstrap binds { compose } once.
export function bindSelfApprovedComposer(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/self-approved-composer: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (decisions, { period, from, to }) -> rows, newest first
export const compose = (...a) => _i().compose(...a);
