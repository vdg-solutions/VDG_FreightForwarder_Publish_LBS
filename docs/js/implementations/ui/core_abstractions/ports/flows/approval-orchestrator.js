// approval-orchestrator — port: deciding an approval_request (the decision record, the request
// status move, the QuoteOverride mirror-back, the self-approved stamp — all in wasm).

let _impl = null;

/// Root bootstrap binds { decide } once.
export function bindApprovalOrchestrator(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/approval-orchestrator: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (approvalId, decision, comment, delegatedTo) -> { selfApproved }
export const decide = (...a) => _i().decide(...a);
