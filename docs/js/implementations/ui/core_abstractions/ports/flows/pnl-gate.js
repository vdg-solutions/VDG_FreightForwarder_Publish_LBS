// pnl-gate — port: the sales-quote save gates (F-29-04 VR-02 Σvnd invariant, VR-03 fx-deviation
// band) plus the per-line VND math they're built on. Root bootstrap binds it to the wasm
// freight_app exports; JS only asks and renders the verdict, never recomputes it.

let _impl = null;

/// Root bootstrap binds { lineVnd, vndInvariant, fxDeviation } once.
export function bindPnlGate(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/pnl-gate: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (amount, currency, fxRate, bookCurrency) -> vnd
export const lineVnd = (...a) => _i().lineVnd(...a);
/// (lines, commissionNetAfterTax, bookCurrency) -> { match, expected, actual, delta }
export const vndInvariant = (...a) => _i().vndInvariant(...a);
/// (currency, fxRate, referenceRate, referenceUnreadable) -> { flagged, reason, deviation, threshold }
export const fxDeviation = (...a) => _i().fxDeviation(...a);
