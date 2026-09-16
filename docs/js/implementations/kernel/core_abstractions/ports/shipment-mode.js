// shipment-mode.js — port: the transport-mode vocabulary, and the ONE reading of a stored `mode`.
//
// ADO #122: the vocabulary is Rust's (rulesets::shipment_mode over shipment_meta::ShipmentMode) and
// no screen keeps a copy. Two screens used to read the field as a boolean — `mode === 'air'`,
// everything else sea — and the form defaulted a mode it had never read to SEA, so an air job
// displayed as sea and the next save wrote sea onto the record. A resolution says one of three
// things: nothing collected, a code the vocabulary owns, or a value it cannot read. None is sea.

let _impl = null;

/// The adapter registers { resolveMode, modeCodes } once, from the kernel bootstrap.
export function bindShipmentMode(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('kernel/shipment-mode: no adapter bound (the kernel bootstrap binds it)');
  return _impl;
}

export const MODE_STATUS_UNSET  = 'unset';
export const MODE_STATUS_KNOWN  = 'known';
export const MODE_STATUS_UNREAD = 'unrecognised';

export const MODE_SEA = 'sea';
export const MODE_AIR = 'air';

/// (stored) -> { status, code }
export const resolveMode = (...a) => _i().resolveMode(...a);
/// () -> the codes a picker offers, in Rust's order
export const modeCodes   = (...a) => _i().modeCodes(...a);

/// The code a mode-specific field group or filter follows — '' when unset or unreadable.
export function modeFieldCode(res) {
  return res.status === MODE_STATUS_KNOWN ? res.code : '';
}

/**
 * Label key for a resolved mode under `prefix` (`shipment.mode.`, `sales_new.mode_selector.`) —
 * the code IS the suffix. A mode nobody can read gets the prefix's own `unread` key rather than
 * borrowing another mode's label.
 */
export function modeLabelKey(res, prefix) {
  return `${prefix}${res.status === MODE_STATUS_KNOWN ? res.code : 'unread'}`;
}

/// Test seam.
export function _resetShipmentMode() { _impl = null; }
