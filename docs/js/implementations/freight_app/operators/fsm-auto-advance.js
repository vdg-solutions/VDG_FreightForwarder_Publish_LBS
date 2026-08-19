// fsm-auto-advance.js — E-40, the owner's rule: "dữ liệu đủ thì đẩy qua".
//
// After every shipment save the record is handed to wasm `shipment_auto_advance`, which walks the
// FSM forward while EVERY requirement of the next hop is affirmatively Met by the record itself
// (booking no → Đã đặt chỗ, ATD + container → Đang vận chuyển). Same guarded, audited transition
// machinery as the manual button — this module only asks, persists, and reports.

import { persistAdvancedState } from '../core_abstractions/ports/fsm-ingest.js';

/**
 * @returns {Promise<string|null>} the state the job advanced TO, or null when it stayed put.
 */
export async function autoAdvanceShipment(repo, shipment) {
  const wasm = (typeof window !== 'undefined') ? window.__vdg_wasm : null;
  if (typeof wasm?.shipment_auto_advance !== 'function') return null;
  const ref = shipment?.shipment_ref;
  if (!ref) return null;
  try {
    const next = wasm.shipment_auto_advance(ref, JSON.stringify(shipment));
    if (next && next !== shipment.state) {
      await persistAdvancedState(repo, ref, next);
      return next;
    }
  } catch { /* guard refusal / entity not registered — the job simply stays where it is */ }
  return null;
}
