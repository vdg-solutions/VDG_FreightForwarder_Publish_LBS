// repo-query.js — filtered reads over the WASM repo.
//
// Why this exists: `WasmEntityRepo.list` is a wasm-bindgen export and takes ONE argument. Five call
// sites passed a second one — a JS predicate — and wasm-bindgen dropped it without a word, so every
// one of them silently received the WHOLE table. Measured live: `repo.list('shipment', () => false)`
// returned all 7 rows, and `repo.list.length` is 1.
//
// What that cost, before it was found:
//   - `checkAlreadyConverted` looked for a shipment carrying this quote id, got the full list, took
//     [0], and reported EVERY accepted quote as already converted — quote → shipment was dead, and
//     it named an unrelated shipment while doing it;
//   - the quote list filtered "mine" for a SalesRep and showed them everyone's quotes;
//   - the note and budget prints asked for one shipment's P&L lines and got every shipment's.
//
// The filter has to run in JS because the predicate is a JS closure; the fix is to make that
// explicit at the call site instead of handing it to a boundary that ignores it. A residue guard
// (tests/unit/e-43-repo-list-filter.test.mjs) fails the build if a second argument comes back.

/// List one kind and apply `predicate` in JS. A null/absent predicate returns everything, which is
/// what `repo.list(kind, null)` already means — so this is a drop-in for the dropped-filter form.
export async function listWhere(repo, kind, predicate = null) {
  const rows = await repo.list(kind, null);
  if (typeof predicate !== 'function') return rows;
  return (Array.isArray(rows) ? rows : []).filter(predicate);
}
