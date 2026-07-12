// FX aggregator: fetches USD/VND from exchangerate.host (CORS-friendly, free).
// External adapter — implementations layer per A.D.D V3.

const EXCHANGERATE_HOST_URL = 'https://api.exchangerate.host/latest?base=USD&symbols=VND';
const AUTO_FETCH_SOURCE     = 'auto-fetch:exchangerate.host';

// Returns { rate: number, source: string }.
// Throws Error with .errorType = 'cors' | 'network' | 'parse' on failure.
export async function fetchUsdVndRate() {
  let resp;
  try {
    resp = await fetch(EXCHANGERATE_HOST_URL);
  } catch (err) {
    const typed = new Error(err.message);
    // TypeError from fetch() = network/CORS failure; use message to distinguish
    typed.errorType = err.message?.includes('Failed to fetch') ? 'cors' : 'network';
    throw typed;
  }

  let data;
  try {
    data = await resp.json();
  } catch (err) {
    const typed = new Error('JSON parse error: ' + err.message);
    typed.errorType = 'parse';
    throw typed;
  }

  const rate = data?.rates?.VND;
  if (typeof rate !== 'number' || !isFinite(rate)) {
    const typed = new Error('rates.VND missing or non-numeric');
    typed.errorType = 'parse';
    throw typed;
  }

  return { rate, source: AUTO_FETCH_SOURCE };
}
