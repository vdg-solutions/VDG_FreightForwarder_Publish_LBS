// pnl-save-validations.js — VR-02 (Σvnd invariant) + VR-03 (fx deviation) save gates (F-29-04).
// The math lives in wasm (flows_pnl_vnd_invariant / flows_pnl_fx_deviation, pnl_gate.rs) — this
// module only shapes state into the gate's request and returns its verdict, never recomputes it.
// Import-clean: only DEFAULT_HEADER_CURRENCY from pnl-line-fx.js (chain → fx-lookup.js, both
// CDN-free) plus the bound pnl-gate port. See design.md §2/§6 — this module must stay importable
// under node:test without the section-header.js -> cache/semantic-search.js CDN crash.
import { DEFAULT_HEADER_CURRENCY } from './pnl-line-fx.js';
import { vndInvariant, fxDeviation } from '../../../core_abstractions/ports/flows/pnl-gate.js';

/**
 * computeVndInvariant — VR-02: Σ(carried per-line VND) vs Σ(recomputed from raw inputs), decided
 * by the wasm gate. AC-01: match when |delta| <= epsilon (named in Rust — pnl_gate.rs's
 * VND_INVARIANT_EPSILON); empty state -> all zero.
 * mục C VND is post-tax and re-derived live (collectCommission) — contributes equally to both
 * sums in the gate, so a well-formed commission line never fabricates drift.
 */
export function computeVndInvariant(state = {}) {
  const lines = state.lines || [];
  const commissionNetAfterTax = (state.commission_lines || []).map((l) => l.net_after_tax || 0);
  const bookCurrency = state.book_currency || DEFAULT_HEADER_CURRENCY;
  return vndInvariant(lines, commissionNetAfterTax, bookCurrency);
}

/**
 * detectFxDeviation — VR-03: per-line deviation check (reference rate resolved by caller),
 * decided by the wasm gate. fxRate <= 0 -> flagged 'non_positive' regardless of reference.
 * currency === VND -> never flagged (locked rate = 1). referenceRate == null -> band check
 * skipped, but the <=0 check still applies.
 */
export function detectFxDeviation({ currency, fxRate, referenceRate }) {
  return fxDeviation(currency, fxRate, referenceRate);
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
