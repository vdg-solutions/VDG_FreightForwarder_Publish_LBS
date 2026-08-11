// ULD validators — pure fns, null=valid, string=error. (AC-02)

const ULD_CODE_RE  = /^[A-Z]{3}$/;
const ERR_ULD_CODE = '3 uppercase letters, e.g. AKE';

// Returns null on valid, error string on invalid.
export function validateUldCode(code) {
  return ULD_CODE_RE.test(code) ? null : ERR_ULD_CODE;
}

// AC-04: uniqueness guard — returns error or null
export function checkUldCodeUnique(items, code, skipId = null) {
  const dup = items.find((i) => i.code === code && i.id !== skipId);
  return dup ? `ULD code ${code} already exists` : null;
}
