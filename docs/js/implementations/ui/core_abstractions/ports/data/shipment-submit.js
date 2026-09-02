// shipment-submit — port: what a shipment save DECIDES, as the form calls it.
//
// Six rules lived in submit-orchestrator.js until the 2026-09-01 law: the Job No precedence, the
// collision arbitration, the ledger-version policy, the commission-entry id scheme and row shape,
// the EX/IM ref prefix, and the required-field rules. They now live in
// `operators/flows/job_no_arbitration.rs` and `operators/data/shipment_submit.rs`; what is left
// here is the name the form calls them by.

let _impl = null;

/// Root bootstrap binds the whole set once (compose-ui/data-sales.js).
export function bindShipmentSubmit(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/shipment-submit: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (repo, state, salesRepId) -> a fresh shipment_ref, minted under the direction the job runs.
export const mintShipmentRef = (...a) => _i().mintShipmentRef(...a);
/// ({ formJobNo, priorJobNo, ownRef, salesRepId }) -> the Job No this save writes.
export const resolveJobNo = (...a) => _i().resolveJobNo(...a);
/// (shipment, salesRepId) -> the shipment as it now stands. A record that LOST the arbitration
/// comes back re-minted and already re-saved, with the D-O / HBL that mirrored the old number
/// carried along; one that kept its number comes back untouched.
export const healJobNoCollision = (...a) => _i().healJobNoCollision(...a);
/// (priorVersion | null) -> the version this save stamps.
export const nextLedgerVersion = (...a) => _i().nextLedgerVersion(...a);
/// (priorPublishState, publish) -> the state to write. THROWS when the save would take an
/// already-published job back to draft — Accounting may have raised an invoice from it, and the
/// refusal is the answer, not an error to swallow. The thrown message is the F-47-04 envelope
/// (`{key, ...}` as JSON) so `saveErrorText` renders it through `t()` instead of showing the
/// reader a raw key.
export const resolvePublishState = (...a) => _i().resolvePublishState(...a);
/// (state) -> i18n keys of every rule this submission breaks; empty = it may be saved.
export const submissionErrorKeys = (...a) => _i().submissionErrorKeys(...a);
/// ({ shipmentRef, commissionLines, pnlLines, ledgerVersion, occurredAt, createdBy, freshRef })
/// -> { ok, skipped }. ONE call for both whole row sets — never one call per row.
export const writeSideRecords = (...a) => _i().writeSideRecords(...a);
