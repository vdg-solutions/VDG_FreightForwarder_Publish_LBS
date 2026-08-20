// commission-calculator — port: the commission payout table as the manager views call it.

export const SPARKLINE_MONTHS = 6;
export const KIND_PNL_LINE    = 'pnl_line';

let _impl = null;

/// Root bootstrap binds { computeCommissions, computeSparkline, buildPeriodKey } once.
export function bindCommissionCalculator(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/commission-calculator: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (shipments, pnlLines, rules, advanceLog, periodKey) -> payout rows, biggest margin first
export const computeCommissions = (...a) => _i().computeCommissions(...a);
/// (shipments, pnlLines, salesId, monthCount) -> monthly margin, oldest first
export const computeSparkline = (...a) => _i().computeSparkline(...a);
/// ('month'|'quarter', Date) -> '2025-06' | '2025-Q2'
export const buildPeriodKey = (...a) => _i().buildPeriodKey(...a);
