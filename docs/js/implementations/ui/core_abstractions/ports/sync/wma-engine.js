// wma-engine — port: the kind-prediction math the P&L line form drives. Same names and
// signatures the form has always called; the rules live in Rust (core_abstractions/wma_engine.rs).
// `state` is mutated in place, as before — the caller holds it and saves it.

let _impl = null;

/// Root bootstrap binds { predict, onEvent, dismissPrediction } once.
export function bindWmaEngine(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/wma-engine: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (state, descriptionText, classifyKindFn) -> kind | null
export const predict = (...a) => _i().predict(...a);
/// (state, observed, predicted) — learn from one commit
export const onEvent = (...a) => _i().onEvent(...a);
/// (state, predictedKind) — badge dismissed
export const dismissPrediction = (...a) => _i().dismissPrediction(...a);
