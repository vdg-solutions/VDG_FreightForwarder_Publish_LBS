// output/web/js.tmp/implementations/ui/core_abstractions/ports/data/write-gate.js
var PREF_LOCKED_PERIODS_KEY = "locked_periods";
var PeriodLockedError = class extends Error {
  // The binding supplies the (translated) message — the port is pure.
  constructor(periodKey, message) {
    super(message ?? `period locked: ${periodKey}`);
    this.name = "PeriodLockedError";
    this.period = periodKey;
  }
};
var LicenseReadOnlyError = class extends Error {
  constructor(graceDaysLeft, message) {
    super(message ?? `license read-only: ${graceDaysLeft} days left`);
    this.name = "LicenseReadOnlyError";
    this.graceDaysLeft = graceDaysLeft;
  }
};
var _impl = null;
function bindWriteGate(impl) {
  _impl = impl;
}

// output/web/js.tmp/implementations/ui/core_abstractions/ports/governance/period-lock-registry.js
var _impl2 = null;
function bindPeriodLockRegistry(impl) {
  _impl2 = impl;
}
function _i() {
  if (!_impl2) throw new Error("ui/period-lock-registry: no implementation bound (root bootstrap binds it)");
  return _impl2;
}
var readLockedPeriods = (...a) => _i().readLockedPeriods(...a);
var lockPeriod = (...a) => _i().lockPeriod(...a);

export {
  PREF_LOCKED_PERIODS_KEY,
  PeriodLockedError,
  LicenseReadOnlyError,
  bindWriteGate,
  bindPeriodLockRegistry,
  readLockedPeriods,
  lockPeriod
};
