// ledger-poster.js — port: the ledger poster use-case as its collaborators call it; the freight_app bootstrap binds
// the operator (operators/ledger-poster.js) behind it. Constants and error shapes are contract and live here.

let _impl = null;

/// The operator registers { buildEntriesFromShipment, buildEntriesFromCommission, validateEntries, buildReversalEntry, postReversal, postShipment, postCommission, postJournalEntries } once, from the freight_app bootstrap.
export function bindLedgerPoster(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('freight_app/ledger-poster: no operator bound (the freight_app bootstrap binds it)');
  return _impl;
}

export const buildEntriesFromShipment = (...a) => _i().buildEntriesFromShipment(...a);
export const buildEntriesFromCommission = (...a) => _i().buildEntriesFromCommission(...a);
export const validateEntries = (...a) => _i().validateEntries(...a);
export const buildReversalEntry = (...a) => _i().buildReversalEntry(...a);
export const postReversal = (...a) => _i().postReversal(...a);
export const postShipment = (...a) => _i().postShipment(...a);
export const postCommission = (...a) => _i().postCommission(...a);
export const postJournalEntries = (...a) => _i().postJournalEntries(...a);

/// Test seam.
export function _resetLedgerPoster() { _impl = null; }
