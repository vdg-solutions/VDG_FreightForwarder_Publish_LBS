// priced-envelope.js — the FROZEN PricedRecord envelope a priced-master row is stored under
// (effective-dated: pricing_key + valid_from/valid_to + currency, body = the row verbatim). Shared
// by the migrator that seeds it and the repo that guards overlaps on write.

const REQUIRED_ROW_FIELDS  = ['pricing_key', 'valid_from', 'valid_to'];
const UNKNOWN_CURRENCY     = { Other: 'UNKNOWN' }; // structural default; rows carry a currency in practice
const KNOWN_CURRENCY_CODES = new Set(['VND', 'USD', 'CNY', 'EUR', 'JPY', 'KRW', 'SGD', 'THB', 'INR']);


function _normalizeCurrency(code) {
  if (!code) return UNKNOWN_CURRENCY;
  const up = String(code).toUpperCase();
  if (KNOWN_CURRENCY_CODES.has(up)) return up.charAt(0) + up.slice(1).toLowerCase(); // "VND" -> "Vnd"
  return { Other: String(code) };
}

/**
 * Wrap one bundle row in the FROZEN PricedRecord envelope. body = whole row verbatim (no-loss).
 *
 * `pricing_key` is READ from the row, never derived from the id. Deriving it made every record
 * its own key, and that quietly disabled the whole effective-dating layer: no two records could
 * ever share a key, so the overlap guard could not fire and `resolveOnDate` matched nothing —
 * the ocean-tariff seed's two half-year WHLC windows resolved as two unrelated rates.
 *
 * The three fields are required, not defaulted. A default here is indistinguishable from a real
 * open-ended window at read time, so a row that forgot its dates would price as if it were in
 * force forever. Throwing names the row and the field instead.
 */
export function toPricedEnvelope(id, row) {
  const missing = REQUIRED_ROW_FIELDS.filter((f) => !row?.[f]);
  if (missing.length) throw new Error(`priced row '${id}' is missing ${missing.join(', ')}`);
  return {
    record_id:   id,
    pricing_key: row.pricing_key,
    valid_from:  row.valid_from,
    valid_to:    row.valid_to,
    currency:    _normalizeCurrency(row.currency),
    body:        row,
  };
}
