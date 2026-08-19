// shipment-audit.js — E-37 (F-37-02). Who changed which field of a shipment, to what.
//
// The owner asked for a history that can settle an argument: "sau này blame được". A payload hash
// can only say that something moved, so an entry has to name the field and carry both values.
//
// Naming both values is what makes the ROUTING load-bearing. `selling_amount: 1000 -> 1200` in the
// shared trail would publish the exact number whose FILE the storage split made unreadable to CS —
// the wall would stand and the history would walk around it. So a log inherits the ACL of the thing
// it describes: envelope changes go to `_shared/logs/audit-log`, revenue changes to the rep's own
// fork, and nothing here decides which is which. Rust hands over two finished lists
// (boundary/shipment_diff.rs) and this module only picks the store each was already sorted into.
//
// See backlog/wiki/shipment-collaboration-model.md §6.

import { AUDIT_STORE_REVENUE, AUDIT_STORE_SHARED } from '../../core_abstractions/audit-stores.js';
import { AUDIT_KIND_SHIPMENT } from '../../core_abstractions/ports/shipment-audit.js';


// Referencing a bare `window` throws in node and the service worker.
const g = () => globalThis.window || globalThis;

function auditLog() { return g().__vdg_audit_log || null; }

function wasm() {
  const w = g().__vdg_wasm;
  if (!w?.shipment_change_set) {
    throw new Error('WASM bridge not ready — the revenue/envelope split of a change list is a contract, not a JS fallback');
  }
  return w;
}

/**
 * Record one shipment write as per-field history.
 *
 * `before` null is a create and yields history from null — a created job whose first version is
 * unexplained is the case a blame trail is least able to afford. Passing two ENVELOPE records (the
 * state-change path) is correct: the revenue list comes back empty rather than reading as "the
 * rep's numbers were deleted".
 *
 * Fire-and-forget by design, like every other audit write: a shipment must not fail to save
 * because its history could not be appended. A failure is loud in the console and the write stands.
 */
function recordShipmentChange({ before, after, op }) {
  const log = auditLog();
  if (!log) {
    console.warn('[shipment-audit] no audit log — change not recorded'); // DEV
    return;
  }
  const ref = after?.shipment_ref || before?.shipment_ref;
  if (!ref) {
    console.warn('[shipment-audit] shipment has no ref — change not recorded'); // DEV
    return;
  }

  let changes;
  try {
    changes = splitChanges(before, after);
  } catch (err) {
    console.error('[shipment-audit] could not diff shipment:', err); // DEV
    return;
  }

  // Nothing user-visible moved — a _rev bump or a re-save of identical content. Writing an entry
  // for it would bury the real edits in a trail nobody can read.
  if (!changes.envelope.length && !changes.revenue.length) return;

  if (changes.envelope.length) {
    log.append(AUDIT_KIND_SHIPMENT, ref, op, after, changes.envelope);
  }
  if (changes.revenue.length) {
    log.appendRevenue(AUDIT_KIND_SHIPMENT, ref, op, after, changes.revenue);
  }
}

/** The two lists, classified in Rust. Exported for the tests that assert the wall holds. */
function splitChanges(before, after) {
  const beforeJson = before ? JSON.stringify(before) : '';
  return JSON.parse(wasm().shipment_change_set(beforeJson, JSON.stringify(after)));
}

/** Which store each half lands in — read by the residue guard and by the audit views. */
export const AUDIT_ROUTE = Object.freeze({
  envelope: AUDIT_STORE_SHARED,
  revenue:  AUDIT_STORE_REVENUE,
});

/// The operator, bound behind core_abstractions/ports/shipment-audit.js by the freight_app bootstrap.
export const shipmentAudit = { recordShipmentChange, splitChanges };
