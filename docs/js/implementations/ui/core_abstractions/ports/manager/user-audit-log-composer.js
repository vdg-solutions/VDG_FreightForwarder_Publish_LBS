// user-audit-log-composer — port: the admin User Audit Log's range filter, order and CSV (F-24-06).
//
// The view names a day range and gets an answer. It does not hold the trail: the rows used to be
// read out to JS, parked in the view, and handed back in three times over.

let _impl = null;

/// Root bootstrap binds { auditLogRows, auditLogCsv } once.
export function bindUserAuditLogComposer(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/user-audit-log-composer: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// ({ from, to }) -> { ok, records, total, error } — inside the inclusive day range, newest first
export const auditLogRows = (...a) => _i().auditLogRows(...a);
/// ({ from, to }) -> { ok, csv, error } — the same range as a spreadsheet
export const auditLogCsv = (...a) => _i().auditLogCsv(...a);
