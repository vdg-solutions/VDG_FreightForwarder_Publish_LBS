// Session-level FX rate lookup — pure wiring, no tech (core_abstractions). The VND self-pair
// rule, the Buy/Sell direction requirement and the session cache all live in Rust now
// (js_bridge_pnl_fx.rs): a cache is state that outlives a render, so it is business, not UI.
// Reached through `repo` (the same fx-rate adapter every caller already passes for `getRate`),
// never a platform global — this file's own job is the real I/O the rules gate.

/// Async: call repo.getRate(), cache result via wasm (through `repo`). Returns rate as Number or
/// null (not found). currency default 'USD' for legacy callers that omit the pair. direction:
/// 'Buy'|'Sell' — Circular 200 values assets at the buying rate and liabilities at the selling
/// rate, so every caller states which side it wants; there is no default (rejected downstream).
export async function getRateForDate(repo, dateStr, currency = 'USD', direction) {
  const pair = repo.pnlFxLookupPair(currency);
  if (pair == null) return 1; // self-pair (VND), no lookup — Rust rule
  repo.pnlFxRequireDirection(direction || ''); // throws synchronously before any repo I/O
  const cached = repo.pnlFxCacheGet(dateStr, pair, direction);
  if (cached.hit) return cached.rate;
  let rate = null;
  try {
    const resolved = await repo.getRate(dateStr, pair, direction);
    // real repo resolves the picked side as a Rust Decimal, serialized as a string;
    // resolved?.rate ?? resolved also accepts a bare number (existing test doubles)
    const num = Number(resolved?.rate ?? resolved);
    rate = Number.isFinite(num) && num > 0 ? num : null;
  } catch (err) {
    // FxRateNotFound (>31d gap) → null; other errors propagate
    if (!/FxRateNotFound|not found/i.test(err.message)) throw err;
    rate = null;
  }
  repo.pnlFxCachePut(dateStr, pair, direction, rate);
  return rate;
}

/// Evict all cached entries (call after admin adds/deletes a rate).
export function clearRateCache(repo) {
  repo.pnlFxCacheClear();
}
