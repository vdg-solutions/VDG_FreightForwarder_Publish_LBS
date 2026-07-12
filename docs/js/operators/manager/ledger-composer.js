// ledger-composer.js — pure logic for the accountant ledger viewer (F-23-04).
// No I/O: chart grouping, leg filtering, running-balance calc, CSV builder.

export const CHART_GROUP_ORDER = ['Asset', 'Liability', 'Revenue', 'Expense'];

const CSV_HEADER = ['date', 'entry_id', 'desc', 'debit', 'credit', 'party', 'source', 'balance'];

/// AC-03: chart of accounts -> groups in fixed type order, skipping empty types.
export function groupChartByType(accounts) {
  return CHART_GROUP_ORDER
    .map((type) => ({ type, accounts: accounts.filter((a) => a.account_type === type) }))
    .filter((g) => g.accounts.length > 0);
}

function legAmount(leg) { return Math.max(leg.debit || 0, leg.credit || 0); }

function legSourceId(leg) { return leg.source?.id ?? ''; }

/// AC-05/AC-06: date range (inclusive, lexical ISO) + amount range (on max(debit,credit))
/// + case-insensitive substring search across desc/party/entry_id/source.id. All AND.
export function filterLegs(legs, { dateFrom, dateTo, minAmount, maxAmount, search } = {}) {
  const min    = minAmount === '' || minAmount == null ? null : Number(minAmount);
  const max    = maxAmount === '' || maxAmount == null ? null : Number(maxAmount);
  const needle = (search || '').trim().toLowerCase();

  return legs.filter((leg) => {
    if (dateFrom && leg.date < dateFrom) return false;
    if (dateTo   && leg.date > dateTo)   return false;

    const amount = legAmount(leg);
    if (min != null && amount < min) return false;
    if (max != null && amount > max) return false;

    if (needle) {
      const haystack = [leg.desc, leg.party, leg.entry_id, legSourceId(leg)]
        .filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

/// AC-07: legs need not be pre-sorted — sorted ascending by (date, seq) internally so the
/// cumulative running_balance is chronologically correct regardless of caller/display order.
/// balance_side 'Debit' -> running += debit - credit; 'Credit' -> running += credit - debit.
export function computeRunningBalances(legs, balanceSide) {
  const sorted = [...legs].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (a.seq || 0) - (b.seq || 0);
  });

  let running = 0;
  return sorted.map((leg) => {
    const delta = balanceSide === 'Credit'
      ? (leg.credit || 0) - (leg.debit || 0)
      : (leg.debit  || 0) - (leg.credit || 0);
    running += delta;
    return { ...leg, running_balance: running };
  });
}

/// AC-08: RFC-4180 minimal quoting — same behavior as air-invoice.js::csvField.
export function csvField(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/// AC-08: header + one row per leg (already filtered/balanced/sorted by the caller).
export function buildLedgerCSV(rows) {
  const lines = [CSV_HEADER.join(',')];
  for (const row of rows) {
    lines.push([
      row.date,
      row.entry_id,
      csvField(row.desc),
      row.debit ?? 0,
      row.credit ?? 0,
      csvField(row.party ?? ''),
      csvField(legSourceId(row) ? `${row.source.type}:${row.source.id}` : ''),
      row.running_balance ?? 0,
    ].join(','));
  }
  return lines.join('\n');
}
