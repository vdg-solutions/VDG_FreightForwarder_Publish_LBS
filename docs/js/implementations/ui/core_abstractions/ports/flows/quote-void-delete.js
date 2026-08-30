// quote-void-delete — port: delete (a Draft nobody has seen) versus withdraw (a Sent/Accepted
// quote the customer already holds). The verdict is Rust's (quotation_fsm), the confirm dialog is
// the view's: Rust decides, the ui asks, Rust acts. Same shape as shipment-void-delete.js.

/// The state a withdrawn quote holds — the badge flips to it without waiting for a reload.
export const CANCELLED_STATE = 'Cancelled';

let _impl = null;

/// Root bootstrap binds { chooseQuoteAffordance, runQuoteAffordance } once.
export function bindQuoteVoidDelete(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/quote-void-delete: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (quote) -> 'delete' | 'withdraw' | 'none'
export const chooseQuoteAffordance = (...a) => _i().chooseQuoteAffordance(...a);
/// ({ quote, canWrite, confirm }) -> { mutated, affordance | reason }
export const runQuoteAffordance = (...a) => _i().runQuoteAffordance(...a);
