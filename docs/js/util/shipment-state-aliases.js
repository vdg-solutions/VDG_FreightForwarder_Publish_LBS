// util/shipment-state-aliases.js — F-18-11 DEFECT-1: shared seed-on-first-read for the
// shipment-states alias registry.
//
// The registry was seeded ONLY inside the manager states-master view (runSeedMigrations). Every
// consumer — dashboard buildDistribution, the shipments grid, sales-me, the submit/batch write
// paths — only READ it. So a fresh session (any role, before visiting the master view) reads an
// empty registry and resolves every legacy 'Open' shipment to Unknown. A sales rep can never
// trigger the seed. This helper runs the SAME versioned, idempotent migration on first read so
// the first consumer read seeds it, then returns the alias rows.

import { runSeedMigrations } from '../cache/seed-migrator.js';

export const SHIPMENT_STATES_KIND = 'shipment-states';
const SEED_URL = 'seed/masters/shipment-states.jsonl';

// Same versioned id the states-master view uses — runSeedMigrations dedups on this id, so the
// view's own seed call and this one never double-seed.
export const SHIPMENT_STATES_SEED_MIGRATION = {
  id: '2026-07-17-shipment-states-v1', kind: SHIPMENT_STATES_KIND, url: SEED_URL, key: (e) => e.code,
};

// Seed-if-unseeded, then return the alias rows. Idempotent — a second call is a cheap no-op
// (runSeedMigrations skips an already-applied id). Never throws: a stalled/failed seed leaves
// the registry empty and the caller falls back to canonical-only resolution.
export async function ensureShipmentStateAliases(repo) {
  if (!repo) return [];
  await runSeedMigrations(repo, [SHIPMENT_STATES_SEED_MIGRATION]).catch(() => {});
  return repo.list(SHIPMENT_STATES_KIND, null).catch(() => []);
}
