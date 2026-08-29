// cash-flow-fx-reval.js — F1: closing-rate fetch + render for cash-flow.js's AR unrealised
// FX gain/loss line. Split out of cash-flow.js (350-line cap). Fetch-and-hand-off only: the
// revaluation math (revalued - booked) runs in wasm's compose_ar, never here.

import { fxRateRepo } from '../../../core_abstractions/ports/storage/fx-rate-repo.js';
import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { getRateForDate } from '../../../../kernel/core_abstractions/util/fx-lookup.js';
import { todayLocal } from '../../../../kernel/core_abstractions/util/today-local.js';

const VND_CURRENCY = 'VND';
// 131 (AR) is an asset — Circular 200 revalues assets at the bank's buying rate.
const REVAL_DIRECTION = 'Buy';

/// Every non-VND currency any open billing record carries — a superset of what compose_ar
/// (Rust) will actually revalue is harmless, an under-fetch is not: better to ask for one rate
/// too many than to silently drop a row's revaluation.
function billingCurrencies(billing) {
  const set = new Set();
  for (const b of billing) {
    const currency = b.currency || b.Currency;
    if (currency && currency !== VND_CURRENCY) set.add(currency);
  }
  return [...set];
}

/// Fetches today's closing buying rate per foreign currency in `billing`. A currency whose rate
/// can't be resolved is simply left out of the map; compose_ar already treats an absent rate as
/// "report last-booked amount unchanged" (manager_finance_dto.rs::ArAgingRequest).
export async function fetchClosingRatesBuy(billing) {
  const currencies = billingCurrencies(billing);
  if (!currencies.length) return {};
  const dateStr = todayLocal();
  const rates = {};
  await Promise.all(currencies.map(async (currency) => {
    try {
      const rate = await getRateForDate(fxRateRepo, dateStr, currency, REVAL_DIRECTION);
      if (rate) rates[currency] = rate;
    } catch (err) {
      console.error(`[cash-flow] closing rate unavailable for ${currency}:`, err); // DEV — degrades that currency's rows, doesn't block the screen
    }
  }));
  return rates;
}

function fxRevalCls(amount) {
  if (amount > 0) return 'text-emerald-600 font-semibold';
  if (amount < 0) return 'text-red-600 font-semibold';
  return 'text-slate-500';
}

// amount is already whole-VND — compose_ar (ar_aging.rs) rounds it before it crosses the
// bridge, so JS only formats the locale grouping, never re-rounds money.
export function renderFxRevalSummary(root, amount) {
  const el = root.querySelector('#fx-reval-summary');
  if (!el) return;
  if (!amount) { el.textContent = ''; return; }
  const sign = amount > 0 ? '+' : '';
  el.className = `text-sm mt-2 ${fxRevalCls(amount)}`;
  el.textContent = `${t('cash_flow.ar.fx_reval.label')}: ${sign}${amount.toLocaleString()}`;
}
