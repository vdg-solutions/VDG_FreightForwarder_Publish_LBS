// pivot-row-groups.js — rowspan layout for the P&L pivot body. Pure (no DOM, no Lit) so the one
// invariant that matters here is unit-reachable: EVERY row wasm returned gets drawn exactly once.
//
// This used to be a `Map<dim0, Map<dim1, row>>` built inline in pivot-table.js, and the inner
// `Map.set` OVERWRITES on a duplicate key. Whenever the composer grouped by more dimensions than
// the table has columns for — "Tất cả" mode prepends `mode` to the two the user picked — rows
// that agreed on (dim0, dim1) and differed only in the third silently replaced one another, while
// the grand total went on summing the FULL row set. That is the whole of the reported defect: a
// total of 671.4M over 3 shipments printed above a single row reading 26.8M over 1.
//
// Grouping is layout, not arithmetic: it decides which cells merge, never what anything sums to.

const NO_VALUE = '—';

/**
 * @param {Array}  rows  the composer's rows, each with a `dims` object
 * @param {string} dim0  dimension drawn in the merged (rowspan) column
 * @param {string} dim1  dimension drawn in the second column
 * @returns {Map<string, Array<{label: string, row: object}>>} insertion-ordered, lossless
 */
export function groupRowsForDisplay(rows, dim0, dim1) {
  const groups = new Map();
  for (const row of rows || []) {
    const key   = row?.dims?.[dim0] || NO_VALUE;
    const label = row?.dims?.[dim1] || NO_VALUE;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ label, row });
  }
  return groups;
}

/// Total rows a grouping will draw — the count the grand total must be computed over.
export function groupedRowCount(groups) {
  let n = 0;
  for (const entries of groups.values()) n += entries.length;
  return n;
}
