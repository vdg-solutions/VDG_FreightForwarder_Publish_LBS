// output/web/js.tmp/implementations/kernel/core_abstractions/util/fx-lookup.js
async function getRateForDate(repo, dateStr, currency = "USD", direction) {
  const pair = repo.pnlFxLookupPair(currency);
  if (pair == null) return 1;
  repo.pnlFxRequireDirection(direction || "");
  const cached = repo.pnlFxCacheGet(dateStr, pair, direction);
  if (cached.hit) return cached.rate;
  let rate = null;
  try {
    const resolved = await repo.getRate(dateStr, pair, direction);
    const num = Number(resolved?.rate ?? resolved);
    rate = Number.isFinite(num) && num > 0 ? num : null;
  } catch (err) {
    if (!/FxRateNotFound|not found/i.test(err.message)) throw err;
    rate = null;
  }
  repo.pnlFxCachePut(dateStr, pair, direction, rate);
  return rate;
}
function clearRateCache(repo) {
  repo.pnlFxCacheClear();
}

export {
  getRateForDate,
  clearRateCache
};
