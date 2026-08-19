// fsm-ingest.js — port: the fsm ingest use-case as its collaborators call it; the freight_app bootstrap binds
// the operator (operators/fsm-ingest.js) behind it. Constants and error shapes are contract and live here.

let _impl = null;

/// The operator registers { registerFsmEntity, rehydrateFsmStates, persistAdvancedState } once, from the freight_app bootstrap.
export function bindFsmIngest(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('freight_app/fsm-ingest: no operator bound (the freight_app bootstrap binds it)');
  return _impl;
}

export const registerFsmEntity = (...a) => _i().registerFsmEntity(...a);
export const rehydrateFsmStates = (...a) => _i().rehydrateFsmStates(...a);
export const persistAdvancedState = (...a) => _i().persistAdvancedState(...a);

/// Test seam.
export function _resetFsmIngest() { _impl = null; }
