// output/web/js.tmp/implementations/kernel/core_abstractions/util/fx-lookup.js
function noRate() {
  return { rate: null, validFrom: null, validTo: null, isFallback: false };
}
async function getRateForDate(repo, dateStr, currency = "USD", direction) {
  const pair = repo.pnlFxLookupPair(currency);
  if (pair == null) return { rate: 1, validFrom: dateStr, validTo: dateStr, isFallback: false };
  repo.pnlFxRequireDirection(direction || "");
  const cached = repo.pnlFxCacheGet(dateStr, pair, direction);
  if (cached.hit) {
    return cached.rate == null ? noRate() : { rate: cached.rate, validFrom: cached.validFrom, validTo: cached.validTo, isFallback: cached.isFallback };
  }
  let result = noRate();
  try {
    const resolved = await repo.getRate(dateStr, pair, direction);
    const num = Number(resolved?.rate);
    if (Number.isFinite(num) && num > 0) {
      result = { rate: num, validFrom: resolved.validFrom, validTo: resolved.validTo, isFallback: !!resolved.isFallback };
    }
  } catch (err) {
    if (!/FxRateNotFound|not found/i.test(err.message)) throw err;
  }
  repo.pnlFxCachePut(dateStr, pair, direction, result.rate, result.validFrom, result.validTo, result.isFallback);
  return result;
}
function clearRateCache(repo) {
  repo.pnlFxCacheClear();
}

export {
  getRateForDate,
  clearRateCache
};
