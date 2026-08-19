// SCAC / ocean-carrier validators — pure functions, null=valid, string=error. (F-26-04 AC-01)
// Mirrors util/iata-validators.js for the sea-freight side.

const SCAC_RE = /^[A-Z]{2,4}$/;

const ERR_SCAC     = '2-4 uppercase letters, e.g. WHLC';
const ERR_NAME_REQ = 'Name is required';

// Returns null on valid, error string on invalid.
export function validateScac(code) {
  return SCAC_RE.test(code) ? null : ERR_SCAC;
}

// AC-01: uniqueness guard — returns error string or null
export function checkScacUnique(items, scac, skipId = null) {
  const dup = items.find((i) => i.scac === scac && i.id !== skipId);
  return dup ? `SCAC ${scac} already exists` : null;
}

// AC-01: composite validator for OceanCarrier entity
export function validateOceanCarrier({ scac, name }) {
  const e1 = validateScac(scac);
  if (e1) return `SCAC: ${e1}`;
  if (!name || !name.trim()) return ERR_NAME_REQ;
  return null;
}
