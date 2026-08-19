// Manager shipment void (soft-cancel) / hard-delete affordance — F-19-77.
// Framework-free so both the vanilla grid (shipments.js) and the Lit drawer (detail-panel.js)
// consume it. Reuses the existing repo tombstone delete path — no parallel write path.

import { UNKNOWN_STATE } from '../../kernel/core_abstractions/util/dashboard-distribution.js';
import { getEnvelope, putEnvelope, deleteShipment as deleteBothHalves } from '../core_abstractions/ports/shipment-repo.js';

export const CANCELLED_STATE   = 'Cancelled';
const DRAFT_PUBLISH_STATE      = 'draft';
const AUDIT_FINAL_STATES       = ['Delivered', 'Closed']; // void hidden — audit-final terminals

// AC-03 — pure selector, no DOM/repo. 'delete' | 'void' | 'none'.
// Keyed ONLY on the authoritative STORED shipment record (publish_state/state) — never on wasm
// get_entity_state/NOT_FOUND. That signal is a different, unrelated orphan class (the wasm-orphan
// gap tracked separately as F-19-88) — mixing it in here made the grid and detail panel disagree
// on the same shipment (F-19-77 rework D-1). A stored draft is hard-deletable; a stored
// rollback-residue orphan (never published, state never resolved) is hard-deletable; everything
// else — including every published shipment — always routes to void, never hard-delete.
export function chooseShipmentAffordance(shipment) {
  if (shipment?.publish_state === DRAFT_PUBLISH_STATE) return 'delete';
  if (shipment?.state === UNKNOWN_STATE) return 'delete';          // stored rollback-residue orphan
  // Voiding is what PUT the shipment in Cancelled; offering it again asks the manager to cancel
  // an already-cancelled job, and the second void is a no-op write of the state it already holds.
  if (shipment?.state === CANCELLED_STATE) return 'none';
  if (AUDIT_FINAL_STATES.includes(shipment?.state)) return 'none';
  return 'void';
}

// AC-01 — soft-cancel: patch canonical record's state, NO tombstone.
export async function voidShipment(repo, shipment) {
  const ref = shipment.shipment_ref || shipment.ref;
  const current = await getEnvelope(repo, ref);
  await putEnvelope(repo, ref, { ...(current || shipment), state: CANCELLED_STATE });
  return ref;
}

// AC-02 — hard-delete: existing repo tombstone path (repo.delete()), no re-implementation.
export async function voidDeleteShipment(repo, shipment) {
  const ref = shipment.shipment_ref || shipment.ref;
  await deleteBothHalves(repo, ref);  // envelope AND the rep-fork revenue record
  return ref;
}

// AC-05/06 — gated orchestrator. View injects hasRole(ROLE_MANAGER) result + a confirm thunk so the whole
// gate→confirm→repo seam is integ-testable without DOM. Reuses the real isManager/showConfirm.
export async function runShipmentAffordance({ repo, shipment, isManager, confirm }) {
  if (!isManager) return { mutated: false, reason: 'not-manager' };        // AC-05
  const affordance = chooseShipmentAffordance(shipment);
  if (affordance === 'none') return { mutated: false, reason: 'not-applicable' };
  const ok = await confirm(affordance);                                    // AC-06
  if (!ok) return { mutated: false, reason: 'cancelled' };
  if (affordance === 'delete') await voidDeleteShipment(repo, shipment);
  else                        await voidShipment(repo, shipment);
  return { mutated: true, affordance };
}
