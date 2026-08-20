// master-deduper — port: fuzzy name match for customer / carrier dedup. Near enough is a 'match'
// (merge silently), the middle band is 'ambiguous' (ask), beyond it is 'new'.

let _impl = null;

/// Root bootstrap binds { findMatch } once.
export function bindMasterDeduper(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/master-deduper: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (name, existing) -> { status: 'match'|'ambiguous'|'new', suggested_id?, similarity }
export const findMatch = (...a) => _i().findMatch(...a);
