// Session-level FX rate lookup — pure wiring, no tech (core_abstractions). The VND self-pair
// rule, the Buy/Sell direction requirement and the session cache all live in Rust now
// (js_bridge_pnl_fx.rs): a cache is state that outlives a render, so it is business, not UI.
// Reached through `repo` (the same fx-rate adapter every caller already passes for `getRate`),
// never a platform global — this file's own job is the real I/O the rules gate.

// B-15-38-07: a not-found/self-pair answer, spelled out the same shape a resolved one carries —
// no caller branches on "is this an object or a number."
function noRate() {
  return { rate: null, validFrom: null, validTo: null, isFallback: false };
}

/// Async: call repo.getRate(), cache the WHOLE resolution via wasm (through `repo`) — never just
/// the number. Returns `{ rate, validFrom, validTo, isFallback }`: `rate` is null when not found;
/// `isFallback` names whether this is a prior-day answer (the resolver knows which branch it took
/// — B-15-38-07 — so a caller shows which day's rate this is instead of re-deriving it from the
/// dates). currency default 'USD' for legacy callers that omit the pair. direction: 'Buy'|'Sell'
/// — Circular 200 values assets at the buying rate and liabilities at the selling rate, so every
/// caller states which side it wants; there is no default (rejected downstream).
export async function getRateForDate(repo, dateStr, currency = 'USD', direction) {
  const pair = repo.pnlFxLookupPair(currency);
  if (pair == null) return { rate: 1, validFrom: dateStr, validTo: dateStr, isFallback: false }; // self-pair (VND), no lookup — Rust rule
  repo.pnlFxRequireDirection(direction || ''); // throws synchronously before any repo I/O
  const cached = repo.pnlFxCacheGet(dateStr, pair, direction);
  if (cached.hit) {
    return cached.rate == null ? noRate() : { rate: cached.rate, validFrom: cached.validFrom, validTo: cached.validTo, isFallback: cached.isFallback };
  }
  let result = noRate();
  try {
    const resolved = await repo.getRate(dateStr, pair, direction);
    // real repo resolves the picked side as a named outcome — rate as a Rust Decimal (serialized
    // as a string) plus validFrom/validTo/isFallback, never collapsed to a bare number.
    const num = Number(resolved?.rate);
    if (Number.isFinite(num) && num > 0) {
      result = { rate: num, validFrom: resolved.validFrom, validTo: resolved.validTo, isFallback: !!resolved.isFallback };
    }
  } catch (err) {
    // FxRateNotFound (>31d gap) → no rate; other errors propagate
    if (!/FxRateNotFound|not found/i.test(err.message)) throw err;
  }
  repo.pnlFxCachePut(dateStr, pair, direction, result.rate, result.validFrom, result.validTo, result.isFallback);
  return result;
}

/// Evict all cached entries (call after admin adds/deletes a rate).
export function clearRateCache(repo) {
  repo.pnlFxCacheClear();
}
