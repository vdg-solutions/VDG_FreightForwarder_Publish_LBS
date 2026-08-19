// cache/master-scope-migrator.js — F-28-02: one-time boot sweep of local-charges /
// units-of-measure per-user records into the now-shared master.
//
// master-registry.js flipped these two kinds to audience:'team', so the resolver in
// the framework now reads/writes them under the shared zone. Records a user
// already wrote under the OLD users/{prefix}/<kind> path would be stranded there — this
// module reads that old path directly (the folder resolver no longer points at it) and
// replays each record through repo.put(kind, id, record), the normal per-record write path.
//
// repo.put() alone used to blind-overwrite a same-id/different-content collision — F-28-06
// closed that at the source: the Rust rebase (apply_put, sync_engine.rs) gates every put on
// the _rev it was edited from, and a legacy per-user record (no _rev — never fetched through
// the new stamping) naturally lands as Base::New. Against an id that already exists in the
// shared bundle, that is a genuine divergence and surfaces as vdg:conflict-detected instead
// of silently overwriting — no resolver call needed here anymore. Identical content is
// skipped outright as a cheap short-circuit (no redundant put).

import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../../../kernel/core_abstractions/util/safe-await.js';
import { putShipment } from '../../core_abstractions/ports/shipment-repo.js';
import { pnlLineId } from '../../core_abstractions/pnl-line-id.js';
import { parseJsonlBundle } from '../../../kernel/core_abstractions/util/jsonl-bundle.js';

const MIGRATED_META_PREFIX = 'master-scope-migrated.'; // + kind
const AUDIT_KIND           = 'audit_log';
const CENSUS_EVENT         = 'master-scope-migration';
const USERS_ROOT           = 'users';

// An entry is either a kind string (scope flip — same kind, old per-user folder → shared) or
// { read, write } (F-57-01 kind RENAME — records were written under a kind string that was never
// registered, so they must be read from the old folder and replayed under the correct kind).
export const MASTER_SCOPE_MIGRATION_KINDS = [
  'local-charges',
  'units-of-measure',
  // F-57-01: manager-set commission splits were per-user, so the rep never resolved them.
  'commission_rules',
  // F-57-01: 'carrier' was never a registered kind — every Excel import stranded its carrier
  // masters in users/{prefix}/carrier/ while the real master stayed empty.
  { read: 'carrier', write: 'carriers' },
  // E-37: shipments written before the split are stranded in the fork the resolver no
  // longer points at, so the owner would simply stop seeing their own pilot jobs. They go
  // back through putShipment, which splits them - a plain repo.put would land the whole
  // record, revenue included, in the folder CS reads.
  //
  { read: 'shipment', write: 'shipment', via: _replayShipment },
];

// A sweep must not take the tab hostage. Replaying a whole backlog in one boot is what turned
// 50 stranded shipments into a session that stopped answering: every write re-enters the sync
// engine, and the cost of that is not the migrator's to spend all at once. The rest goes on the
// next boot — the flag is only set by a sweep that found nothing left to do.
export const MAX_RECORDS_PER_SWEEP = 10;

/**
 * The same id, once.
 *
 * The old folder holds DUPLICATE bundles (concurrent first-writers — the family bundle-file-heal
 * merges), so reading it yields the same job several times with divergent bodies. Replaying each
 * copy writes the job repeatedly and the later copies land as conflicts AGAINST THE MIGRATION'S
 * OWN earlier write. Same rule as the heal: higher _rev wins, newer stamp breaks the tie.
 */
function _dedupeById(records) {
  const best = new Map();
  for (const rec of records) {
    const id = rec?.id;
    if (!id) continue;
    const prev = best.get(id);
    if (!prev || _wins(rec, prev)) best.set(id, rec);
  }
  return [...best.values()];
}

function _wins(a, b) {
  const ra = Number(a?._rev ?? 0);
  const rb = Number(b?._rev ?? 0);
  if (ra !== rb) return ra > rb;
  return String(a?._rev_at ?? '') > String(b?._rev_at ?? '');
}

