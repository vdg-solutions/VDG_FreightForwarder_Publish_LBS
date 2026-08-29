// quote-orchestrator — port: quotation drafts, their state moves and the convert guard.

let _impl = null;

/// Root bootstrap binds { generateQuoteId, saveDraft, sendToCustomer, markAccepted,
/// checkAlreadyConverted } once.
export function bindQuoteOrchestrator(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/quote-orchestrator: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (repo, salesRepId) -> 'Q-YYMMDD-HASH8'
export const generateQuoteId = (...a) => _i().generateQuoteId(...a);
/// (repo, actorId, salesRepId, formData) -> { id, quote, pending_manager_approval }
export const saveDraft = (...a) => _i().saveDraft(...a);
/// (repo, quote) -> the updated quote
export const sendToCustomer = (...a) => _i().sendToCustomer(...a);
/// (repo, quote) -> the updated quote
export const markAccepted = (...a) => _i().markAccepted(...a);
/// (repo, quoteId) -> the shipment already minted from it, or null
export const checkAlreadyConverted = (...a) => _i().checkAlreadyConverted(...a);
