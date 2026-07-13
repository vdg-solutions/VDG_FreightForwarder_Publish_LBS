// data/master-registry.js — single source of truth for master-data kind ownership.
// F-28-01: replaces the two hand-maintained MASTER_KINDS arrays (wasm-io-adapters.js,
// operators/backup-exporter.js).
// F-28-02: `local-charges` / `units-of-measure` flip from `audience: 'private'` (their old
// per-user storage) to `team`. cache/master-scope-migrator.js sweeps each user's stranded
// per-user records into shared/masters at boot so the flip doesn't strand existing data.
//
// audience: who must be able to READ the kind — 'team' (whole workspace, shared/masters/<kind>)
//           or 'private' (one user, users/{prefix}/<kind>). Drives the storage path.
// writers:  roles allowed to create/edit the kind (see operators/manager/route-guard.js).
// seed:     bundled seed file fetched by the view's seed migration, or null when the view
//           has no file-backed seed (e.g. inline defaults, or no seeding at all).
// tier:     'priced' feeds a price/PNL calculation (governance-sensitive); else 'reference'.
import { ROLE_MANAGER, ROLE_SALES_REP } from '../operators/manager/route-guard.js';

const SEED_BASE = 'seed/masters';

export const MASTER_REGISTRY = {
  customers:          { audience: 'team',    writers: [ROLE_SALES_REP, ROLE_MANAGER], seed: null,                                    tier: 'reference' },
  carriers:           { audience: 'team',    writers: [ROLE_MANAGER],                 seed: null,                                    tier: 'reference' },
  services:           { audience: 'team',    writers: [ROLE_MANAGER],                 seed: null,                                    tier: 'reference' },
  dunning_templates:  { audience: 'team',    writers: [ROLE_MANAGER],                 seed: null,                                    tier: 'reference' },
  user:               { audience: 'team',    writers: [ROLE_MANAGER],                 seed: null,                                    tier: 'reference' },
  airports:           { audience: 'team',    writers: [ROLE_MANAGER],                 seed: `${SEED_BASE}/airports.jsonl`,          tier: 'reference' },
  flights:            { audience: 'team',    writers: [ROLE_MANAGER],                 seed: `${SEED_BASE}/flights.jsonl`,           tier: 'reference' },
  'airline-carriers': { audience: 'team',    writers: [ROLE_MANAGER],                 seed: `${SEED_BASE}/airline-carriers.jsonl`,  tier: 'reference' },
  'uld-types':        { audience: 'team',    writers: [ROLE_MANAGER],                 seed: `${SEED_BASE}/uld-types.jsonl`,         tier: 'reference' },
  'air-rates':        { audience: 'team',    writers: [ROLE_MANAGER],                 seed: `${SEED_BASE}/air-rates.jsonl`,         tier: 'priced'    },
  'ocean-carriers':   { audience: 'team',    writers: [ROLE_SALES_REP, ROLE_MANAGER], seed: `${SEED_BASE}/ocean-carriers.jsonl`,    tier: 'reference' },
  user_audit_log:     { audience: 'team',    writers: [ROLE_MANAGER],                 seed: null,                                    tier: 'reference' },
  'local-charges':    { audience: 'team',    writers: [ROLE_SALES_REP, ROLE_MANAGER], seed: `${SEED_BASE}/local-charges.jsonl`,     tier: 'priced'    },
  'units-of-measure': { audience: 'team',    writers: [ROLE_SALES_REP, ROLE_MANAGER], seed: `${SEED_BASE}/units-of-measure.jsonl`,  tier: 'reference' },
};
