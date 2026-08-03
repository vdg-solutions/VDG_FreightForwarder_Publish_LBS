// util/pnl-line-id.js — F-57-01. One ID scheme for `pnl_line`, used by BOTH entry paths.
//
// The manual form (views/sales-new/submit-orchestrator.js) minted `${ref}-L1`, `${ref}-L2`…
// while the Excel import (operators/pnl-commit-orchestrator.js) minted `${ref}-L000`,
// `${ref}-L001`… from a counter that ran across the WHOLE report and restarted at 0 on the
// next import. Two consequences, both silent:
//
//   1. `_deletePnlLines` probed `${ref}-L1` … `${ref}-L50` only, so editing a shipment whose
//      lines came from an import left every `-L000`-style row orphaned and wrote the new
//      `-L1` rows alongside them. The shipments grid and sales analytics both aggregate from
//      `pnl_line`, so the shipment's revenue DOUBLED after one edit.
//   2. The import counter was never reset per shipment, so re-importing a corrected workbook
//      with one fewer line on an earlier shipment shifted every later shipment's line IDs and
//      stranded the tail of the previous import.
//
// Fix: index is 1-based and PER SHIPMENT in both paths, and cleanup enumerates what actually
// exists instead of probing a fixed range.

const KIND_PNL_LINE = 'pnl_line';
const ID_SEPARATOR  = '-L';

/**
 * Canonical pnl_line id.
 * @param {string} ref   shipment_ref the line belongs to
 * @param {number} index 1-based position within THAT shipment
 */
export function pnlLineId(ref, index) {
  return `${ref}${ID_SEPARATOR}${index}`;
}

/** True when `id` is a pnl_line belonging to `ref` — matches both the current scheme and the
 *  legacy zero-padded `-L000` form, so cleanup reaches rows written before this fix. */
export function isPnlLineIdFor(id, ref) {
  if (typeof id !== 'string' || !id.startsWith(ref + ID_SEPARATOR)) return false;
  return /^\d+$/.test(id.slice(ref.length + ID_SEPARATOR.length));
}

/**
 * Delete every pnl_line currently attached to `ref`, whichever scheme wrote it.
 * Enumerates the repo rather than probing a fixed 1..N range — a fixed range is what let the
 * legacy `-L000` rows survive and double the revenue.
 * @param {object} repo EntityRepo — list(kind, predicate) / delete(kind, id)
 * @param {string} ref  shipment_ref
 * @returns {Promise<number>} rows deleted
 */
export async function deletePnlLinesFor(repo, ref) {
  const rows = await repo.list(
    KIND_PNL_LINE,
    (r) => r?.shipment_ref === ref || isPnlLineIdFor(r?.id, ref),
  ).catch(() => []);

  let deleted = 0;
  for (const row of rows) {
    if (!row?.id) continue;
    await repo.delete(KIND_PNL_LINE, row.id);
    deleted++;
  }
  return deleted;
}
