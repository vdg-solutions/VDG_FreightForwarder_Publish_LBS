// write-gate — port: may this session mutate shipment/P&L data (F-20-10/F-20-11)?
//
// The DECISION is Rust's: a locked period (meta-pref `preferences.locked_periods`) and a
// read-only licence (grace) both answer with a REASON CODE. The words are a UI concern, so the
// binding translates the code and throws one of the two errors below — the shapes the screens
// already catch by `instanceof`.

export const PREF_LOCKED_PERIODS_KEY = 'locked_periods';

export class PeriodLockedError extends Error {
  // The binding supplies the (translated) message — the port is pure.
  constructor(periodKey, message) {
    super(message ?? `period locked: ${periodKey}`);
    this.name   = 'PeriodLockedError';
    this.period = periodKey;
  }
}

export class LicenseReadOnlyError extends Error {
  constructor(graceDaysLeft, message) {
    super(message ?? `license read-only: ${graceDaysLeft} days left`);
    this.name = 'LicenseReadOnlyError';
    this.graceDaysLeft = graceDaysLeft;
  }
}

let _impl = null;

/// Root bootstrap binds { assertWritable } once.
export function bindWriteGate(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/write-gate: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (repo, etd, kind?) -> resolves when the write is allowed, throws one of the two errors above.
export const assertWritable = (...a) => _i().assertWritable(...a);
