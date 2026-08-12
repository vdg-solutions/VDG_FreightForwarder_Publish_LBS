// operators/shipment-state-migrator.js — F-18-11 AC-06: one-off, manager-triggered sweep that
// rewrites legacy shipment.status values (e.g. 'Open') into the canonical shipment.state field.
//
// Content-based idempotent (no IDB meta flag needed, unlike cache/master-scope-migrator.js): a
// shipment whose state is already one of SHIPMENT_STATES is filtered out up front, so a second
// run naturally performs zero writes. Never invents a value for a record that fails alias
// resolution — those are counted (skippedUnresolved) and left untouched. Audited every run,
// mirroring master-scope-migrator.js's _recordCensus (one audit_log row per sweep, even a
// zero-op run, so the manager can see the sweep executed).
//
// PM/owner-triggered against the live workspace — NOT boot-wired. Called from the "Run
// migration" button in views/manager/masters/shipment-states.js (manager-only, canWrite()-gated).

import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../util/safe-await.js';
import { SHIPMENT_STATES } from '../util/dashboard-distribution.js';
import { resolveShipmentState } from '../util/shipment-state-resolver.js';
import { listEnvelopes, putEnvelope } from '../data/shipment-repo.js';

const AUDIT_KIND  = 'audit_log';
const AUDIT_EVENT = 'shipment-state-migration';

/**
 * @param {object}   repo       WasmEntityRepo — list('shipment')/put('shipment',...)/put('audit_log',...)
 * @param {object[]} aliasRows  shipment-states master rows (code/aliases)
 * @param {number}   _ms        injectable timeout (test seam, mirrors master-scope-migrator.js)
 * @returns {Promise<{found:number, migrated:number, skippedUnresolved:number}>}
 */
export async function migrateLegacyShipmentState(repo, aliasRows, _ms = SAFE_AWAIT_DEFAULT_MS) {
  const listRes   = await safeAwait(listEnvelopes(repo, null), _ms, null, 'shipment-state-migrator:list');
  const shipments = listRes.ok ? listRes.value : [];

  // Already-canonical records are never touched — content-based idempotency, no meta flag.
  const candidates = shipments.filter((s) => !SHIPMENT_STATES.includes(s.state));

  let migrated          = 0;
  let skippedUnresolved = 0;

  for (const s of candidates) {
    const canonical = resolveShipmentState(s.state || s.status, aliasRows);
    if (!canonical) { skippedUnresolved++; continue; } // unresolvable — leave untouched, never invent

    const { status, ...rest } = s; // status field retired (Q4)
    const putRes = await safeAwait(
      putEnvelope(repo, s.shipment_ref, { ...rest, state: canonical }),
      _ms, null, 'shipment-state-migrator:put',
    );
    if (putRes.ok) migrated++;
  }

  await _recordAudit(repo, candidates.length, migrated, skippedUnresolved, _ms);

  return { found: candidates.length, migrated, skippedUnresolved };
}

async function _recordAudit(repo, found, migrated, skippedUnresolved, _ms) {
  const id = `SSM-${Date.now()}`;
  const record = {
    id, ts: new Date().toISOString(), event: AUDIT_EVENT,
    entity_id: 'shipment', op: 'migrate', found, migrated, skipped_unresolved: skippedUnresolved,
  };
  await safeAwait(repo.put(AUDIT_KIND, id, record), _ms, null, 'shipment-state-migrator:audit');
}
