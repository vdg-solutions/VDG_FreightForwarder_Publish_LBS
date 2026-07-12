// Pure rate validator + entry-append helper — no Drive I/O. (AC-04, AC-05)

const VALID_RATE_MIN = 0;
const VALID_RATE_MAX = 100_000;
export const FX_PAIR_DEFAULT = 'USD/VND';

// Returns i18n key on error, null on valid.
export function validateRate(rawValue) {
  const n = Number(rawValue);
  if (!rawValue || isNaN(n) || n <= VALID_RATE_MIN || n >= VALID_RATE_MAX) {
    return 'fx.validation.bad_rate';
  }
  return null;
}

// Dup-check then append. Returns error i18n key on rejection, null on success.
// deleteFirst: old entry to remove before re-add (edit flow); null for new entry.
export async function addRateEntry(repo, date, pair, rate, source, deleteFirst) {
  if (!deleteFirst) {
    const dup = await repo.exists(date, pair);
    if (dup) return 'fx.validation.dup_date';
  } else {
    try { await repo.deleteEntry(deleteFirst.date, deleteFirst.pair || pair); }
    catch { /* tolerate not-found on edit-delete */ }
  }
  await repo.appendRate(JSON.stringify({ date, pair, rate: Number(rate), source }));
  return null;
}
