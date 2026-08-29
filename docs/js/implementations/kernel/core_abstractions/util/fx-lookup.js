// Session-level FX rate cache + lookup helper.

const VND_CURRENCY = 'VND';

// Map<"YYYY-MM-DD/pair/direction", number|null> — cleared on clearRateCache().
const SESSION_CACHE = new Map();

/// Async: call repo.getRate(), cache result. Returns rate as Number or null (not found).
/// currency default 'USD' for legacy callers that omit the pair. direction: 'Buy'|'Sell' —
/// Circular 200 values assets at the buying rate and liabilities at the selling rate, so every
/// caller states which side it wants; there is no default.
export async function getRateForDate(repo, dateStr, currency = 'USD', direction) {
  if (currency === VND_CURRENCY) return 1; // self-pair, no lookup
  if (!direction) throw new Error('getRateForDate: direction (Buy|Sell) is required');
  const pair = `${currency}/${VND_CURRENCY}`;
  const key = `${dateStr}/${pair}/${direction}`;
  if (SESSION_CACHE.has(key)) return SESSION_CACHE.get(key);
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
  SESSION_CACHE.set(key, rate);
  return rate;
}

/// Evict all cached entries (call after admin adds/deletes a rate).
export function clearRateCache() {
  SESSION_CACHE.clear();
}
