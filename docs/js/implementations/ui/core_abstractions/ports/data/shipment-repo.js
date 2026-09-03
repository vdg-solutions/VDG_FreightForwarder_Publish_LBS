// shipment-repo — port: one shipment, two records, one API, as the screens call it (E-37).
// The root bootstrap binds it to the wasm freight_app exports; the ui never sees wasm.
//
// Constants the views need are ui vocabulary and live here: a view must not reach into the
// use-case module to learn what a shipment record is called.

export const KIND_SHIPMENT = 'shipment';

export const OP_SAVE = 'save';
export const OP_STATE = 'state';
export const OP_DELETE = 'delete';

/**
 * Marks whether the sell side of this record was actually READ.
 *
 * F-37-06: the screens are built from what the reader could see, not from their role. Without this
 * flag a CS row is indistinguishable from a rep's row whose margin happens to be zero, and every
 * derived figure — the Lãi/lỗ column above all — quietly computes cost-with-no-revenue and reports
 * that every job lost money. It is a read RECEIPT, not a permission: absent means "nothing came
 * back", which is the same thing whether the folder was never granted or the job truly has no sell
 * side yet.
 *
 * The binding stamps it NON-ENUMERABLE, so it survives neither `JSON.stringify` nor a spread — it
 * is not part of the record and must never be persisted or diffed.
 */
export const REVENUE_SEEN = '_revenue_seen';

let _impl = null;

/// Root bootstrap binds { putShipment, putEnvelope, getEnvelope, listEnvelopes, deleteShipment,
/// rollbackShipmentCreate,
/// getShipment, listShipments, joinLoaded, anyRevenueVisible } once.
export function bindShipmentRepo(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/shipment-repo: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (repo, shipment) -> { envelope, revenue }; throws PeriodLockedError / LicenseReadOnlyError.
export const putShipment = (...a) => _i().putShipment(...a);
/// (repo, ref, shipmentLike) -> envelope. The operational half only; never period-gated.
export const putEnvelope = (...a) => _i().putEnvelope(...a);
/// (repo, ref) -> the stored envelope, with no cross-fork revenue read.
export const getEnvelope = (...a) => _i().getEnvelope(...a);
/// (repo, predicate?) -> envelopes.
export const listEnvelopes = (...a) => _i().listEnvelopes(...a);
/// (repo, ref) -> void; throws PeriodLockedError / LicenseReadOnlyError.
export const deleteShipment = (...a) => _i().deleteShipment(...a);
/// (repo, ref) -> void. Undo a create that failed part-way — gated on `shipment.create`, the
/// authority that wrote the record, not on the manager-only Void/Delete affordance.
export const rollbackShipmentCreate = (...a) => _i().rollbackShipmentCreate(...a);
/// (repo, {shipment_ref, lines, ledger_version, occurred_at, created_by}) -> {ok, skipped}.
/// Replaces the whole commission-entry set; the id scheme and record shape are wasm's.
export const overwriteCommissionEntries = (...a) => _i().overwriteCommissionEntries(...a);
/// (repo, ref) -> the shipment rejoined with whatever revenue this reader can see, or null.
export const getShipment = (...a) => _i().getShipment(...a);
/// (repo) -> joined shipments, everything this reader can see.
export const listShipments = (...a) => _i().listShipments(...a);
/// (repo) -> joined shipments belonging to the signed-in account.
///
/// A separate door rather than a predicate argument: "mine" is decided in wasm off the session's
/// own account (`rep_account::belongs_to`), and there is deliberately no way for a caller to ask
/// for somebody else's.
export const listMyShipments = (...a) => _i().listMyShipments(...a);
/// (repo, envelopes) -> joined shipments, for callers that already hold envelopes.
export const joinLoaded = (...a) => _i().joinLoaded(...a);
/// (rows) -> true when at least one row carries a sell side this reader could read.
export const anyRevenueVisible = (...a) => _i().anyRevenueVisible(...a);
