// Unit-of-measure validators — pure functions, null=valid, string=error. (F-28-08 AC-01)
// Mirrors util/scac-validators.js for the units-of-measure master.

const ERR_CODE_REQ = 'Mã là bắt buộc';
const ERR_LABEL_REQ = 'Tên (VI) là bắt buộc';

// id === code for units-of-measure (seed migration key is e.code) — genId is the identity.
export function genUnitId(code) { return String(code || '').trim().toUpperCase(); }

// Returns null on valid, error string on invalid.
export function validateUnit(code, labelVi) {
  if (!code || !code.trim()) return ERR_CODE_REQ;
  if (!labelVi || !labelVi.trim()) return ERR_LABEL_REQ;
  return null;
}

// AC-01: uniqueness guard — id === code, so a dup id is a dup code.
export function checkCodeUnique(items, code, skipId = null) {
  const dup = items.find((i) => i.id === code && i.id !== skipId);
  return dup ? `Mã ${code} đã tồn tại` : null;
}
