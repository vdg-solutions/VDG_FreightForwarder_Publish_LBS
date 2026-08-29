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

// F1: the bank never buys for more than it sells — an inverted spread is a data-entry mistake,
// not a rate a resolver should ever hand back.
export function validateSpread(rateBuy, rateSell) {
  if (Number(rateBuy) > Number(rateSell)) return 'fx.validation.bad_spread';
  return null;
}

// Append a range entry through the write-gated path. Returns error i18n key on
// a pure-input rejection, null on success (append errors propagate to the caller).
// deleteFirst: old entry to remove before re-add (edit flow); null for new entry.
// F1: entry captures BOTH sides of the quote — no single "rate" any more.
export async function addRateEntry(repo, validFrom, validTo, pair, rateBuy, rateSell, source, role, deleteFirst) {
  if (validFrom > validTo) return 'fx.validation.bad_range';
  if (deleteFirst) {
    try { await repo.deleteEntry(deleteFirst.valid_from, deleteFirst.valid_to, deleteFirst.pair || pair); }
    catch { /* tolerate not-found on edit-delete */ }
  }
  await repo.appendRate(
    JSON.stringify({
      valid_from: validFrom, valid_to: validTo, pair,
      rate_buy: Number(rateBuy), rate_sell: Number(rateSell), source,
    }),
    role,
  );
  return null;
}
