// fsm-ingest — port: the two lawful ways a shipment's state changes. Both re-read the record
// inside FsmIngest and refuse to write if it moved underneath — see fsm_ingest.rs (ADO #120).

let _impl = null;

/// Root bootstrap binds { applyShipmentEvent, moveShipmentTo } once.
export function bindFsmIngest(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/fsm-ingest: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (repo, ref, event) -> { ok, state } | { ok: false, error } — the manual "advance" button.
export const applyShipmentEvent = (...a) => _i().applyShipmentEvent(...a);
/// (repo, ref, toState) -> { ok, state } | { ok: false, error } — the kanban drag move.
export const moveShipmentTo = (...a) => _i().moveShipmentTo(...a);
