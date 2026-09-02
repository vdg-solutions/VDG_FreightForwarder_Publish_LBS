// output/web/js.tmp/implementations/ui/core_abstractions/ports/data/sales-reads.js
var _impl = null;
function bindSalesReads(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/sales-reads: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var listCustomerMasters = (...a) => _i().listCustomerMasters(...a);
var listCarrierMasters = (...a) => _i().listCarrierMasters(...a);
var listWeightUnitCodes = (...a) => _i().listWeightUnitCodes(...a);
var listContainerTypeOptions = (...a) => _i().listContainerTypeOptions(...a);
var getRepProfile = (...a) => _i().getRepProfile(...a);
var getCommissionRuleAssignment = (...a) => _i().getCommissionRuleAssignment(...a);
var getShipmentCommissionSnapshot = (...a) => _i().getShipmentCommissionSnapshot(...a);
var listCommissionEntriesFor = (...a) => _i().listCommissionEntriesFor(...a);
var salesShareTotal = (...a) => _i().salesShareTotal(...a);
var listPnlLines = (...a) => _i().listPnlLines(...a);
var listPnlLinesFor = (...a) => _i().listPnlLinesFor(...a);
var listQuotations = (...a) => _i().listQuotations(...a);
var getQuotation = (...a) => _i().getQuotation(...a);
var listBillingRecords = (...a) => _i().listBillingRecords(...a);
var listDemdetInstances = (...a) => _i().listDemdetInstances(...a);
var listAirRateCards = (...a) => _i().listAirRateCards(...a);
var readDocumentSources = (...a) => _i().readDocumentSources(...a);
var customerForNote = (...a) => _i().customerForNote(...a);
var createCustomerDraft = (...a) => _i().createCustomerDraft(...a);

export {
  bindSalesReads,
  listCustomerMasters,
  listCarrierMasters,
  listWeightUnitCodes,
  listContainerTypeOptions,
  getRepProfile,
  getCommissionRuleAssignment,
  getShipmentCommissionSnapshot,
  listCommissionEntriesFor,
  salesShareTotal,
  listPnlLines,
  listPnlLinesFor,
  listQuotations,
  getQuotation,
  listBillingRecords,
  listDemdetInstances,
  listAirRateCards,
  readDocumentSources,
  customerForNote,
  createCustomerDraft
};
