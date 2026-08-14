// default-currency-lock.js — when may accounting still change the workspace default currency?
//
// Owner 2026-08-14: "trong kỳ thì không cho sửa tiền tệ mặc định". The default seeds the currency
// a NEW P&L header opens in. Nothing recomputes when it changes — every line carries its own
// currency and fx_rate, and every total is already VND — so the risk is not arithmetic, it is
// INCONSISTENCY WITHIN A PERIOD: flip it mid-month and two jobs booked in the same month start
// from different bases, which is exactly what an accounting period exists to prevent.
//
// Hence the rule reads the period, not the calendar: the default is editable while the current
// period is still empty, and frozen the moment that period carries its first job. A closed period
// freezes it too — a closed book takes no policy edits at all.

const PERIOD_LEN = 7; // 'YYYY-MM'

export const LOCK_REASON_PERIOD_HAS_JOBS = 'period_has_jobs';
export const LOCK_REASON_PERIOD_CLOSED   = 'period_closed';

/** The YYYY-MM a date belongs to, or null when it names none. */
export function periodOf(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  return isNaN(d.getTime()) ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * canEditDefaultCurrency — pure. Feeds the settings screen's disabled state AND the save guard,
 * so the answer the user sees and the answer the write enforces cannot drift apart.
 *
 * @param {object[]} shipments  every shipment the caller can see
 * @param {string}   period     the period being judged, 'YYYY-MM'
 * @param {boolean}  periodClosed  whether that period is locked (period-close-orchestrator)
 * @returns {{ editable: boolean, reason: string|null, jobCount: number }}
 */
export function canEditDefaultCurrency(shipments, period, periodClosed = false) {
  if (periodClosed) return { editable: false, reason: LOCK_REASON_PERIOD_CLOSED, jobCount: 0 };
  const key = (period || '').slice(0, PERIOD_LEN);
  // A job belongs to the period its ETD names; one with no usable ETD is not yet in any period
  // and so cannot be the thing that freezes one.
  const inPeriod = (shipments || []).filter((s) => periodOf(s?.etd || s?.ETD) === key);
  return inPeriod.length
    ? { editable: false, reason: LOCK_REASON_PERIOD_HAS_JOBS, jobCount: inPeriod.length }
    : { editable: true, reason: null, jobCount: 0 };
}
