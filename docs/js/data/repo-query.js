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

/// Equality filter on ONE column — the shape an index can answer.
///
/// A table is a folder and a record is a file, so `listWhere` costs a listing plus a download per
/// row. When the framework declares that column indexed, this asks the index instead and downloads
/// only the matches. It is the SAME answer either way: the reader reconciles the index against the
/// folder listing before trusting it, so a missing or stale index costs downloads, never accuracy.
///
/// Callers do not choose. They say what they want; whether an index exists is the framework's to
/// know — `equalsWhere(repo, 'local-charges', 'carrier', 'ONEY')` reads identically on a table
/// with an index and on one without.
export async function equalsWhere(repo, kind, column, value) {
  if (typeof repo?.index_ids_where === 'function') {
    try {
      const hit = await repo.index_ids_where(kind, column, String(value));
      const ids = new Set(hit?.ids ?? []);
      if (ids.size === 0) return [];
      // The index answers with IDS; the rows still come from the repo, which is what keeps the
      // index free of row content and therefore free of a second copy of the truth.
      const rows = await repo.list(kind, null);
      return (Array.isArray(rows) ? rows : []).filter((r) => ids.has(r?.id));
    } catch {
      /* an index failure is not a query failure — fall through to the scan below */
    }
  }
  return listWhere(repo, kind, (r) => String(r?.[column] ?? '') === String(value));
}

/// Is `value` already taken on a UNIQUE column? Returns the id holding it, or null.
/// Null means free — and it is trustworthy for the same reason: the listing is reconciled first.
/// A column the framework has NOT declared unique answers null too, because this store has no
/// opinion to offer there; a caller must not read that silence as "checked".
export async function uniqueHolder(repo, kind, column, value, byId = '') {
  if (typeof repo?.index_unique_holder !== 'function') return null;
  return repo.index_unique_holder(kind, column, String(value), String(byId)) ?? null;
}