// Lines written before E-37 carry no line_id, and shipment_split refuses a line without one
// (an unjoinable line reads as a line that earned nothing). Stamp with the SAME scheme the
// form uses, so a migrated job and a new one have one line vocabulary.
async function _replayShipment(repo, _kind, id, record) {
  const ref   = record.shipment_ref || id;
  const lines = (record.pnl_lines || []).map((ln, i) => ({ line_id: ln.line_id || pnlLineId(ref, i + 1), ...ln }));
  await putShipment(repo, { ...record, shipment_ref: ref, pnl_lines: lines });
}

// Normalizes either entry form to { readKind, writeKind, via }.
function _resolveKindSpec(spec) {
  const plainPut = (repo, kind, id, record) => repo.put(kind, id, record);
  if (typeof spec === 'string') return { readKind: spec, writeKind: spec, via: plainPut };
  return { readKind: spec.read, writeKind: spec.write, via: spec.via || plainPut };
}

/**
 * Is there nothing left to do for this record?
 *
 * Two ways to be settled, and the second one is the one that bites.
 *
 * ARRIVED — not "is it in my cache": the cache was seeded from the OLD home, so a copy sitting
 * there proves nothing about the destination, and treating it as proof is what let _clearOldCopy
 * delete a row's only Drive copy. A copy that went through the new write path carries a _rev, so
 * an unstamped copy is always replayed and a stamped, content-equal one is done.
 *
 * DELETED — a tombstone at the destination is an ANSWER, not an absence. Deletes always tombstone
 * (apply_delete writes a row even for an id it cannot find), so a tombstone says somebody decided
 * this record is gone. The old folder is a copy from BEFORE that decision; replaying it asks the
 * app to resurrect a deleted job, which it rightly refuses — and the sweep then retries it on
 * every boot, forever. Found live: 24 of the 45 rows in the owner's shared bundle are tombstones
 * for jobs the stranded folder still holds.
 */
function _settledAtDestination(existing, record) {
  if (existing?._deleted) return true;
  return Boolean(existing?._rev) && _contentEquals(existing, record);
}

/**
 * @param {object}   repo              WasmEntityRepo — get(kind,id) / put(kind,id,body)
 * @param {object}   driveApi          drive-api.js module (real or mock) — findFolder /
 *                                     listChildren / getFile / driveFetch
 * @param {IDBDatabase} db             open IDB — meta flag storage
 * @param {() => Promise<string|null>} findWorkspaceRoot
 * @param {string}   prefix            user email local-part, lowercased (matches
 *                                     wasm-io-adapters.js's folder-prefix convention)
 * @param {string[]} kinds             kinds to sweep (test seam — defaults to both)
 * @param {number}   _ms               injectable timeout (test seam, mirrors seed-migrator.js)
 * @returns {Promise<Array<{kind:string, found:number, merged:number, conflicted:number, skipped?:boolean}>>}
 */
export async function migrateMasterScope(
  repo, driveApi, store, findWorkspaceRoot, prefix,
  kinds = MASTER_SCOPE_MIGRATION_KINDS, _ms = SAFE_AWAIT_DEFAULT_MS,
) {
  const results = [];
  for (const spec of kinds) {
    results.push(await _migrateKind(repo, driveApi, store, findWorkspaceRoot, prefix, spec, _ms));
  }
  return results;
}

