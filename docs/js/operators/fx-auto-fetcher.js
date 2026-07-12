// FX auto-fetch worker: skip/fetch/append orchestration.
// AC-01/04/05: Manual skip, duplicate skip, error handling.

import { fetchUsdVndRate } from '../implementations/fx-aggregator.js';

const FX_PAIR           = 'USD/VND';
const LS_LAST_FETCH_KEY = 'vdg.fx.last_fetch';

// Main worker logic. fetchFn injected for unit tests (default: fetchUsdVndRate).
// Returns: { fetched, skipped, reason?, rate?, source?, error? }
export async function checkAndFetch(repo, workspaceSettings, fetchFn = fetchUsdVndRate) {
  // AC-01: Manual source → no-op
  if (workspaceSettings?.fx_source === 'Manual') {
    return { fetched: false, skipped: true, reason: 'manual' };
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  // AC-04: today already recorded → skip
  if (await repo.exists(todayStr, FX_PAIR)) {
    return { fetched: false, skipped: true, reason: 'already' };
  }

  // AC-02/03: fetch + append
  try {
    const { rate, source } = await fetchFn();
    const entryJson = JSON.stringify({ date: todayStr, pair: FX_PAIR, rate, source });
    await repo.appendRate(entryJson);

    // AC-05: success → write localStorage
    localStorage.setItem(LS_LAST_FETCH_KEY, JSON.stringify({
      timestamp: new Date().toISOString(),
      success:   true,
      source,
    }));
    return { fetched: true, rate, source };
  } catch (err) {
    const errorType = err.errorType ?? 'network';
    // AC-05: network/parse → warn; CORS warn suppressed to once-per-session in init module
    if (errorType !== 'cors') {
      console.warn('[fx-auto-fetch]', todayStr, err.message); // DEV
    }
    // AC-05: write localStorage error state
    localStorage.setItem(LS_LAST_FETCH_KEY, JSON.stringify({
      timestamp: new Date().toISOString(),
      success:   false,
      error:     { type: errorType, msg: err.message },
    }));
    return { fetched: false, error: { type: errorType, msg: err.message } };
  }
}
