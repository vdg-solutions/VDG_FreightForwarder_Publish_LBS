// due-soon — port: the "sắp tới hạn thanh toán" rows the rep's own screen lists. The badge tick
// and this list share ONE compute in Rust, so they cannot disagree about which invoices are due.

let _impl = null;

/// Root bootstrap binds { computeDueSoonRows } once.
export function bindDueSoon(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/due-soon: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (salesId) -> Promise<[{ billingId, customerId, dueDate, daysUntilDue, amountVnd }]>
export const computeDueSoonRows = (...a) => _i().computeDueSoonRows(...a);
