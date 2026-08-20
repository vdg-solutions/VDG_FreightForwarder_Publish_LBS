// air-pnl-composer — port: the chargeable-weight P&L (F-16-07) as the report view calls it.

export const AIR_DEFAULT_DIMS = ['route_lane', 'carrier_iata'];

let _impl = null;

/// Root bootstrap binds { composeAir } once.
export function bindAirPnlComposer(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/air-pnl-composer: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// ({ shipments, pnlLines, dims }) -> { rows, grandTotals }
export const composeAir = (...a) => _i().composeAir(...a);
