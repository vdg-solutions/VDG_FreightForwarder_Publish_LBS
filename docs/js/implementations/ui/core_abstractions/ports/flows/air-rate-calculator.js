// air-rate-calculator — port: chargeable weight and break-tier freight, as the quote form and the
// P&L header ask for them. The root bootstrap binds it to the wasm freight_app exports.

let _impl = null;

/// Root bootstrap binds { computeChargeableKg, computeFreight, calcResult } once.
export function bindAirRateCalculator(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/air-rate-calculator: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (actual, l, w, h) -> chargeable kg
export const computeChargeableKg = (...a) => _i().computeChargeableKg(...a);
/// (actual, l, w, h, breaks) -> freight total, or null when no tier applies
export const computeFreight = (...a) => _i().computeFreight(...a);
/// (actual, l, w, h, breaks) -> { chargeableKg, tier, freightTotal } | null
export const calcResult = (...a) => _i().calcResult(...a);
