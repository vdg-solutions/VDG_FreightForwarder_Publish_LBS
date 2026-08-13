// per-record-migrator.js — F-38-04: explode legacy month bundles into per-record files.
//
// A kind in the Rust PER_RECORD_REGISTRY reads/writes `<dir>/<YYYY-MM>/<id>.json`; whatever
// `<dir>/*.jsonl` bundles remain are pre-flip leftovers. Each bundle row is copied to its
// record file, and only when EVERY row of a bundle is settled at its destination does the
// bundle go to the trash — same settled-at-destination discipline as master-scope-migrator.js
// (an unstamped copy is not "arrived"; stopping early is not failing, the next boot continues).
//
// Manager-only and bounded: one writer explodes, employees just start seeing record files
// through delta; MAX_RECORDS_PER_SWEEP keeps a huge backlog from stalling boot.

const BUNDLE_SUFFIX          = '.jsonl';
const RECORD_SUFFIX          = '.json';
const MONTH_RE               = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_RECORDS_PER_SWEEP  = 25;

/// One kind's sweep. `ws` = the generic workspace-file port ({ ws_list_dir, ws_read_file,
/// ws_write_file }) and `trashFile(fileId)` the recoverable delete. Returns a report.
export async function explodeBundles(ws, trashFile, spec) {
  const home = await ws.ws_list_dir(spec.dir);
  const bundles = (home.files ?? []).filter((f) => f.name.endsWith(BUNDLE_SUFFIX));
  let written = 0;
  const report = { kind: spec.kind, bundles: bundles.length, written: 0, trashed: 0, stopped: false };

  for (const bundle of bundles) {
    const data = await ws.ws_read_file(spec.dir, bundle.name);
    if (!data?.found) continue;
    const rows = String(data.content ?? '').split('\n')
      .map((l) => l.trim()).filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter((r) => r && typeof r === 'object' && r.id);

    let allSettled = true;
    for (const row of rows) {
      const partition = _partitionOf(row, bundle.name);
      if (!partition) { allSettled = false; continue; } // no coordinate — leave it in the bundle, loudly
      if (written >= MAX_RECORDS_PER_SWEEP) { report.stopped = true; allSettled = false; break; }

      const dir  = `${spec.dir}/${partition}`;
      const name = `${row.id}${RECORD_SUFFIX}`;
      const existing = await ws.ws_read_file(dir, name);
      if (_settled(existing, row)) continue;

      // Create-or-overwrite with the bundle row. No CAS: the manager is the only exploder,
      // and a CONCURRENT app write to the same record carries a higher _rev, which _settled
      // recognizes on the next sweep instead of this write clobbering it silently.
      await ws.ws_write_file(dir, name, JSON.stringify(row) + '\n',
        existing?.found ? existing.id : '', '');
      written += 1;
      report.written += 1;
    }

    if (allSettled && rows.length >= 0 && !report.stopped) {
      await trashFile(bundle.id);
      report.trashed += 1;
    }
    if (report.stopped) break;
  }
  return report;
}

function _partitionOf(row, bundleName) {
  const stem = bundleName.slice(0, -BUNDLE_SUFFIX.length);
  if (MONTH_RE.test(stem)) return stem;               // 2026-08.jsonl → its own month
  if (MONTH_RE.test(row._period)) return row._period; // all.jsonl rows carry their home stamp
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

/// Boot entry: manager only, every registered kind, fire-and-forget from the caller.
export async function migratePerRecordKinds({ wasm, ws, trashFile, isManager }) {
  if (!isManager) return [];
  const specs = wasm?.per_record_kinds?.() ?? [];
  const reports = [];
  for (const spec of specs) {
    try { reports.push(await explodeBundles(ws, trashFile, spec)); }
    catch (err) {
      console.warn('[per-record-migrator]', spec.kind, 'sweep failed:', err.message); // DEV — next boot retries
    }
  }
  return reports;
}
