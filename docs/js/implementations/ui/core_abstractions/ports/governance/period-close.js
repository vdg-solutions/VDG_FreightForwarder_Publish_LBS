// period-close — port: closing and reopening an accounting period, and the checklist a manager
// signs off. The lock the write gate obeys is the one Rust writes; the screen never keeps a
// second copy of "closed".

export const PERIOD_CLOSE_KIND  = 'period_close';
export const PERIOD_REOPEN_KIND = 'period_reopen';
export const REASON_MAX_CHARS   = 500;

let _impl = null;

/// Root bootstrap binds { getCurrentPeriodLock, loadClosedPeriods, listCloseRecords,
/// runPreCloseChecks, closePeriod, reopenPeriod } once.
export function bindPeriodClose(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/period-close: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (repo, period) -> { locked, record }
export const getCurrentPeriodLock = (...a) => _i().getCurrentPeriodLock(...a);
/// (repo) -> the closed period keys, for the screen's markers
export const loadClosedPeriods = (...a) => _i().loadClosedPeriods(...a);
/// (repo) -> the close records the ledger reads its opening balances off
export const listCloseRecords = (...a) => _i().listCloseRecords(...a);
/// (repo, period) -> [{ id, label, severity, failCount, failIds }]
export const runPreCloseChecks = (...a) => _i().runPreCloseChecks(...a);
/// (repo, period, user, checklist, ledgerRepo) -> { accountCount, failed, skipped }
export const closePeriod = (...a) => _i().closePeriod(...a);
/// (repo, period, reason, user) -> { token }
export const reopenPeriod = (...a) => _i().reopenPeriod(...a);
