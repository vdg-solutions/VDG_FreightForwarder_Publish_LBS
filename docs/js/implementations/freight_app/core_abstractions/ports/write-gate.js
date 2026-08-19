// write-gate.js — port: the write gate use-case as its collaborators call it; the freight_app bootstrap binds
// the operator (operators/data/write-gate.js) behind it. Constants and error shapes are contract and live here.

export const PREF_LOCKED_PERIODS_KEY = 'locked_periods';

export class PeriodLockedError extends Error {
  // The caller supplies the (translated) message — the port is pure, the operator owns i18n.
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

/// The operator registers { assertWritable } once, from the freight_app bootstrap.
export function bindWriteGate(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('freight_app/write-gate: no operator bound (the freight_app bootstrap binds it)');
  return _impl;
}

export const assertWritable = (...a) => _i().assertWritable(...a);

/// Test seam.
export function _resetWriteGate() { _impl = null; }
