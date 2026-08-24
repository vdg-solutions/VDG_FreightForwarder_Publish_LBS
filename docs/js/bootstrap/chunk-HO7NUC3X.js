// output/web/js.tmp/implementations/kernel/core_abstractions/util/fx-lookup.js
var VND_CURRENCY = "VND";
var SESSION_CACHE = /* @__PURE__ */ new Map();
async function getRateForDate(repo, dateStr, currency = "USD") {
  if (currency === VND_CURRENCY) return 1;
  const pair = `${currency}/${VND_CURRENCY}`;
  const key = `${dateStr}/${pair}`;
  if (SESSION_CACHE.has(key)) return SESSION_CACHE.get(key);
  let rate = null;
  try {
    const entry = await repo.getRate(dateStr, pair);
    const num = Number(entry?.rate ?? entry);
    rate = Number.isFinite(num) && num > 0 ? num : null;
  } catch (err) {
    if (!/FxRateNotFound|not found/i.test(err.message)) throw err;
    rate = null;
  }
  SESSION_CACHE.set(key, rate);
  return rate;
}
function clearRateCache() {
  SESSION_CACHE.clear();
}

export {
  getRateForDate,
  clearRateCache
};
