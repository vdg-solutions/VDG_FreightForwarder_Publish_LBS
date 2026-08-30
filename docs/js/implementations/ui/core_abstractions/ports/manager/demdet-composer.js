// demdet-composer — port: the DEM/DET monitor's compute (F-06-07). Every derivation (free-time
// remaining, accrual, the four KPI totals) lives in wasm; this file is the seam the bootstrap
// binds an implementation onto.

let _impl = null;

/// Root bootstrap binds { overview } once.
export function bindDemDetComposer(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/demdet-composer: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (instances) -> { rows, kpis } — rows carry the clock/accrual read per container, kpis are the
/// four dashboard cards.
export const composeOverview = (...a) => _i().overview(...a);
