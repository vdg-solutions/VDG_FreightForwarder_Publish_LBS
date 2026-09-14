// pipeline-transition.js — the kanban drag's write-back, split out of pipeline.js so it stays
// testable without pulling in kanban-board.js's Lit import (fetched from a bare CDN URL, which
// node:test cannot resolve).
//
// F2 (production incident, v0.4.43): the drag handler used to write the new state with a raw
// generic store write naming the shipment kind itself — and it wrote the FULL joined shipment
// (envelope + revenue merged for rendering). That bypassed BOTH the `shipment.transition` guard
// AND `putEnvelope`'s split, so a drag could silently leak the rep's sell figures into the shared
// folder CS reads, and any refusal never surfaced.
//
// ADO #120: `moveShipmentTo` (fsm_ingest.rs::move_to) is now the ONLY step — it re-reads the
// record itself (never the board's possibly-stale `s`), resolves the hop off that, writes through
// putEnvelope and announces the change. The old two-call sequence (compute off the board's copy,
// THEN persist whatever came back) is exactly the shape of the "stale device moves a job
// backwards" defect: a second write-only call trusting a first call's output can never see a
// record that moved in between.
import { moveShipmentTo } from '../../../core_abstractions/ports/flows/fsm-ingest.js';

/// (id, to, shipments, repo) -> the applied state, or null when `id` names no row this board
/// currently holds. Throws on refusal (a denied action, a guard violation, a write failure) --
/// the caller owns turning that into a toast.
export async function applyShipmentTransition({ id, to, shipments, repo }) {
  const s = shipments.find((x) => x.id === id);
  if (!s) return null;
  const result = await moveShipmentTo(repo, id, to);
  if (!result.ok) throw new Error(result.error || 'shipment transition refused');
  return result.state;
}
