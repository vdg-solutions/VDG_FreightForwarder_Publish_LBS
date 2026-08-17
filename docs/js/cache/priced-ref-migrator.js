// cache/priced-ref-migrator.js — F-28-14(d): one-time boot sweep materializing each
// priced master table (_shared/<kind>/<id>.json) into its governance ref
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
const UNKNOWN_CURRENCY     = { Other: 'UNKNOWN' }; // structural default; rows carry a currency in practice
// Every field the PricedRecord envelope needs from the row. Named so a row that is missing
// one names the field, instead of being silently defaulted into a shape the resolver
// cannot use (see _toEnvelope).
const REQUIRED_ROW_FIELDS  = ['pricing_key', 'valid_from', 'valid_to'];
const KNOWN_CURRENCY_CODES = new Set(['VND', 'USD', 'CNY', 'EUR', 'JPY', 'KRW', 'SGD', 'THB', 'INR']);

// AC-06: in-scope kinds = registry tier:'priced' ∩ audience:'team'. Single functor, no
// second hand-list (fx-rates has no registry entry so it is excluded for free).
export function pricedRefKinds(registry = MASTER_REGISTRY) {
  return Object.entries(registry)
    .filter(([, e]) => e.tier === PRICED_TIER && e.audience === TEAM_AUDIENCE)
    .map(([kind]) => kind);
}

/**
 * @param {object} repo        WasmEntityRepo — list(kind) reads the table through the framework
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
  // the table and yields rows with the repo-canonical top-level `id`
  // (air-rates mirrors rate_id -> id at the write path; local-charges is id-native).
  const listRes = await safeAwait(repo.list(kind, null), _ms, () => [], `priced-ref-migrator:list:${kind}`);
  if (!listRes.ok) return { kind, found: 0, migrated: 0, reason: 'read-failed' }; // retry next boot
  const rows = listRes.value || [];

  const recordsMap = {};
  const skipped = [];
  let found = 0;
  for (const row of rows) {
    const id = row?.id;
    if (!id) continue; // no identity — skip (mirrors master-scope-migrator)
    try {
      recordsMap[id] = toPricedEnvelope(id, row);
      found++;
    } catch (err) {
      // One malformed row must not cost the ref its other 89. Named, not swallowed: a silent
      // skip is how a rate goes missing from the tariff with nothing on screen to say so.
      skipped.push(id);
      console.warn(`[priced-ref-migrator] ${kind}: ${err.message}`);
    }
  }

  // Idempotency + empty-bundle guard both live in the repo — authority is the shared state.json.
  const seedRes = await safeAwait(pricedRepo.seedIfEmpty(recordsMap), _ms, null, `priced-ref-migrator:seed:${kind}`);
  if (!seedRes.ok) return { kind, found, skipped, migrated: 0, reason: 'seed-failed' };
  return { kind, found, skipped, ...seedRes.value };
}

function _normalizeCurrency(code) {
  if (!code) return UNKNOWN_CURRENCY;
  const up = String(code).toUpperCase();
  if (KNOWN_CURRENCY_CODES.has(up)) return up.charAt(0) + up.slice(1).toLowerCase(); // "VND" -> "Vnd"
  return { Other: String(code) };
}

/**
 * Wrap one bundle row in the FROZEN PricedRecord envelope. body = whole row verbatim (no-loss).
 *
 * `pricing_key` is READ from the row, never derived from the id. Deriving it made every record
 * its own key, and that quietly disabled the whole effective-dating layer: no two records could
 * ever share a key, so the overlap guard could not fire and `resolveOnDate` matched nothing —
 * the ocean-tariff seed's two half-year WHLC windows resolved as two unrelated rates.
 *
 * The three fields are required, not defaulted. A default here is indistinguishable from a real
 * open-ended window at read time, so a row that forgot its dates would price as if it were in
 * force forever. Throwing names the row and the field instead.
 */
export function toPricedEnvelope(id, row) {
  const missing = REQUIRED_ROW_FIELDS.filter((f) => !row?.[f]);
  if (missing.length) throw new Error(`priced row '${id}' is missing ${missing.join(', ')}`);
  return {
    record_id:   id,
    pricing_key: row.pricing_key,
    valid_from:  row.valid_from,
    valid_to:    row.valid_to,
    currency:    _normalizeCurrency(row.currency),
    body:        row,
  };
}
