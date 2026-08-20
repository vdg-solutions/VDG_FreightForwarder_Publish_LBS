// pnl-line-id — port: one ID scheme for `pnl_line`, used by BOTH entry paths (F-57-01).
//
// The manual form once minted `${ref}-L1` while the Excel import minted `${ref}-L000` from a
// counter that ran across the whole report — so an edit left the import's rows orphaned beside
// the new ones and the shipment's revenue DOUBLED. The index is 1-based and PER SHIPMENT in both
// paths now, and cleanup enumerates what exists instead of probing a fixed range.

let _impl = null;

/// Root bootstrap binds { pnlLineId, deletePnlLinesFor } once.
export function bindPnlLineId(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/pnl-line-id: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (ref, index) -> the canonical id. Synchronous: the form builder mints ids while rendering.
export const pnlLineId = (...a) => _i().pnlLineId(...a);
/// (repo, ref) -> rows deleted. Reaches both id schemes.
export const deletePnlLinesFor = (...a) => _i().deletePnlLinesFor(...a);
