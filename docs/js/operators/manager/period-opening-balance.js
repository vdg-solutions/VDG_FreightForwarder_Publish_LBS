// period-opening-balance.js — số dư đầu kỳ (F-42-02).
//
// Owner 2026-08-14: "kế toán có kì mà". A period had a close button but no books: nothing was
// carried forward, so every ledger window started its running balance at 0 as though the
// business had begun that morning.
//
// The accounting act is one sentence: the CLOSING balance of period P is the OPENING balance of
// P+1. So this is not a new record type — it is an attribute of the close event. closePeriod
// stamps each account's balance as of the last day of P onto the `period_close` record, and the
// opening balance of P+1 is read back off P's close. One event, one row, nothing to invalidate:
// reopen-and-re-close writes a NEW close record, and the latest one wins.
//
// The balances themselves are never computed here — `ledgerRepo.getBalance` aggregates the legs
// in Rust, honouring each account's balance_side. This module owns the period arithmetic and
// the read-back, not the money.

const PERIOD_LEN   = 7;  // 'YYYY-MM'
const ISO_DATE_LEN = 10; // 'YYYY-MM-DD'
const MS_PER_DAY   = 86_400_000;

export const CLOSING_BALANCES_FIELD = 'closing_balances';
export const ACCOUNT_FIELD = 'account';
export const BALANCE_FIELD = 'balance';

function _parts(period) {
  const m = /^(\d{4})-(\d{2})$/.exec(period || '');
  return m ? { year: Number(m[1]), month: Number(m[2]) } : null;
}

function _key(year, month) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

/// The month before/after a 'YYYY-MM' key, or null when the key is unusable.
export function previousPeriod(period) {
  const p = _parts(period);
  if (!p) return null;
  return p.month === 1 ? _key(p.year - 1, 12) : _key(p.year, p.month - 1);
}

export function nextPeriod(period) {
  const p = _parts(period);
  if (!p) return null;
  return p.month === 12 ? _key(p.year + 1, 1) : _key(p.year, p.month + 1);
}

/// First and last calendar day of a period, as ISO dates — the range the ledger's date filter
/// and getBalance's asOfDate both speak. Day 0 of the next month IS the last day of this one.
export function periodBounds(period) {
  const p = _parts(period);
  if (!p) return null;
  const last = new Date(Date.UTC(p.year, p.month, 0));
  return { start: `${period}-01`, end: last.toISOString().slice(0, ISO_DATE_LEN) };
}

/// The day before an ISO date — the as-of an opening balance is measured at.
export function dayBefore(isoDate) {
  const ms = Date.parse(`${String(isoDate).slice(0, ISO_DATE_LEN)}T00:00:00Z`);
  if (Number.isNaN(ms)) return null;
  return new Date(ms - MS_PER_DAY).toISOString().slice(0, ISO_DATE_LEN);
}

/// The period an ISO date falls in.
export function periodOfDate(isoDate) {
  const s = String(isoDate || '');
  return /^\d{4}-\d{2}/.test(s) ? s.slice(0, PERIOD_LEN) : null;
}

/// True when a date is the very first day of its period — the only place an opening balance
/// may be claimed without silently ignoring part of the month.
export function isPeriodStart(isoDate) {
  const p = periodOfDate(isoDate);
  return !!p && String(isoDate).slice(0, ISO_DATE_LEN) === `${p}-01`;
}

/**
 * Every account's balance as of the last day of `period`. Sequential on purpose: this runs once
 * per close, against a Drive-backed store, and a fan-out over the whole chart would trade a
 * one-off wait for a burst of concurrent reads on the slowest path in the app.
 * An account whose balance cannot be read is REPORTED, never silently zeroed — a zero would
 * carry forward as a real opening balance and quietly lose money.
 * @returns {Promise<{balances: object[], failed: string[]}>}
 */
export async function snapshotClosingBalances(ledgerRepo, accounts, period) {
  const bounds = periodBounds(period);
  if (!ledgerRepo || !bounds) return { balances: [], failed: [] };

  const balances = [];
  const failed   = [];
  for (const account of accounts || []) {
    const code = account?.code;
    if (!code) continue;
    try {
      const res = await ledgerRepo.getBalance(code, bounds.end);
      balances.push({ [ACCOUNT_FIELD]: code, [BALANCE_FIELD]: Number(res?.balance) || 0 });
    } catch {
      failed.push(code); // surfaced to the manager by the caller — see close-period.js
    }
  }
  return { balances, failed };
}

/// The latest close record for a period ('pc-<period>-<ms>' ids, so the newest closed_at wins).
export function latestCloseFor(closeRecords, period) {
  return (closeRecords || [])
    .filter((r) => r && !r._deleted && r.period === period)
    .sort((a, b) => String(a.closed_at || '').localeCompare(String(b.closed_at || '')))
    .pop() || null;
}

/**
 * Opening balance of `period` for one account = closing balance stamped by the close of the
 * PREVIOUS period. null when that period was never closed — a period nobody closed has no
 * opening balance to show, and inventing one from live legs would dress a computation up as a
 * signed-off figure.
 * @returns {{balance:number, source_period:string, closed_at:string, closed_by:string}|null}
 */
export function openingBalanceFor(closeRecords, period, accountCode) {
  const prior = previousPeriod(period);
  const close = prior ? latestCloseFor(closeRecords, prior) : null;
  const row   = (close?.[CLOSING_BALANCES_FIELD] || [])
    .find((b) => b?.[ACCOUNT_FIELD] === accountCode);
  if (!row) return null;
  return {
    balance:       Number(row[BALANCE_FIELD]) || 0,
    source_period: prior,
    closed_at:     close.closed_at || '',
    closed_by:     close.closed_by || '',
  };
}
