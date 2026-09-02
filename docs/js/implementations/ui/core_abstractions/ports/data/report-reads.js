// report-reads — port: the manager report screens' reads, one named call per REPORT.
//
// Owner law 2026-09-01: JS renders and captures input; it holds no business decision and it does
// not know what collections exist. Eighteen report views used to open with `repo.list('billing',
// null)` / `repo.list('approval_request', null)` and then decide, in the view, which rows counted
// — `status === 'Pending' && !_deleted` for approvals, a sort-and-slice for the audit page, a
// `created_by` projection for the commission rule editor. Every one of those is a statement about
// what the data MEANS, and every one had a second author in Rust.
//
// There was a live trap under it too: `WasmEntityRepo.list` is a wasm-bindgen export taking ONE
// argument, so a predicate passed as a second argument was dropped in silence and the caller got
// the WHOLE table. Measured: `repo.list('shipment', () => false)` answered all 7 rows. Nothing
// here takes a predicate — the row set each call answers is decided in `operators/data/
// report_reads`, where a filter can actually run.
//
// Each call answers ONE screen. The bundles (`cashFlowInputs`, `customer360Inputs`) are one round
// trip on purpose: a view sequencing three awaited reads is a view deciding how the screen loads.

let _impl = null;

/// Root bootstrap binds the whole surface once (compose-ui/data-reports.js).
export function bindReportReads(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/report-reads: no implementation bound (root bootstrap binds it)');
  return _impl;
}

// ── finance ───────────────────────────────────────────────────────────────────

/// () -> { receivables, costLines, shipments }: everything Cash Flow & AR is computed from.
export const cashFlowInputs = (...a) => _i().cashFlowInputs(...a);
/// () -> the outstanding balances alone, for the AR grid's own repaint.
export const receivablesLedger = (...a) => _i().receivablesLedger(...a);
/// (customer) -> void. Stamps who chased this customer's balance and when.
export const markReceivableFollowedUp = (...a) => _i().markReceivableFollowedUp(...a);
/// (customer, text) -> void. Appends a collections note to that customer's receivable.
export const addReceivableNote = (...a) => _i().addReceivableNote(...a);
/// () -> { shipments, pnlLines }: the P&L pivot's two sources.
export const pnlReportInputs = (...a) => _i().pnlReportInputs(...a);
/// (period) -> the close record of one period, or null when it was never closed.
export const periodCloseRecord = (...a) => _i().periodCloseRecord(...a);

// ── commission ────────────────────────────────────────────────────────────────

/// () -> the P&L lines a commission is calculated FROM. The leaderboard and the settlement screen
/// read the same thing, or two screens disagree about what a rep is owed.
export const commissionBasisLines = (...a) => _i().commissionBasisLines(...a);
/// () -> what has actually been paid out.
export const settledCommissionPayouts = (...a) => _i().settledCommissionPayouts(...a);
/// () -> { users, rules, entryAuthors } for the rule editor's grid.
export const commissionRuleEditorInputs = (...a) => _i().commissionRuleEditorInputs(...a);
/// () -> [{ key, pattern, count, salesPct, recipient, kind }] — repeated manual overrides worth a
/// standing rule. The threshold and the rule NAME are Rust's.
export const commissionRuleSuggestions = (...a) => _i().commissionRuleSuggestions(...a);
/// ({ salesPct, recipient, kind, priority }) -> void. Writes the suggestion out as a real rule;
/// the id, the name and the split shape are derived in Rust.
export const promoteCommissionSuggestion = (...a) => _i().promoteCommissionSuggestion(...a);
/// (ruleId, rule) -> void. The editor composed the body; where it lands and who may write it are
/// wasm's. Throws `access.action.denied:commission.rules.edit` when the caller may not.
export const saveCommissionRule = (...a) => _i().saveCommissionRule(...a);
/// (ruleId) -> void. Whether the rule MAY go (a rep already earned under it) is a separate
/// question the screen asks `commission_rule_block_reason` first.
export const deleteCommissionRule = (...a) => _i().deleteCommissionRule(...a);

// ── operations ────────────────────────────────────────────────────────────────

/// (offset, limit) -> a page of the audit trail, newest first, tombstones already dropped.
export const auditTrail = (...a) => _i().auditTrail(...a);
/// () -> every approval still waiting on a manager, oldest first.
export const pendingApprovals = (...a) => _i().pendingApprovals(...a);
/// () -> every approval decision on record; the reviewer picks the period, not this read.
export const approvalDecisionLog = (...a) => _i().approvalDecisionLog(...a);
/// () -> the exceptions the command centre triages, open AND closed (MTTR needs the closed ones).
export const exceptionCaseload = (...a) => _i().exceptionCaseload(...a);
/// () -> the jobs on the pipeline board.
export const pipelineShipments = (...a) => _i().pipelineShipments(...a);
/// () -> one row per voyage's authority filing.
export const manifestFilings = (...a) => _i().manifestFilings(...a);
/// () -> the sales people whose PROFILE this screen edits. Not the authorization list.
export const salesProfiles = (...a) => _i().salesProfiles(...a);
/// () -> { customers, receivables, exceptions, quotations }. Shipments arrive separately, joined
/// with whatever sell side this reader can actually see.
export const customer360Inputs = (...a) => _i().customer360Inputs(...a);
/// (customerId, text) -> the customer record as written. Authored by the session principal.
export const appendCustomerNote = (...a) => _i().appendCustomerNote(...a);
/// () -> { awbs, airRates, carriers }: the CASS reconciliation's three sources.
export const cassReconciliationInputs = (...a) => _i().cassReconciliationInputs(...a);
/// (aId, bId) -> void. Records that two paired master records are NOT the same thing.
export const suppressDuplicatePair = (...a) => _i().suppressDuplicatePair(...a);
