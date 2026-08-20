// fsm-ingest — port: registering a shipment into the FSM state map, rehydrating the map after a
// reload, and mirroring an advance back into the record of truth.

let _impl = null;

/// Root bootstrap binds { registerFsmEntity, rehydrateFsmStates, persistAdvancedState } once.
export function bindFsmIngest(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/fsm-ingest: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (ref, state) -> registered (register-if-absent; never regresses an advanced state)
export const registerFsmEntity = (...a) => _i().registerFsmEntity(...a);
/// (repo) -> sweeps every stored shipment back into the state map
export const rehydrateFsmStates = (...a) => _i().rehydrateFsmStates(...a);
/// (repo, ref, state) -> writes the state onto the record and announces the change
export const persistAdvancedState = (...a) => _i().persistAdvancedState(...a);
