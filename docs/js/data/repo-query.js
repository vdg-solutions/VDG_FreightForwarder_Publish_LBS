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

/// Equality filter on ONE column.
///
/// It reads the LOCAL store and filters there — `repo.list` is the SQLite/OPFS cache, so this
/// costs zero Drive calls. That is the correction to a mistake worth recording: the first version
/// of this function routed the query through the Drive-side index, which meant a folder listing
/// plus a download per match, for a table already sitting on the machine. It made queries slower
/// and called it acceleration. Drive is the source of truth; the client is where you ask questions.
export async function equalsWhere(repo, kind, column, value) {
  return listWhere(repo, kind, (r) => String(r?.[column] ?? '') === String(value));
}

/// Is `value` already taken on a UNIQUE column? Returns the id holding it, or null.
///
/// THIS is what the Drive-side index is for, and the one thing the local database cannot do.
/// SQLite sees only what THIS client has hydrated, so two people creating the same tax code both
/// pass their own uniqueness check and collide on Drive, where nothing was watching. The index
/// file is the single shared witness — reconciled against the folder listing before it answers,
/// so it is as good as a scan and much cheaper.
///
/// Still advisory, and honestly so: Drive has no transaction spanning the check and the write, so
/// two clients racing at the same instant can both pass. It closes the ordinary case (someone
/// re-typing a customer that already exists), not the simultaneous one.
///
/// A column the framework has NOT declared unique answers null — meaning "no opinion", never
/// "checked, and it is free".
export async function uniqueHolder(repo, kind, column, value, byId = '') {
  if (typeof repo?.index_unique_holder !== 'function') return null;
  return repo.index_unique_holder(kind, column, String(value), String(byId)) ?? null;
}
