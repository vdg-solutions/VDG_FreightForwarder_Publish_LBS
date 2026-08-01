// pnl-save-validations.js — VR-02 (Σvnd invariant) + VR-03 (fx deviation) pure helpers (F-29-04)
// Import-clean: only computeLineVnd from pnl-line-fx.js (chain → fx-lookup.js, both CDN-free).
// See design.md §2/§6 — this module must stay importable under node:test without the
// section-header.js -> cache/semantic-search.js CDN crash.
import { computeLineVnd } from './pnl-line-fx.js';

// R-C named constants
const VND_INVARIANT_EPSILON = 1;             // VND has no sub-unit; absorbs float noise from
                                              // amount×fx_rate. 1-dong slack; real drift is thousands.
export const FX_DEVIATION_THRESHOLD = 0.05;  // 5% band around reference rate — design.md §4

const VND_CURRENCY = 'VND';
const REASON_NON_POSITIVE = 'non_positive';
const REASON_DEVIATION    = 'deviation';

/**
 * computeVndInvariant — VR-02: Σ(carried per-line VND) vs Σ(recomputed from raw inputs).
 * expected = Σ computeLineVnd(amount, currency, fx_rate) over every monetary side (truth).
 * actual   = Σ carried vnd_pay + vnd_collect + net_after_tax (what the state currently holds).
 * AC-01: match when |delta| <= epsilon; signed diff = expected - actual; empty state -> all zero.
 */
export function computeVndInvariant(state = {}, epsilon = VND_INVARIANT_EPSILON) {
  const lines            = state.lines || [];
  const commissionLines  = state.commission_lines || [];

  let expected = 0;
  let actual   = 0;

  for (const l of lines) {
    expected += computeLineVnd(l.buy_amt, l.buy_currency, l.buy_fx_rate);
    expected += computeLineVnd(l.sell_amt, l.sell_currency, l.sell_fx_rate);
    actual   += l.vnd_pay || 0;
    actual   += l.vnd_collect || 0;
  }

  for (const l of commissionLines) {
    // mục C VND is post-tax and re-derived live (collectCommission) — contributes equally
    // to both sums, so a well-formed commission line never fabricates drift (AC-01).
    const net = l.net_after_tax || 0;
    expected += net;
    actual   += net;
  }

  const delta = expected - actual;
  return { match: Math.abs(delta) <= epsilon, expected, actual, delta };
}

/**
 * detectFxDeviation — VR-03: pure per-line deviation check (reference rate resolved by caller).
 * fxRate <= 0 -> flagged 'non_positive' regardless of reference.
 * currency === VND -> never flagged (locked rate = 1).
 * referenceRate == null -> band check skipped, but the <=0 check still applies.
 * positive fxRate deviating from referenceRate by more than threshold -> flagged 'deviation'.
 */
export function detectFxDeviation({ currency, fxRate, referenceRate }, threshold = FX_DEVIATION_THRESHOLD) {
  const rate = Number(fxRate);

  if (currency === VND_CURRENCY) {
    return { flagged: false, reason: null, deviation: null };
  }
  if (!(rate > 0)) {
    return { flagged: true, reason: REASON_NON_POSITIVE, deviation: null };
  }
  if (referenceRate == null) {
    return { flagged: false, reason: null, deviation: null };
  }

  const ref       = Number(referenceRate);
  const deviation = ref !== 0 ? Math.abs(rate - ref) / ref : 0;
  const flagged   = deviation > threshold;
  return { flagged, reason: flagged ? REASON_DEVIATION : null, deviation };
}

/**
 * buildFxOverrideRecord — VR-03 (AC-06): pure audit-record builder, no I/O.
 * lineRef identifies the flagged line ("${index}:${side}:${desc}" for mục B, "C${index}:${kind}" for mục C).
 */
export function buildFxOverrideRecord(lineRef, {
  currency, fxRate, referenceRate, fxDate, threshold, reason, confirmedBy, confirmedAt,
}) {
  return {
    line_ref:        lineRef,
    currency,
    entered_fx_rate: fxRate,
    reference_rate:  referenceRate ?? null,
    fx_date:         fxDate || null,
    threshold,
    reason,
    confirmed_by:    confirmedBy || null,
    confirmed_at:    confirmedAt || new Date().toISOString(),
  };
}
