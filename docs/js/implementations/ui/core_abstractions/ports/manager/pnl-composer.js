// pnl-composer — port: the P&L pivot as the report view calls it. The root bootstrap binds it to
// the wasm freight_app exports; the ui never sees wasm.

export const BASE_CURRENCY        = 'VND';
export const PNL_DEFAULT_ROW_DIMS = ['period', 'sales_rep'];
export const DIM_OPTIONS = ['period', 'sales_rep', 'customer', 'trade_lane', 'container_type', 'carrier'];

let _impl = null;

/// Root bootstrap binds { compose, composeBuySellBreakdown, filterByDims } once.
export function bindPnlComposer(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/pnl-composer: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// ({ shipments, pnlLines, period, dims }) -> { rows, grandTotals, groupedShipments }
export const compose = (...a) => _i().compose(...a);
/// (pnlLines, refs) -> [{ kind, buy_vnd, sell_vnd, margin_vnd, margin_pct }]
export const composeBuySellBreakdown = (...a) => _i().composeBuySellBreakdown(...a);
/// (shipments, rowDims) -> the drill set behind one pivot row
export const filterByDims = (...a) => _i().filterByDims(...a);
