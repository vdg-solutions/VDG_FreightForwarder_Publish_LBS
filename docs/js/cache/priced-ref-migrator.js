// cache/priced-ref-migrator.js — F-28-14(d): one-time boot sweep materializing each
// priced master bundle (shared/masters/<kind>/all.jsonl) into its governance ref
// (_shared/<kind>/state.json) so the master TABLE and the governance panel stop
// diverging (F-28-12 D-2). Mirrors master-scope-migrator.js's per-kind loop shape.
//
// Idempotency authority = the shared ref state itself (PricedRefRepo.seedIfEmpty),
// never a per-device flag — a second device / cleared IDB still sees the populated
// ref and skips (AC-04).

import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../util/safe-await.js';
import { MASTER_REGISTRY } from '../data/master-registry.js';
import { beginMigration, endMigration } from '../boot/migration-overlay.js';

const PRICED_TIER          = 'priced';
const TEAM_AUDIENCE        = 'team';
const DEFAULT_VALID_FROM   = '1970-01-01'; // open lower bound — row has no from/effective date
const DEFAULT_VALID_TO     = '9999-12-31'; // open upper bound — row has no end date
const UNKNOWN_CURRENCY     = { Other: 'UNKNOWN' }; // structural default; rows carry a currency in practice
const KNOWN_CURRENCY_CODES = new Set(['VND', 'USD', 'CNY', 'EUR', 'JPY', 'KRW', 'SGD', 'THB', 'INR']);

// AC-06: in-scope kinds = registry tier:'priced' ∩ audience:'team'. Single functor, no
// second hand-list (fx-rates has no registry entry so it is excluded for free).
export function pricedRefKinds(registry = MASTER_REGISTRY) {
  return Object.entries(registry)
    .filter(([, e]) => e.tier === PRICED_TIER && e.audience === TEAM_AUDIENCE)
    .map(([kind]) => kind);
}

/**
 * @param {object} repo        WasmEntityRepo — list(kind) reads shared/masters/<kind>/all.jsonl
 * @param {Record<string,object>} pricedRepos  window.__vdg_priced_repos: refName -> PricedRefRepo
 * @param {string[]} kinds     defaults to pricedRefKinds() (test seam)
 * @param {number} _ms         injectable timeout (test seam)
 * @returns {Promise<Array<{kind,found,migrated,version?,reason?}>>}
 */
export async function migratePricedRefs(repo, pricedRepos, kinds = pricedRefKinds(), _ms = SAFE_AWAIT_DEFAULT_MS) {
  const results = [];
  beginMigration(); // show the "syncing data" overlay while priced-ref bundles materialize
  try {
    for (const kind of kinds) {
      results.push(await _migrateKind(repo, pricedRepos?.[kind], kind, _ms));
    }
  } finally { endMigration(); }
  return results;
}

async function _migrateKind(repo, pricedRepo, kind, _ms) {
  if (!pricedRepo) return { kind, found: 0, migrated: 0, reason: 'no-ref-repo' };

  // Source = exactly what the master TABLE reads: repo.list flows through WasmIoPort ->
  // shared/masters/<kind>/all.jsonl and yields rows with the repo-canonical top-level `id`
  // (air-rates mirrors rate_id -> id at the write path; local-charges is id-native).
  const listRes = await safeAwait(repo.list(kind, null), _ms, () => [], `priced-ref-migrator:list:${kind}`);
  if (!listRes.ok) return { kind, found: 0, migrated: 0, reason: 'read-failed' }; // retry next boot
  const rows = listRes.value || [];

  const recordsMap = {};
  let found = 0;
  for (const row of rows) {
    const id = row?.id;
    if (!id) continue; // no identity — skip (mirrors master-scope-migrator)
    recordsMap[id] = _toEnvelope(id, row);
    found++;
  }

  // Idempotency + empty-bundle guard both live in the repo — authority is the shared state.json.
  const seedRes = await safeAwait(pricedRepo.seedIfEmpty(recordsMap), _ms, null, `priced-ref-migrator:seed:${kind}`);
  if (!seedRes.ok) return { kind, found, migrated: 0, reason: 'seed-failed' };
  return { kind, found, ...seedRes.value };
}

function _normalizeCurrency(code) {
  if (!code) return UNKNOWN_CURRENCY;
  const up = String(code).toUpperCase();
  if (KNOWN_CURRENCY_CODES.has(up)) return up.charAt(0) + up.slice(1).toLowerCase(); // "VND" -> "Vnd"
  return { Other: String(code) };
}

// Wrap one bundle row in the FROZEN PricedRecord envelope. body = whole row verbatim (no-loss).
function _toEnvelope(id, row) {
  return {
    record_id:   id,
    pricing_key: id,
    valid_from:  row.valid_from ?? row.effective_from ?? DEFAULT_VALID_FROM,
    valid_to:    row.valid_to   ?? row.valid_until    ?? DEFAULT_VALID_TO,
    currency:    _normalizeCurrency(row.currency),
    body:        row,
  };
}
