// commission-composer — port: the commission_rules master, keyed by the sales id it assigns.

let _impl = null;

/// Root bootstrap binds { compose } once.
export function bindCommissionComposer(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/commission-composer: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (repo) -> { rules } — the repo argument is kept for call-site compatibility; the use-case
/// reads the master through its own records port.
export const compose = (...a) => _i().compose(...a);
