// ledger-poster — port: turning a shipment, a commission or a reversal into journal entries and
// appending them. Idempotent by post key: a repost of the same source+version appends nothing.

let _impl = null;

/// Root bootstrap binds { buildEntriesFromShipment, buildEntriesFromCommission, buildReversalEntry,
/// postShipment, postCommission, postReversal } once.
export function bindLedgerPoster(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/ledger-poster: no implementation bound (root bootstrap binds it)');
  return _impl;
}

export const buildEntriesFromShipment = (...a) => _i().buildEntriesFromShipment(...a);
export const buildEntriesFromCommission = (...a) => _i().buildEntriesFromCommission(...a);
export const buildReversalEntry = (...a) => _i().buildReversalEntry(...a);
/// (shipment) -> { posted, entryIds }
export const postShipment = (...a) => _i().postShipment(...a);
/// (commissionEntry) -> { posted, entryIds }
export const postCommission = (...a) => _i().postCommission(...a);
/// (entryId, actorId) -> { posted, entryIds }
export const postReversal = (...a) => _i().postReversal(...a);
