// exception-composer — port: the exception command centre's compute (F-14-09). The severity badge
// palette is ui vocabulary and stays here.

export const KIND_EXCEPTION = 'exception';

export const SEVERITY_BADGE_CLS = {
  Critical: 'bg-red-100 text-red-700',
  High:     'bg-orange-100 text-orange-700',
  Medium:   'bg-amber-100 text-amber-700',
  Low:      'bg-slate-100 text-slate-600',
};

let _impl = null;

/// Root bootstrap binds { computeSortedExceptions, computeTrends, computeMttr,
/// computePerSalesRate, computeEscalated } once.
export function bindExceptionComposer(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/exception-composer: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (exceptions) -> open ones, severity first, each with its SLA countdown
export const computeSortedExceptions = (...a) => _i().computeSortedExceptions(...a);
/// (exceptions) -> { weeks, datasets } ready for the trend chart
export const computeTrends = (...a) => _i().computeTrends(...a);
/// (exceptions) -> [{ type, avgHours }]
export const computeMttr = (...a) => _i().computeMttr(...a);
/// (exceptions) -> [{ salesRep, open, closedThisPeriod, avgResolutionHours }]
export const computePerSalesRate = (...a) => _i().computePerSalesRate(...a);
/// (severity) -> one notch up, capped at Critical
export const computeEscalated = (...a) => _i().computeEscalated(...a);
