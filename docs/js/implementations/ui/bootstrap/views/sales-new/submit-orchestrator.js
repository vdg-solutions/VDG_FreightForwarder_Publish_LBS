// submit-orchestrator.js — the save, as the form performs it. Every DECISION it used to make is a
// named use-case now (owner law 2026-09-01): the Job No precedence and the collision arbitration in
// `operators/flows/job_no_arbitration.rs`, the ledger-version policy, the commission-entry and
// pnl-line id schemes, the EX/IM ref prefix and the submission rules in
// `operators/data/shipment_submit.rs`. What is left here is sequence and the user's error message.

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';

import { buildShipment, deriveDirection } from './shipment-builder.js';
import { putShipment, rollbackShipmentCreate, getEnvelope } from '../../../core_abstractions/ports/data/shipment-repo.js';
import {
  mintShipmentRef, resolveJobNo, healJobNoCollision, nextLedgerVersion, submissionErrorKeys, writeSideRecords, resolvePublishState } from '../../../core_abstractions/ports/data/shipment-submit.js';
import { ensureShipmentStateAliases } from '../../../core_abstractions/ports/flows/shipment-state-aliases.js';
import { registerFsmEntity } from '../../../core_abstractions/ports/flows/fsm-ingest.js';
import { autoAdvanceShipment } from '../../../core_abstractions/ports/flows/fsm-auto-advance.js';
import { todayLocal } from '../../../../kernel/core_abstractions/util/today-local.js';

const WARN_PNL_LINES_MISSING = 'pnl_lines_empty';
/// A create has no version to count from; the rule that turns that into 1 is wasm's.
const NO_PRIOR_VERSION = null;

// → string[] (empty = valid); used by the old 5-section form. The RULES are wasm's — this picks
// the reader's words for the keys they answer with.
export function validateForm(state) {
  return submissionErrorKeys(state).map((key) => t(key));
}

// Highlight fields + show summary block (AC-11). Called on EVERY submit attempt, not only a
// failing one — a stale banner from a prior attempt only clears because this runs unconditionally
// and toggles `hidden` off the current error count instead of only ever turning it on.
export function highlightErrors(root, errors) {
  root.querySelectorAll('.field-error').forEach((el) =>
    el.classList.remove('border-red-400', 'field-error')
  );

  if (errors.some((e) => e === t('sales_new.validation.no_bill'))) {
    ['[name=mbl]', '[name=hbl]', '[name=job_file_no]'].forEach((sel) =>
      root.querySelector(sel)?.classList.add('border-red-400', 'field-error')
    );
  }
  if (errors.some((e) => e === t('sales_new.validation.no_customer'))) {
    root.querySelector('[name=customer]')?.classList.add('border-red-400', 'field-error');
  }
  if (errors.some((e) => e === t('sales_new.validation.closing_si_incomplete'))) {
    root.querySelector('[name=closing_si]')?.classList.add('border-red-400', 'field-error');
  }
  if (errors.some((e) => e === t('sales_new.validation.closing_cy_incomplete'))) {
    root.querySelector('[name=closing_cy]')?.classList.add('border-red-400', 'field-error');
  }

  // Two ids have carried this same summary block across the form's history —
  // #form-error-summary (no longer rendered by sales-new-form.js's markup) and
  // #shipment-form-errors (the one actually mounted today). Drive whichever is present so
  // neither a leftover reference nor the live one is left half-wired.
  const html = errors.map((e) => `<div>• ${e}</div>`).join('');
  for (const sel of ['#form-error-summary', '#shipment-form-errors']) {
    const el = root.querySelector(sel);
    if (!el) continue;
    el.innerHTML = html;
    el.classList.toggle('hidden', errors.length === 0);
  }
}

// The rows that hang off a saved shipment — its commission entries and its P&L lines — in ONE
// call for the whole of both sets. A partial write is raised, never warned about and passed over:
// the create path compensates on it, and on an amendment the rep would otherwise be told the save
// landed while what they are owed was not written.
async function _writeSideRecords(ref, shipment, salesRepId, version, freshRef) {
  const written = await writeSideRecords({
    shipmentRef:     ref,
    commissionLines: shipment.commission_lines || [],
    pnlLines:        shipment.pnl_lines || [],
    ledgerVersion:   version,
    occurredAt:      todayLocal(),
    createdBy:       salesRepId || null,
    freshRef,
  });
  if (!written.ok) throw new Error(`side records incomplete: ${(written.skipped || []).join(', ')}`);
}

// F-18-11: seed-if-unseeded + load once per call — resolver input for buildShipment's state
// constraint (DEFECT-1: shared seed-on-first-read helper, idempotent).
async function _loadStateAliasRows(repo) {
  return ensureShipmentStateAliases(repo);
}

