// Air freight chargeable weight + break-tier freight (F-16-05).
// Math lives in WASM (chargeable_weight + rate_lookup) — this only delegates.

function wasm() { return window.__vdg_wasm; }

/**
 * Chargeable weight = max(actual_kg, L×W×H / 6000).
 * @returns {number}
 */
export function computeChargeableKg(actual, l, w, h) {
  return wasm().compute_chargeable_kg(actual, l, w, h);
}

/**
 * Freight total for the matched break tier, or null when no tier applies.
 * @param {Array} breaks - [{min_kg, rate_per_kg}, ...]
 * @returns {number|null}
 */
export function computeFreight(actual, l, w, h, breaks) {
  return wasm().compute_freight(actual, l, w, h, JSON.stringify(breaks || [])) ?? null;
}

/**
 * Full result including tier details (for UI display).
 * @returns {{ chargeableKg: number, tier: object, freightTotal: number } | null}
 */
export function calcResult(actual, l, w, h, breaks) {
  const r = wasm().air_calc_result(actual, l, w, h, JSON.stringify(breaks || []));
  if (!r) return null;
  return { chargeableKg: r.chargeable_kg, tier: r.tier, freightTotal: r.freight_total };
}
