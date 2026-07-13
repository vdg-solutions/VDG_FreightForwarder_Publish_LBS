// cache/master-scope-migrator.js — F-28-02: one-time boot sweep of local-charges /
// units-of-measure per-user records into the now-shared master.
//
// master-registry.js flipped these two kinds to audience:'team', so the resolver in
// wasm-io-adapters.js now reads/writes them under shared/masters/<kind>. Records a user
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

import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../util/safe-await.js';
import { idbGet, idbPut, STORE_META } from './idb-cache.js';
import { parseJsonlBundle } from '../auth/drive-api.js';

const MIGRATED_META_PREFIX = 'master-scope-migrated.'; // + kind
const AUDIT_KIND           = 'audit_log';
const CENSUS_EVENT         = 'master-scope-migration';
const USERS_ROOT           = 'users';

export const MASTER_SCOPE_MIGRATION_KINDS = ['local-charges', 'units-of-measure'];

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
  repo, driveApi, db, findWorkspaceRoot, prefix,
  kinds = MASTER_SCOPE_MIGRATION_KINDS, _ms = SAFE_AWAIT_DEFAULT_MS,
) {
  const results = [];
  for (const kind of kinds) {
    results.push(await _migrateKind(repo, driveApi, db, findWorkspaceRoot, prefix, kind, _ms));
  }
  return results;
}

async function _migrateKind(repo, driveApi, db, findWorkspaceRoot, prefix, kind, _ms) {
  const flagKey = MIGRATED_META_PREFIX + kind;
  const flagRes = await safeAwait(idbGet(db, STORE_META, flagKey), _ms, null, `master-scope-migrator:flag:${kind}`);
  if (flagRes.ok && flagRes.value?.migrated) return { kind, found: 0, merged: 0, conflicted: 0, skipped: true };

  const readRes = await safeAwait(
    _readOldPerUserRecords(driveApi, findWorkspaceRoot, prefix, kind),
    _ms, () => ({ records: [], files: [] }), `master-scope-migrator:read:${kind}`,
  );
  const { records, files } = readRes.ok ? readRes.value : { records: [], files: [] };
  if (!readRes.ok) return { kind, found: 0, merged: 0, conflicted: 0 }; // couldn't read — retry next boot

  let merged        = 0;
  let conflicted     = 0;
  let allConfirmed  = true;

  for (const record of records) {
    const id = record?.id;
    if (!id) continue;

    const getRes = await safeAwait(repo.get(kind, id), _ms, null, `master-scope-migrator:get:${kind}`);
    if (!getRes.ok) { allConfirmed = false; continue; } // can't verify existing — retry next boot

    const existing = getRes.value;
    if (existing && _contentEquals(existing, record)) continue; // identical — already merged, nothing to do

    // Divergent or genuinely new — let the Rust rebase gate (apply_put) decide. A legacy
    // record has no _rev, so against an existing id this naturally lands as Base::New →
    // Conflict, dispatched as vdg:conflict-detected — never a silent overwrite.
    if (existing) conflicted++;
    const putRes = await safeAwait(repo.put(kind, id, record), _ms, null, `master-scope-migrator:put:${kind}`);
    if (!putRes.ok) { allConfirmed = false; continue; }
    if (!existing) merged++;
  }

  await _recordCensus(repo, kind, records.length, merged, _ms);

  if (allConfirmed) {
    const markRes = await safeAwait(
      idbPut(db, STORE_META, { key: flagKey, migrated: true, kind, found: records.length, merged, at: new Date().toISOString() }),
      _ms, null, `master-scope-migrator:mark:${kind}`,
    );
    if (markRes.ok) await _clearOldCopy(driveApi, files, _ms); // never drop the old copy before shared is confirmed
  }

  return { kind, found: records.length, merged, conflicted };
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
