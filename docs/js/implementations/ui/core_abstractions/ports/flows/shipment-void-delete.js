// shipment-void-delete — port: void (soft-cancel) versus hard-delete. The verdict is Rust's, the
// confirm dialog is the view's: Rust decides, the ui asks, Rust acts.

/// The state a voided shipment holds — the badge flips to it without waiting for a reload.
export const CANCELLED_STATE = 'Cancelled';

let _impl = null;

/// Root bootstrap binds { chooseShipmentAffordance, runShipmentAffordance } once.
export function bindShipmentVoidDelete(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/shipment-void-delete: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (shipment) -> 'delete' | 'void' | 'none'
export const chooseShipmentAffordance = (...a) => _i().chooseShipmentAffordance(...a);
/// ({ repo, shipment, isManager, confirm }) -> { mutated, affordance | reason }
export const runShipmentAffordance = (...a) => _i().runShipmentAffordance(...a);
