// Rate-entry append helper — no Drive I/O of its own, writes go through the injected repo port.
// F-29-11: range/overlap validation lives once at the Rust write path (fx_rate_prepare_append).
// F-30: rate-bounds + buy/sell-spread rules moved to Rust (js_bridge_fx.rs) — see
// fx_rate_validate_value / fx_rate_validate_spread on window.__vdg_wasm. No rule bodies here any
// more; a pure-input rejection now propagates from the wasm-gated write path to the caller.
export const FX_PAIR_DEFAULT = 'USD/VND';

// Append a range entry through the write-gated path. Errors propagate to the caller.
// deleteFirst: old entry to remove before re-add (edit flow); null for new entry.
// F1: entry captures BOTH sides of the quote — no single "rate" any more.
export async function addRateEntry(repo, validFrom, validTo, pair, rateBuy, rateSell, source, role, deleteFirst) {
  if (deleteFirst) {
    try { await repo.deleteEntry(deleteFirst.valid_from, deleteFirst.valid_to, deleteFirst.pair || pair); }
    catch { /* tolerate not-found on edit-delete */ }
  }
  await repo.appendRate(
    JSON.stringify({
      valid_from: validFrom, valid_to: validTo, pair,
      rate_buy: Number(rateBuy), rate_sell: Number(rateSell), source,
    }),
    role,
  );
  return null;
}
