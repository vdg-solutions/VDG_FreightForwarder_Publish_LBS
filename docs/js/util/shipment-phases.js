// shipment-phases.js — the ONE place JS writes down the sea shipment lifecycle.
//
// F-37-04 found four copies of it: dashboard-distribution, kanban-board (twice — the column order
// AND a hand-written VALID_NEXT transition map), and the manager pipeline. Each was correct on the
// day it was typed. The one that drifts first decides what a user can drag a card onto, or which
// column a job disappears from, with nothing failing.
//
// Rust is the source: `abstractions/states/shipment_state.rs::MAIN_PATH`. This is a mirror, not a
// second opinion — auth and boot both need the order before the ~2MB wasm module is loaded, so it
// cannot be a bridge call. tests/unit/f-37-04-phase-timeline.test.mjs parses the Rust const and
// fails the build the moment the two disagree.

/** The phases a job walks, in order. */
export const SHIPMENT_MAIN_PATH = [
  'Created', 'BookingConfirmed', 'InTransit', 'Arrived', 'Delivered', 'Closed',
];

/** Reachable from anywhere and the end of the road — never a step on the path. */
export const SHIPMENT_OFF_PATH = ['Cancelled'];

/** Every state a sea shipment can be in. */
export const SHIPMENT_STATES = [...SHIPMENT_MAIN_PATH, ...SHIPMENT_OFF_PATH];

/**
 * Where a job may go next, derived from the order rather than written down again.
 *
 * This is UI affordance only — what a drag target offers. The FSM decides what actually happens,
 * and it checks guards this table knows nothing about, so an allowed move here can still be
 * refused. The reverse must never be true: never offer a move the FSM has no transition for.
 */
export const NEXT_ON_PATH = Object.fromEntries(
  SHIPMENT_MAIN_PATH.map((state, i) => [state, SHIPMENT_MAIN_PATH[i + 1] ? [SHIPMENT_MAIN_PATH[i + 1]] : []]),
);

/** How far along a state is, or -1 when it is not on the path. */
export function phaseIndex(state) {
  return SHIPMENT_MAIN_PATH.indexOf(state);
}
