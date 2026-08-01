// waterfall-math.js — Section C tax/net helpers + sales-share resolution.
// The profit waterfall (margin→TNDN→net→split) now lives in WASM
// (commission_waterfall) — do NOT re-add it here.

export const TAX_RATE_15         = 0.15;
const DEFAULT_SALES_SHARE_PCT    = 50;

/** computeTax15 — personal income tax 15% of gross (auto-calc) */
export function computeTax15(grossAmount) {
  return Math.round(grossAmount * TAX_RATE_15);
}

/**
 * computeCommissionNet — Section C net_after_tax
 * @param {number} grossAmount  pre-tax commission
 * @param {number} bankCharge   bank fee deducted
 * @param {number} taxAmount    personal tax (auto or manual)
 * @returns {number}
 */
export function computeCommissionNet(grossAmount, bankCharge, taxAmount) {
  return grossAmount - bankCharge - taxAmount;
}

/**
 * resolveSalesSharePct — precedence: shipment override > user config > workspace default
 * @param {number|null} override   per-shipment (null = not set)
 * @param {number|null} userConfig user.sales_share_pct (null = not set)
 * @returns {number} 0–100
 */
export function resolveSalesSharePct(override, userConfig) {
  if (override !== null && override !== undefined) return override;
  if (userConfig !== null && userConfig !== undefined) return userConfig;
  return DEFAULT_SALES_SHARE_PCT;
}
