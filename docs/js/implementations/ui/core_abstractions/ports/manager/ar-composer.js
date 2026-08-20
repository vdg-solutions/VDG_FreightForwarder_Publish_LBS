// ar-composer — port: AR aging, AP payables and the receivable timeline as the cash-flow view
// calls them. The bucket edges are ui vocabulary too: the column headers name them.

export const AR_CURRENT_DAYS = 30;
export const AR_BUCKET_31_60 = 60;
export const AR_BUCKET_61_90 = 90;
export const CREDIT_UTILIZATION_WARN_PCT     = 80;
export const CREDIT_UTILIZATION_EXCEEDED_PCT = 100;

let _impl = null;

/// Root bootstrap binds { composeAR, composeAP, composeTimeline } once.
export function bindArComposer(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/ar-composer: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// ({ billingEntities, today }) -> { rows, totals }
export const composeAR = (...a) => _i().composeAR(...a);
/// ({ pnlLines }) -> { rows }
export const composeAP = (...a) => _i().composeAP(...a);
/// ({ billingEntities, shipments, today }) -> { weeks, actuals, forecast }
export const composeTimeline = (...a) => _i().composeTimeline(...a);
