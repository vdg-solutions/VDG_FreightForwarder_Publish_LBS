// F-19-88 — create -> FSM-ingest wiring. Choke point for registering shipments into the
// WASM FSM state map and writing an advanced state back to the repo of record. `window`
// guarded throughout so this module imports cleanly under node:test (no DOM/WASM there).

import { resolveShipmentState } from '../../kernel/core_abstractions/util/shipment-state-resolver.js';
import { ensureShipmentStateAliases } from '../core_abstractions/ports/shipment-state-aliases.js';
import { listEnvelopes, getEnvelope, putEnvelope } from '../core_abstractions/ports/shipment-repo.js';

// F-41-01 AC-04: diagnostic tag for a raw state/status value that resolves against neither
// the canonical ShipmentState set nor the alias registry — distinguishable from "rehydrate
// never ran" and from a genuine register_entity bridge failure below.
const UNRESOLVED_STATE_TAG = '[fsm-ingest] unresolved-state';

const ENTITY_CHANGED_EVENT = 'vdg:entity-changed';
const KIND_SHIPMENT        = 'shipment';

async function registerFsmEntity(ref, state) {
  if (!ref || !state) return;
  const fn = typeof window !== 'undefined' ? window.register_entity : undefined;
  if (typeof fn !== 'function') return;
  try { await fn(ref, state); }
  catch (err) { console.debug('[fsm-ingest] register', ref, err); } // DEV — ingest is non-fatal
}

// AC-04/05 (F-19-88): reload rehydration + pre-existing orphan backlog. register-if-absent in
// the Rust export makes this safe to call over every repo shipment on every boot.
// F-41-01: resolve raw state/status through the same alias registry every other read path
// (loadRealData, buildDistribution) already uses before registering — a record whose value
// isn't canonical and isn't a registered alias is unresolvable and skipped with a real
// diagnostic, not silently dropped into registerFsmEntity's swallowed catch.
async function rehydrateFsmStates(repo) {
  if (!repo) return;
  const aliasRows = await ensureShipmentStateAliases(repo); // seed-on-first-read, never throws
  for (const s of await listEnvelopes(repo, null)) {
    const ref = s.shipment_ref || s.ref;
    const raw = s.state || s.status; // AC-03: status fallback before the guard
    if (!ref || !raw) continue;
    const resolved = resolveShipmentState(raw, aliasRows);
    if (!resolved) {
      console.warn(UNRESOLVED_STATE_TAG, ref, raw); // DEV — AC-04 real diagnostic, not swallowed
      continue;
    }
    await registerFsmEntity(ref, resolved); // AC-01/02: always canonical past this point
  }
}

// PM Q1: repo stays authoritative — mirror an FSM advance back into the shipment record.
async function persistAdvancedState(repo, ref, newState) {
  if (!repo || !ref || !newState) return;
  const rec = await getEnvelope(repo, ref).catch(() => null);
  if (rec && rec.state !== newState) {
    await putEnvelope(repo, ref, { ...rec, state: newState });
    // #27: repo.put does not announce anything — every other writer dispatches this itself
    // (bulk-orchestrator, period-close-orchestrator). This path did not, so closing a file left
    // the list showing the old status until the user pressed F5 (QC 2026-08-09: "reload lại có").
    // Same guard style as registerFsmEntity: probe the FUNCTION, not the object — node:test
    // supplies a partial `window` stub with no event target on it.
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(ENTITY_CHANGED_EVENT, { detail: { kind: KIND_SHIPMENT } }));
    }
  }
}

/// The operator, bound behind core_abstractions/ports/fsm-ingest.js by the freight_app bootstrap.
export const fsmIngest = { registerFsmEntity, rehydrateFsmStates, persistAdvancedState };
