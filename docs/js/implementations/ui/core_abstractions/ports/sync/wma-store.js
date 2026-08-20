// wma-store — port: WMA state per (rep_id, row_idx). Same names and signatures the form has
// always called. The `store` argument is kept for call-site parity; the transport now reaches
// the same SQLite store through the platform.

let _impl = null;

/// Root bootstrap binds { loadKindWmaState, saveKindWmaState } once.
export function bindWmaStore(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/wma-store: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (store, repId, rowIdx) -> Promise<state> — fresh state when the pair was never seen
export const loadKindWmaState = (...a) => _i().loadKindWmaState(...a);
/// (store, repId, rowIdx, state) -> Promise<void> — best-effort, never blocks the form
export const saveKindWmaState = (...a) => _i().saveKindWmaState(...a);
