// finance-dashboard-composer — port: the finance dashboard's P&L, composed by wasm.
//
// The view used to do all of it: read each line's buy and sell side (its own copy of the
// `snake_case ?? PascalCase` fallback `manager_rules::line_buy`/`line_sell` already own), decide
// what a row is called, group, sum, derive margin, and order by it. None of that is drawing.
//
// The reply's `rows` are already in the order the screen shows — best margin first. The shell
// renders them in the order given and does not re-sort; a second sort here is a second chance to
// disagree with the totals underneath.

let _impl = null;

/// Root bootstrap binds { financeDashboard } once.
export function bindFinanceDashboardComposer(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/finance-dashboard-composer: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (pnlLines) -> { totals: { revenue_vnd, cost_vnd, margin_vnd, margin_pct }, rows: [...] }
export const financeDashboard = (...a) => _i().financeDashboard(...a);
