// Pure rate validator + entry-append helper — no Drive I/O. (AC-04)
// F-29-11: overlap validation lives once at the Rust write path (fx_rate_prepare_append),
// not duplicated here. Entries carry an explicit valid_from/valid_to range and a role.

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

// Append a range entry through the write-gated path. Returns error i18n key on
// a pure-input rejection, null on success (append errors propagate to the caller).
// deleteFirst: old entry to remove before re-add (edit flow); null for new entry.
export async function addRateEntry(repo, validFrom, validTo, pair, rate, source, role, deleteFirst) {
  if (validFrom > validTo) return 'fx.validation.bad_range';
  if (deleteFirst) {
    try { await repo.deleteEntry(deleteFirst.valid_from, deleteFirst.valid_to, deleteFirst.pair || pair); }
    catch { /* tolerate not-found on edit-delete */ }
  }
  await repo.appendRate(
    JSON.stringify({ valid_from: validFrom, valid_to: validTo, pair, rate: Number(rate), source }),
    role,
  );
  return null;
}
