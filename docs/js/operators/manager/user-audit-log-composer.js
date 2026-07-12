// user-audit-log-composer.js — pure logic for the admin User Audit Log view (F-24-06).
// No I/O: date-range filter, timestamp sort, CSV build. Mirrors users-view-composer.js /
// air-invoice.js::buildCassCSV.

const CSV_HEADERS = ['ts', 'actor_email', 'action', 'target_email', 'before', 'after', 'drive_ops'];

/// AC-04: date range filter is inclusive on both ends, comparing the ISO ts prefix (YYYY-MM-DD)
/// against the <input type=date> value so a single day's range = "from == to" matches.
export function filterByDateRange(records, { from = '', to = '' } = {}) {
  return records.filter((r) => {
    const day = (r.ts || '').slice(0, 10);
    if (from && day < from) return false;
    if (to   && day > to)   return false;
    return true;
  });
}

/// Newest first — matches manager/audit.js convention for compliance/change logs.
export function sortByTimestampDesc(records) {
  return [...records].sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
}

/// RFC 4180 minimal quoting — mirrors air-invoice.js::csvField.
export function csvField(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/// AC-05: header + one row per record, timestamp-sorted by the caller (sortByTimestampDesc).
/// before/after/drive_ops are JSON-serialized so a single audit row survives a spreadsheet round-trip.
export function buildAuditLogCsv(records) {
  const rows = records.map((r) => [
    r.ts,
    r.actor_email,
    r.action,
    r.target_email,
    JSON.stringify(r.before ?? null),
    JSON.stringify(r.after ?? null),
    JSON.stringify(r.drive_ops ?? []),
  ].map(csvField).join(','));

  return [CSV_HEADERS.join(','), ...rows].join('\n');
}
