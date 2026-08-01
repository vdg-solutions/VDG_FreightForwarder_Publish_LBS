// Period-lock UI helpers — banner display only.
// Drive write enforcement is in drive-entity-repo.js via is_period_closed() WASM gate.

export const PREF_LOCKED_PERIODS_KEY = 'locked_periods';

export class PeriodLockedError extends Error {
  constructor(period) {
    super(`Period ${period} is locked`);
    this.name = 'PeriodLockedError';
  }
}

/**
 * Returns locked period key if shipmentEtd falls within a locked period, else null.
 * @param {object} preferences  L2 meta.preferences object
 * @param {string} shipmentEtd  ISO date string from shipment.etd
 * @returns {string|null}
 */
export function checkPeriodLock(preferences, shipmentEtd) {
  const locked = preferences?.[PREF_LOCKED_PERIODS_KEY];
  if (!locked?.length || !shipmentEtd) return null;

  const etd = new Date(shipmentEtd);
  if (isNaN(etd.getTime())) return null;

  const etdYear  = etd.getFullYear();
  const etdMonth = etd.getMonth() + 1; // 1-indexed

  for (const entry of locked) {
    const key = entry.period_key || '';
    // Monthly format: "YYYY-MM"
    if (/^\d{4}-\d{2}$/.test(key)) {
      const [y, m] = key.split('-').map(Number);
      if (y === etdYear && m === etdMonth) return key;
    }
    // Quarterly format: "YYYY-Q1" .. "YYYY-Q4"
    if (/^\d{4}-Q[1-4]$/.test(key)) {
      const [y, q] = [parseInt(key), parseInt(key.slice(6))];
      const yr = parseInt(key.slice(0, 4));
      const quarterMonth = Math.ceil(etdMonth / 3);
      if (yr === etdYear && q === quarterMonth) return key;
    }
  }
  return null;
}