// validate → buildShipment → putShipment → side records → post ledger → return
// { ref, warnings } | throws. F-23-03: ledger-post failure rolls back every write this call made
// (compensating delete, not a real transaction — pm-decisions.md Q3).
export async function submitForm(state, repo, salesRepId, opts = {}) {
  if (!repo) throw new Error('Repo not available');

  const publish = opts.publish !== false;

  // The direction the job runs decides the ref's prefix — an import job must not mint under EX
  // just because the form carries no explicit direction field (F-41-03).
  const ref = await mintShipmentRef(repo, deriveDirection(state), salesRepId);

  const stateAliasRows = await _loadStateAliasRows(repo);
  const jobNo = await resolveJobNo({ formJobNo: state.job_no, salesRepId });
  let shipment = buildShipment(state, ref, salesRepId, { publishState: resolvePublishState(null, publish), stateAliasRows, jobNo });
  const version = nextLedgerVersion(NO_PRIOR_VERSION);
  shipment._ledger_version = version;
  // E-37: two records, split in Rust. The envelope goes to _shared/shipments where CS and the rep
  // both work; the sell side goes to the rep's fork, which CS holds no permission on.
  await putShipment(repo, shipment);
  // F-41-04: the pre-check is check-then-write, so look again now the write has landed. A record
  // that lost the arbitration comes back re-minted and already re-saved — carry on with THAT one,
  // the publish snapshot below reads the Job No off it.
  shipment = await healJobNoCollision(shipment, salesRepId);
  await registerFsmEntity(ref, shipment.state); // F-19-88 AC-01: make it a first-class FSM entity

  const warnings = [];
  if (!shipment.pnl_lines || shipment.pnl_lines.length === 0) {
    warnings.push(WARN_PNL_LINES_MISSING);
  }

  try {
    await _writeSideRecords(ref, shipment, salesRepId, version, true);

    // F-37-05: publish is what CREATES the record Accounting reads. A publish_state flag on the
    // envelope cannot make "kế toán chỉ thấy sau khi publish" true - Accounting is not in the
    // reader set of _shared/shipments at all, so it sees nothing there whatever the flag says.
    if (publish) await _handOverToAccounting(repo, shipment);
    // Draft or Publish Pending: persist only. Accounting logic is now handled asynchronously by WASM.
  } catch (err) {
    // ONE call, and `err` rethrown whatever it answers. Which records the compensation removes, in
    // what order, and that a failing step never cancels the ones after it, are decisions — they
    // live in shipment_create_rollback.rs (owner law 2026-09-01), not here. What JS keeps is the
    // part that is genuinely UI: preserving the error the user needs to read, and saying out loud
    // when the cleanup left something behind instead of letting an orphan go unmentioned.
    const undo = await rollbackShipmentCreate(repo, ref).catch((e) => ({ ok: false, skipped: [e?.message || String(e)] }));
    if (!undo?.ok) console.warn('[VDG] rollback left records behind:', undo?.skipped); // DEV
    throw err;
  }

  // E-40: data-driven advance — booking entered on the very first save moves the job itself
  const advancedTo = await autoAdvanceShipment(repo, shipment);

  return { ref, warnings, publishState: shipment.publish_state, advancedTo };
}

// AC-04..AC-06: update in-place — overwrite shipment record + both side-record sets for ref.
// commission_lines are embedded in the shipment payload (ground truth for UI).
// F-23-03: `_ledger_version` bumps on every save so a re-post produces new entry_ids
// instead of matching the already-posted dedup key from the prior version (pm-decisions.md
// Q3). A failure here still propagates to the caller's catch — unlike submitForm there is no
// safe compensating delete for an in-place edit of a pre-existing record (it would destroy the
// customer's prior data, not just this call's writes).
export async function updateForm(state, repo, salesRepId, ref, opts = {}) {
  if (!repo) throw new Error('Repo not available');

  const publish = opts.publish !== false;

  const prior = await getEnvelope(repo, ref).catch(() => null);
  const stateAliasRows = await _loadStateAliasRows(repo);
  // F-18-11 AC-02: a re-save that carries no explicit state change must never regress the
  // prior resolved canonical state back to the create-time default — read prior.state BEFORE
  // rebuilding via buildShipment. An explicit edit-time state change (once the UI grows one)
  // still wins since state.state is checked first.
  const stateInput = { ...state, state: state.state ?? prior?.state };
  const jobNo = await resolveJobNo({
    formJobNo: state.job_no, priorJobNo: prior?.job_no, ownRef: ref, salesRepId,
  });
  let shipment = buildShipment(stateInput, ref, salesRepId, { publishState: resolvePublishState(prior?.publish_state ?? null, publish), stateAliasRows, jobNo });
  const version = nextLedgerVersion(prior?._ledger_version ?? NO_PRIOR_VERSION);
  shipment._ledger_version = version;
  await putShipment(repo, shipment);
  shipment = await healJobNoCollision(shipment, salesRepId);
  await registerFsmEntity(ref, shipment.state); // AC-09: register-if-absent, never regresses an advanced state

  // Both sets replaced together, before the publish. Nothing in the snapshot reads the pnl_line
  // entities — it is built from the shipment payload — so this only means the two row sets can no
  // longer disagree with the record that was already written above.
  await _writeSideRecords(ref, shipment, salesRepId, version, false);

  // F-37-05: an amendment publishes a NEW REVISION. Never an overwrite - Accounting may already
  // have raised an invoice from the previous one, and changing the figures under it is exactly
  // the thing a published record must not be able to do.
  if (publish) await _handOverToAccounting(repo, shipment);

  // E-40: a re-save that completed the missing data (e.g. ATD typed on the bill screen) moves
  // the job right here — no drag, no button.
  const advancedTo = await autoAdvanceShipment(repo, shipment);

  return { publishState: shipment.publish_state, advancedTo };
}

/**
 * Write the billing snapshot, and let a failure ROLL THE PUBLISH BACK.
 *
 * Reporting success while Accounting was handed nothing is the failure this whole card exists to
 * remove: the rep sees "đã publish", Accounting sees no job, and nobody finds out until somebody
 * asks where the invoice is.
 */
async function _handOverToAccounting(repo, shipment) {
  const { publishBilling } = await import('../../../core_abstractions/ports/data/billing-publish-repo.js');
  await publishBilling(repo, shipment, {});
}
