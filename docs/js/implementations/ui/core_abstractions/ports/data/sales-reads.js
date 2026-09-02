// sales-reads — port: the reads the sales screens make, each one a use-case with a NAME.
//
// Owner law 2026-09-01: JS is a thin shell and must not know which collections exist. A screen asks
// for "the customer masters" or "this job's commission entries"; which kind that resolves to is a
// fact of `operators/data/sales_reads.rs`. Fifteen view files used to hold that opinion privately,
// and got it wrong twice on record — 'shipments' for 'shipment', 'customer' for 'customers' — each
// time rendering an empty screen with no error.
//
// No `repo` argument: the use-case reaches storage through the platform installed at boot. A view
// that still checks `window.__vdg_repo` is checking that boot finished, not passing a handle.

let _impl = null;

/// Root bootstrap binds the whole set once (compose-ui/data-sales.js).
export function bindSalesReads(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/sales-reads: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// () -> the customer master rows.
export const listCustomerMasters = (...a) => _i().listCustomerMasters(...a);
/// () -> the carrier master rows.
export const listCarrierMasters = (...a) => _i().listCarrierMasters(...a);
/// () -> the unit codes the weight select offers, already narrowed to weights.
export const listWeightUnitCodes = (...a) => _i().listWeightUnitCodes(...a);
/// () -> `{ code, label_vi }` per container type the registry holds; empty = fall back to the
/// standard set.
export const listContainerTypeOptions = (...a) => _i().listContainerTypeOptions(...a);
/// (salesRepId) -> the rep's user record, or null when there is none.
export const getRepProfile = (...a) => _i().getRepProfile(...a);
/// (salesRepId) -> the manager-assigned commission split, or null.
export const getCommissionRuleAssignment = (...a) => _i().getCommissionRuleAssignment(...a);
/// (shipmentRef) -> the commission snapshot an edit screen hydrates from, or null.
export const getShipmentCommissionSnapshot = (...a) => _i().getShipmentCommissionSnapshot(...a);
/// (shipmentRef) -> that job's commission entries.
export const listCommissionEntriesFor = (...a) => _i().listCommissionEntriesFor(...a);
/// (shipmentRefs) -> what the rep is owed across those jobs.
export const salesShareTotal = (...a) => _i().salesShareTotal(...a);
/// () -> every materialized P&L line; the grid and analytics aggregate from these.
export const listPnlLines = (...a) => _i().listPnlLines(...a);
/// (shipmentRef) -> that job's P&L lines, in either id scheme.
export const listPnlLinesFor = (...a) => _i().listPnlLinesFor(...a);
/// () -> the quotations.
export const listQuotations = (...a) => _i().listQuotations(...a);
/// (id) -> one quotation, or null.
export const getQuotation = (...a) => _i().getQuotation(...a);
/// () -> the billing records.
export const listBillingRecords = (...a) => _i().listBillingRecords(...a);
/// () -> the demurrage/detention instances.
export const listDemdetInstances = (...a) => _i().listDemdetInstances(...a);
/// () -> the air rate cards.
export const listAirRateCards = (...a) => _i().listAirRateCards(...a);
/// () -> { documents, shippingInstructions, arrivalNotices, releaseOrders } for the status board.
export const readDocumentSources = (...a) => _i().readDocumentSources(...a);
/// (nameOrId) -> the party a printed note is addressed to; never null once a name was given.
export const customerForNote = (...a) => _i().customerForNote(...a);
/// (name) -> { created, record }. Deduped: an index miss is not proof the master is absent.
export const createCustomerDraft = (...a) => _i().createCustomerDraft(...a);
