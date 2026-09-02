// pipeline-transition.js — the kanban drag's write-back, split out of pipeline.js so it stays
// testable without pulling in kanban-board.js's Lit import (fetched from a bare CDN URL, which
// node:test cannot resolve).
//
// F2 (production incident, v0.4.43): the drag handler used to write the new state with a raw
// generic store write naming the shipment kind itself — and it wrote the FULL joined shipment
// (envelope + revenue merged for rendering). That bypassed BOTH the `shipment.transition` re-check
// `persist_advanced` performs AND `putEnvelope`'s split, so a drag could silently leak the rep's
// sell figures into the shared folder CS reads, and any refusal never surfaced — it vanished into
// the background outbox drain with no toast, the write looking like it worked.
// persistAdvancedState is the same choke point detail-panel.js's own "advance" button uses
// (fsm_ingest.rs::persist_advanced): it re-checks the action, writes through putEnvelope, and
// announces the change — the only lawful way a shipment's state gets written back.
import { persistAdvancedState } from '../../../core_abstractions/ports/flows/fsm-ingest.js';

/// (id, to, shipments, repo, wasm) -> the applied state, or null when `id` names no row this
/// board currently holds. Throws on refusal (a denied action, a guard violation, a write
/// failure) -- the caller owns turning that into a toast, same contract `wasm.shipment_move_to`
/// already had.
export async function applyShipmentTransition({ id, to, shipments, repo, wasm }) {
  const s = shipments.find((x) => x.id === id);
  if (!s) return null;
  // Degraded fallback (WASM unavailable) skips the FSM guard on the MOVE itself, but the write
  // below still re-runs the real authorization + persistence path either way.
  const nextState = typeof wasm?.shipment_move_to === 'function'
    ? await wasm.shipment_move_to(id, to, JSON.stringify(s))
    : to;
  if (repo) await persistAdvancedState(repo, id, nextState);
  return nextState;
}