async function _migrateKind(repo, driveApi, store, findWorkspaceRoot, prefix, spec, _ms) {
  // readKind names the OLD per-user folder; writeKind names the registered kind the records
  // belong under. They differ only for a rename entry — for a scope flip both are the same.
  const { readKind, writeKind, via } = _resolveKindSpec(spec);
  const kind    = writeKind;              // reported/audited under the destination kind
  const flagKey = MIGRATED_META_PREFIX + readKind; // keyed by source folder — a rename and a
                                                   // flip of the same name never share a flag
  const flagRes = await safeAwait(store.cache_get_meta(flagKey), _ms, null, `master-scope-migrator:flag:${kind}`);
  if (flagRes.ok && flagRes.value?.migrated) return { kind, found: 0, merged: 0, conflicted: 0, skipped: true };

  const readRes = await safeAwait(
    _readOldPerUserRecords(driveApi, findWorkspaceRoot, prefix, readKind),
    _ms, () => ({ records: [], files: [] }), `master-scope-migrator:read:${readKind}`,
  );
  const { records, files } = readRes.ok ? readRes.value : { records: [], files: [] };
  if (!readRes.ok) return { kind, found: 0, merged: 0, conflicted: 0 }; // couldn't read — retry next boot

  let merged       = 0;
  let conflicted   = 0;
  let written      = 0;
  let allConfirmed = true;

  const pending = _dedupeById(records);
  for (const record of pending) {
    const id = record.id;

    const getRes = await safeAwait(repo.get(kind, id), _ms, null, `master-scope-migrator:get:${kind}`);
    if (!getRes.ok) { allConfirmed = false; continue; } // can't verify existing — retry next boot

    const existing = getRes.value;
    if (_settledAtDestination(existing, record)) continue;

    // Stopping is not failing: what is left is still in the old folder, and the flag stays unset
    // so the next boot picks it up. Marking here would strand the remainder AND delete it.
    if (written >= MAX_RECORDS_PER_SWEEP) { allConfirmed = false; break; }

    // Divergent or genuinely new — let the Rust rebase gate (apply_put) decide. A legacy
    // record has no _rev, so against an existing id this naturally lands as Base::New →
    // Conflict, dispatched as vdg:conflict-detected — never a silent overwrite.
    if (existing) conflicted++;
    const putRes = await safeAwait(via(repo, kind, id, record), _ms, null, `master-scope-migrator:put:${kind}`);
    if (!putRes.ok) { allConfirmed = false; continue; }
    written++;
    if (!existing) merged++;
  }

  await _recordCensus(repo, kind, pending.length, merged, _ms);

  if (allConfirmed) {
    const markRes = await safeAwait(
      store.cache_put_meta(flagKey, { migrated: true, kind, source_kind: readKind, found: pending.length, merged, at: new Date().toISOString() }),
      _ms, null, `master-scope-migrator:mark:${kind}`,
    );
    if (markRes.ok) await _clearOldCopy(driveApi, files, _ms); // never drop the old copy before shared is confirmed
  }

  return { kind, found: pending.length, merged, conflicted };
}

// ── old per-user path (read directly — the resolver no longer points here) ────────────

async function _readOldPerUserRecords(driveApi, findWorkspaceRoot, prefix, kind) {
  const rootId = await findWorkspaceRoot();
  if (!rootId) throw new Error('master-scope-migrator: workspace root not resolved'); // transient — retry, don't mark

  const usersFolder = await driveApi.findFolder(rootId, USERS_ROOT);
  if (!usersFolder) return { records: [], files: [] }; // genuinely nothing under users/ yet

  const prefixFolder = await driveApi.findFolder(usersFolder.id, prefix);
  if (!prefixFolder) return { records: [], files: [] }; // this user never wrote per-user data

  const kindFolder = await driveApi.findFolder(prefixFolder.id, kind);
  if (!kindFolder) return { records: [], files: [] }; // this user never wrote this kind

  const children = await driveApi.listChildren(kindFolder.id);
  const files     = children.filter((f) => f.name.endsWith('.jsonl'));
  const records   = [];
  for (const f of files) {
    const data = await driveApi.getFile(f.id);
    if (!data) continue;
    records.push(...parseJsonlBundle(data.content));
  }
  return { records, files };
}

async function _clearOldCopy(driveApi, files, _ms) {
  for (const f of files) {
    await safeAwait(driveApi.driveFetch('DELETE', `/files/${f.id}`), _ms, null, 'master-scope-migrator:clear');
  }
}

// ── comparison + audit ──────────────────────────────────────────────────────────────

// Field-by-field, ignoring internal/volatile keys (_synced_at, _seed, _rev*…) — a cheap
// short-circuit so an already-migrated identical record skips a redundant put.
function _contentEquals(a, b) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    if (k.startsWith('_')) continue;
    if (JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k])) return false;
  }
  return true;
}

async function _recordCensus(repo, kind, found, merged, _ms) {
  const id = `MSM-${kind}-${Date.now()}`;
  const record = {
    id, ts: new Date().toISOString(), event: CENSUS_EVENT,
    entity_id: kind, op: 'migrate', found, merged,
  };
  await safeAwait(repo.put(AUDIT_KIND, id, record), _ms, null, `master-scope-migrator:census:${kind}`);
}
