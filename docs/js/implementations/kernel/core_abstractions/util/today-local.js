// util/today-local.js — F-57-01. The single source of truth for "what calendar day is it".
//
// `new Date().toISOString().slice(0, 10)` returns the date in **UTC**. This product runs in
// Vietnam (UTC+7), so between 00:00 and 07:00 local time that expression yields YESTERDAY.
// 24 call sites had each re-derived it that way, while operators/shipment-ref-gen.js derived
// the YYMMDD in shipment_ref from LOCAL components — so the same record could carry a
// September reference number and an August transaction date.
//
// Concretely: 06:30 on 1 September, a rep saves a P&L. shipment_ref is EX-260901-001 (local,
// correct) but open_date/transaction_date were written 2026-08-31. August is closed, so the
// write either bounces with PeriodClosedError on a legitimately-September shipment or lands
// in a closed period and corrupts the August P&L report.
//
// `lint-js.mjs` bans the raw pattern so this cannot regress.

import { nowDate, dateFrom } from '../ports/clock.js';

// en-CA formats as YYYY-MM-DD, and Intl resolves in the host's local zone — the same zone
// getFullYear()/getMonth()/getDate() read, so this agrees with shipment-ref-gen.js by
// construction rather than by coincidence.
const ISO_DATE_LOCALE = 'en-CA';

/**
 * Local calendar date as `YYYY-MM-DD`.
 * @param {Date} [date] — defaults to now. Injectable for tests.
 * @returns {string}
 */
export function todayLocal(date = nowDate()) {
  return date.toLocaleDateString(ISO_DATE_LOCALE);
}

/**
 * Local calendar date of an arbitrary instant, as `YYYY-MM-DD`.
 * Use for stamping a value that already has a Date/epoch — never re-derive with toISOString().
 * @param {Date|number|string} value
 * @returns {string}
 */
export function toLocalDateStr(value) {
  return todayLocal(value instanceof Date ? value : dateFrom(value));
}
