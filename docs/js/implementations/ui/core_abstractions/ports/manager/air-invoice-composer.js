// air-invoice-composer — port: the airline invoice (CASS) reconciliation compute (F-16-09).
// Storage kind names are ui vocabulary and stay here; AWB itself already has its own port
// (storage/awb-repo.js) — this only adds the two new master-data kinds the reconciliation reads.

export const KIND_AIR_RATE = 'air_rate';
export const KIND_AIRLINE_CARRIER = 'airline_carrier';

let _impl = null;

/// Root bootstrap binds { composeAirInvoice } once.
export function bindAirInvoiceComposer(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/air-invoice-composer: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (awbs, airRates, carriers) -> { rows, totals }
export const composeAirInvoice = (...a) => _i().composeAirInvoice(...a);
