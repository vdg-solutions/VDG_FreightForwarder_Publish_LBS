// master-repo — port: one row of one master table, as the master screens call it.
//
// The screens used to reach `repo.put(KIND, entity.id, entity)` directly, which made the view the
// place that named the collection, minted the key and decided the row shape. Two of those three
// are the registry's (freight_app core_abstractions/master_registry.rs) and always were — which is
// how `shipment-states.js` came to key on `u.code` while its thirteen siblings keyed on
// `entity.id`, with the difference recorded nowhere but in the one call site that got it right.
//
// The caller names the KIND. Everything else — the key field, who may write, the stored shape —
// is answered by the registry inside wasm.

let _impl = null;

/// Root bootstrap binds { saveMaster, listMasters, getMaster, deleteMaster } once.
export function bindMasterRepo(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/master-repo: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (kind, entity) -> the stored row. Throws when the kind is unregistered, the declared key field
/// is empty, or the signed-in role is not one of the kind's writers.
export const saveMaster = (...a) => _i().saveMaster(...a);
/// (kind) -> rows. Throws on an UNDECIDABLE read — an outage must never arrive as an empty table.
export const listMasters = (...a) => _i().listMasters(...a);
/// (kind, id) -> the row, or null when there is no such row (an answer, not a failure).
export const getMaster = (...a) => _i().getMaster(...a);
/// (kind, id) -> true once removed. Throws when the kind is unregistered or the signed-in role is
/// not one of its writers — the same gate `saveMaster` takes, because deleting is a write. The
/// screens used to call the platform's generic `repo.delete(KIND, id)`, which asked neither.
export const deleteMaster = (...a) => _i().deleteMaster(...a);
