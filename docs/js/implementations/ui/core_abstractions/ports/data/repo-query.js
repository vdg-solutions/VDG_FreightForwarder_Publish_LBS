// repo-query — port: a filtered read of one kind.
//
// `WasmEntityRepo.list` is a wasm-bindgen export taking ONE argument, and five call sites passed a
// second one — a JS predicate — which wasm-bindgen dropped without a word, so every one of them
// silently received the WHOLE table (E-43). Measured live: `repo.list('shipment', () => false)`
// returned all 7 rows. The screens ask through this port instead, and the predicate is applied
// where it is actually a function.

let _impl = null;

/// Root bootstrap binds { listWhere } once.
export function bindRepoQuery(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/repo-query: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (repo, kind, predicate?) -> rows. A null/absent predicate returns everything.
export const listWhere = (...a) => _i().listWhere(...a);
