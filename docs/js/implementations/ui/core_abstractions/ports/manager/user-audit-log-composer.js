// user-audit-log-composer — port: the admin User Audit Log's range filter, order and CSV (F-24-06).

let _impl = null;

/// Root bootstrap binds { filterByDateRange, sortByTimestampDesc, buildAuditLogCsv } once.
export function bindUserAuditLogComposer(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/user-audit-log-composer: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (records, { from, to }) -> the records inside the inclusive day range
export const filterByDateRange = (...a) => _i().filterByDateRange(...a);
/// (records) -> newest first
export const sortByTimestampDesc = (...a) => _i().sortByTimestampDesc(...a);
/// (records) -> the CSV text
export const buildAuditLogCsv = (...a) => _i().buildAuditLogCsv(...a);
