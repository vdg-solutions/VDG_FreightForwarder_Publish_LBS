// FX auto-fetch init: setInterval + visibilitychange + localStorage state.
// AC-10: one interval per page lifetime (idempotent), visibilitychange re-check.
// AC-06: CORS warn suppressed to once per session via sessionStorage.

import { checkAndFetch as _execCheck } from '../operators/fx-auto-fetcher.js';

const FETCH_INTERVAL_MS    = 3_600_000; // 1 hour
const LS_LAST_FETCH_KEY    = 'vdg.fx.last_fetch';
const CORS_WARN_SESSION_KEY = 'vdg.fx.cors_warned';

let _repo        = null;
let _getSettings = null;
let _intervalId  = null; // AC-10: singleton guard

// Wraps _execCheck with CORS warn suppression (AC-06).
// Zero-arg export so settings.js Refresh button needs no repo/settings ref.
export async function checkAndFetch() {
  if (!_repo || !_getSettings) return { skipped: true, reason: 'not-init' };
  const result = await _execCheck(_repo, _getSettings());
  if (result.error?.type === 'cors' && !sessionStorage.getItem(CORS_WARN_SESSION_KEY)) {
    console.warn('[fx-auto-fetch] CORS blocked — auto-fetch unavailable in this browser'); // DEV
    sessionStorage.setItem(CORS_WARN_SESSION_KEY, '1');
  }
  return result;
}

// Returns parsed last-fetch info from localStorage or null.
export function getLastFetchInfo() {
  try { return JSON.parse(localStorage.getItem(LS_LAST_FETCH_KEY)); }
  catch { return null; /* corrupt entry */ }
}

// Called from app boot after workspace loaded.
// repo: FxRateDriveRepo instance
// getSettingsFn: () => { fx_source }  (lazy — settings may change after init)
export function initFxAutoFetch(repo, getSettingsFn) {
  _repo        = repo;
  _getSettings = getSettingsFn;

  // AC-10: idempotent — no duplicate interval per page lifetime
  if (_intervalId !== null) return;

  const check = () => checkAndFetch();

  check(); // immediate first check on init
  _intervalId = setInterval(check, FETCH_INTERVAL_MS);

  // AC-10: re-check on tab becoming visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
}
