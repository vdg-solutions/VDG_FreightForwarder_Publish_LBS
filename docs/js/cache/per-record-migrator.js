// per-record-migrator.js — bring a workspace forward to the one-file-per-record layout.
//
// Two shapes of legacy, both declared by the framework (cache_policy::RecordKindSpec) and neither
// invented here:
//
//   1. a BUNDLE — `<dir>/*.jsonl`, one file holding a whole table or a whole month. Banned
//      outright (owner 2026-08-17): Drive has no append, so every write reuploads the lot and two
//      people editing two different rows collide on one file. Each row is copied to its own
//      `<id>.json`, and the bundle is trashed only once EVERY row of it is settled at its
//      destination — an unstamped copy is not "arrived", and stopping early is not failing.
//
//   2. a MOVED HOME — `legacy_dirs` names where the kind used to live. The read-broad tables all
//      moved under one `_shared` folder so provisioning a reader is one sharing operation rather
//      than fifteen, and the walled ones moved OUT of it so a wholesale grant cannot reach them.
//
// Manager-only and bounded: one writer converts, everyone else simply starts seeing record files
// through delta; MAX_RECORDS_PER_SWEEP keeps a large backlog from stalling boot.

const BUNDLE_SUFFIX         = '.jsonl';
const RECORD_SUFFIX         = '.json';
const MONTH_RE              = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_RECORDS_PER_SWEEP = 25;

/// One kind's sweep over ONE folder. `ws` = the generic workspace-file port ({ ws_list_dir,
/// ws_read_file, ws_write_file }) and `trashFile(fileId)` the recoverable delete.
/// `from` is the folder being drained; `spec.dir` is always the destination.
export async function explodeBundles(ws, trashFile, spec, from = spec.dir) {
  const home    = await ws.ws_list_dir(from);
  const bundles = (home.files ?? []).filter((f) => f.name.endsWith(BUNDLE_SUFFIX));
  let written   = 0;
  const report  = { kind: spec.kind, from, bundles: bundles.length, written: 0, trashed: 0, moved: 0, stopped: false };

  for (const bundle of bundles) {
    const data = await ws.ws_read_file(from, bundle.name);
    if (!data?.found) continue;
    const rows = String(data.content ?? '').split('\n')
      .map((l) => l.trim()).filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter((r) => r && typeof r === 'object' && r.id);

    let allSettled = true;
    for (const row of rows) {
      const partition = _partitionOf(row, bundle.name, spec);
      if (partition === null) { allSettled = false; continue; } // no coordinate — leave it, loudly
      if (written >= MAX_RECORDS_PER_SWEEP) { report.stopped = true; allSettled = false; break; }

      const dir  = partition ? `${spec.dir}/${partition}` : spec.dir;
      const name = `${row.id}${RECORD_SUFFIX}`;
      const existing = await ws.ws_read_file(dir, name);
      if (_settled(existing, row)) continue;

      // Create-or-overwrite with the bundle row. No CAS: the manager is the only converter,
      // and a CONCURRENT app write to the same record carries a higher _rev, which _settled
      // recognizes on the next sweep instead of this write clobbering it silently.
      await ws.ws_write_file(dir, name, JSON.stringify(row) + '\n',
        existing?.found ? existing.id : '', '');
      written += 1;
      report.written += 1;
    }

    if (allSettled && !report.stopped) {
      await trashFile(bundle.id);
      report.trashed += 1;
    }
    if (report.stopped) break;
  }
  return report;
}

/// Carry already-per-record files across a home that moved. Same settled-at-destination rule as
/// the bundle path — the source file is only trashed once its copy is provably at least as new.
async function _relocateRecords(ws, trashFile, spec, from, budget) {
  const listing = await ws.ws_list_dir(from);
  const records = (listing.files ?? []).filter((f) => f.name.endsWith(RECORD_SUFFIX));
  let moved = 0;
  for (const file of records) {
    if (moved >= budget) return { moved, stopped: true };
    const data = await ws.ws_read_file(from, file.name);
    if (!data?.found) continue;
    let row = null;
    try { row = JSON.parse(String(data.content ?? '').trim()); } catch { row = null; }
    if (!row || typeof row !== 'object' || !row.id) continue;

    const partition = _partitionOf(row, '', spec);
    const dir       = partition ? `${spec.dir}/${partition}` : spec.dir;
    const existing  = await ws.ws_read_file(dir, file.name);
    if (!_settled(existing, row)) {
      await ws.ws_write_file(dir, file.name, JSON.stringify(row) + '\n',
        existing?.found ? existing.id : '', '');
      moved += 1;
    }
    await trashFile(file.id);
  }
  return { moved, stopped: false };
}

