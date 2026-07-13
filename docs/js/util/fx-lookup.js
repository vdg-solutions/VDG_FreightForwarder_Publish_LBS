// Session-level FX rate cache + lookup helper.

const VND_CURRENCY = 'VND';

// Map<"YYYY-MM-DD/pair", number|null> — cleared on clearRateCache().
const SESSION_CACHE = new Map();

/// Async: call repo.getRate(), cache result. Returns rate as Number or null (not found).
/// currency default 'USD' keeps the one existing caller (util/vnd-injector.js) unmodified.
export async function getRateForDate(repo, dateStr, currency = 'USD') {
  if (currency === VND_CURRENCY) return 1; // self-pair, no lookup
  const pair = `${currency}/${VND_CURRENCY}`;
  const key = `${dateStr}/${pair}`;
  if (SESSION_CACHE.has(key)) return SESSION_CACHE.get(key);
  let rate = null;
  try {
    rate = await repo.getRate(dateStr, pair);
    if (typeof rate !== 'number') rate = null;
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
