// note-lines — port: debit/credit note lines derived from a shipment's own P&L lines, and their
// total (F-57-01) — the number printed on a page the customer receives. Root bootstrap binds it
// to the wasm freight_app export; JS only hands over the raw pnl_line rows and renders the reply.

let _impl = null;

/// Root bootstrap binds { derive } once.
export function bindNoteLines(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/note-lines: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (pnlLineRows, noteType) -> { lines: [{ description, qty, currency, unit_amount, total }], total }
export const deriveNoteLines = (...a) => _i().derive(...a);