/// Which subfolder of the destination a row belongs in.
/// `''` = none, the table IS the folder (a master has no time axis).
/// `null` = undecidable — leave the row where it is rather than invent a home for it.
function _partitionOf(row, bundleName, spec) {
  if (!spec.partitioned) return '';
  const stem = bundleName.endsWith(BUNDLE_SUFFIX)
    ? bundleName.slice(0, -BUNDLE_SUFFIX.length) : '';
  if (MONTH_RE.test(stem)) return stem;               // 2026-08.jsonl → its own month
  if (MONTH_RE.test(row._period)) return row._period; // a stamped row carries its home
  const etd = String(row.etd ?? '').slice(0, 7);
  return MONTH_RE.test(etd) ? etd : null;
}

/// Arrived means STAMPED and at least as recent — an unstamped or older copy is a copy of
/// the past, and overwriting the future with it is the resurrection bug (F-37 lesson).
function _settled(existing, row) {
  if (!existing?.found) return false;
  let cur = null;
  try { cur = JSON.parse(String(existing.content ?? '').trim()); } catch { cur = null; }
  if (!cur || typeof cur !== 'object') return false;
  return Number(cur._rev ?? 0) >= Number(row._rev ?? 0);
}

/// A table whose HOME moved but whose store has no registry row (`awb_store`, the ledger).
/// The files are re-parented rather than rewritten: ids and versions survive, so the delta
/// engine's witness table stays valid and nothing re-downloads. Declared by the framework
/// (`cache_policy::FOLDER_RELOCATIONS`) for the same reason `legacy_dirs` is.
export async function relocateFolders(ws, moveFile, pairs) {
  const reports = [];
  for (const { from, to } of pairs) {
    try {
      const src = await ws.ws_list_dir(from);
      const files = (src.files ?? []).filter((f) => !f.mimeType || !f.mimeType.endsWith('.folder'));
      if (!files.length) continue;
      const dst = await ws.ws_list_dir(to);
      const taken = new Set((dst.files ?? []).map((f) => f.name));
      let moved = 0;
      for (const f of files) {
        // A name already at the destination is the previous run's work — moving a second copy
        // in would leave two files claiming one period, which is the duplicate-bundle class.
        if (taken.has(f.name)) continue;
        await moveFile(f.id, dst.folderId, src.folderId);
        moved += 1;
      }
      reports.push({ from, to, moved });
    } catch (err) {
      console.warn('[per-record-migrator] relocate', from, '->', to, 'failed:', err.message); // DEV
    }
  }
  return reports;
}

/// Boot entry: manager only, every registered kind, fire-and-forget from the caller.
/// The kind list, its destination, its partitioning and its old addresses all come from the
/// framework — this module decides nothing about layout, it only moves bytes.
export async function migratePerRecordKinds({ wasm, ws, trashFile, moveFile, isManager }) {
  if (!isManager) return [];
  const specs = wasm?.per_record_kinds?.() ?? [];
  const reports = [];
  if (typeof moveFile === 'function') {
    reports.push(...await relocateFolders(ws, moveFile, wasm?.folder_relocations?.() ?? []));
  }
  for (const spec of specs) {
    try {
      const report = await explodeBundles(ws, trashFile, spec);
      for (const from of spec.legacy_dirs ?? []) {
        if (from === spec.dir) continue;
        const legacy = await explodeBundles(ws, trashFile, spec, from);
        report.bundles += legacy.bundles;
        report.written += legacy.written;
        report.trashed += legacy.trashed;
        report.stopped = report.stopped || legacy.stopped;
        if (report.stopped) break;
        const carried = await _relocateRecords(ws, trashFile, spec, from,
          MAX_RECORDS_PER_SWEEP - report.written);
        report.moved  += carried.moved;
        report.stopped = report.stopped || carried.stopped;
        if (report.stopped) break;
      }
      reports.push(report);
    } catch (err) {
      console.warn('[per-record-migrator]', spec.kind, 'sweep failed:', err.message); // DEV — next boot retries
    }
  }
  return reports;
}
