// dashboard-composer — port: the manager dashboard roll-up.

export const LAYOUT_DEBOUNCE_MS = 500;
export const ACTIVITY_FEED_MAX  = 20;
export const TOP_CUSTOMERS_MAX  = 10;

let _impl = null;

/// Root bootstrap binds { compose } once.
export function bindDashboardComposer(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/dashboard-composer: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (repo, period, salesFilter, mode) -> { kpis, leaderboard, topCustomers, heatmap, monthly,
/// exceptions, billing, shipments }. The repo argument is kept for call-site compatibility.
export const compose = (...a) => _i().compose(...a);
