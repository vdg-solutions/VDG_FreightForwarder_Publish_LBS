// output/web/js.tmp/implementations/ui/core_abstractions/ports/data/report-reads.js
var _impl = null;
function bindReportReads(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/report-reads: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var cashFlowInputs = (...a) => _i().cashFlowInputs(...a);
var receivablesLedger = (...a) => _i().receivablesLedger(...a);
var markReceivableFollowedUp = (...a) => _i().markReceivableFollowedUp(...a);
var addReceivableNote = (...a) => _i().addReceivableNote(...a);
var pnlReportInputs = (...a) => _i().pnlReportInputs(...a);
var periodCloseRecord = (...a) => _i().periodCloseRecord(...a);
var commissionBasisLines = (...a) => _i().commissionBasisLines(...a);
var settledCommissionPayouts = (...a) => _i().settledCommissionPayouts(...a);
var commissionRuleEditorInputs = (...a) => _i().commissionRuleEditorInputs(...a);
var commissionRuleSuggestions = (...a) => _i().commissionRuleSuggestions(...a);
var promoteCommissionSuggestion = (...a) => _i().promoteCommissionSuggestion(...a);
var saveCommissionRule = (...a) => _i().saveCommissionRule(...a);
var deleteCommissionRule = (...a) => _i().deleteCommissionRule(...a);
var auditTrail = (...a) => _i().auditTrail(...a);
var pendingApprovals = (...a) => _i().pendingApprovals(...a);
var approvalDecisionLog = (...a) => _i().approvalDecisionLog(...a);
var exceptionCaseload = (...a) => _i().exceptionCaseload(...a);
var pipelineShipments = (...a) => _i().pipelineShipments(...a);
var manifestFilings = (...a) => _i().manifestFilings(...a);
var salesProfiles = (...a) => _i().salesProfiles(...a);
var customer360Inputs = (...a) => _i().customer360Inputs(...a);
var appendCustomerNote = (...a) => _i().appendCustomerNote(...a);
var cassReconciliationInputs = (...a) => _i().cassReconciliationInputs(...a);
var suppressDuplicatePair = (...a) => _i().suppressDuplicatePair(...a);

export {
  bindReportReads,
  cashFlowInputs,
  receivablesLedger,
  markReceivableFollowedUp,
  addReceivableNote,
  pnlReportInputs,
  periodCloseRecord,
  commissionBasisLines,
  settledCommissionPayouts,
  commissionRuleEditorInputs,
  commissionRuleSuggestions,
  promoteCommissionSuggestion,
  saveCommissionRule,
  deleteCommissionRule,
  auditTrail,
  pendingApprovals,
  approvalDecisionLog,
  exceptionCaseload,
  pipelineShipments,
  manifestFilings,
  salesProfiles,
  customer360Inputs,
  appendCustomerNote,
  cassReconciliationInputs,
  suppressDuplicatePair
};
