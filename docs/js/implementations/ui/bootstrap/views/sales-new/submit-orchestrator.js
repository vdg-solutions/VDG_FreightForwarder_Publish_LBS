// submit-orchestrator.js — validate, persist; buildShipment delegated to shipment-builder.js

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';

import { buildShipment, deriveDirection } from './shipment-builder.js';
import { pnlLineId, deletePnlLinesFor } from '../../../core_abstractions/ports/data/pnl-line-id.js';
import { putShipment, rollbackShipmentCreate, getEnvelope, listEnvelopes } from '../../../core_abstractions/ports/data/shipment-repo.js';
import { ensureShipmentStateAliases } from '../../../core_abstractions/ports/flows/shipment-state-aliases.js';
import { registerFsmEntity } from '../../../core_abstractions/ports/flows/fsm-ingest.js';
import { autoAdvanceShipment } from '../../../core_abstractions/ports/flows/fsm-auto-advance.js';
import { ensureRepCode } from '../../../core_abstractions/ports/flows/rep-code-registry.js';
import { assignJobNo } from '../../../core_abstractions/ports/flows/job-no-gen.js';
import { todayLocal } from '../../../../kernel/core_abstractions/util/today-local.js';

const KIND_USER = 'user';
const WARN_PNL_LINES_MISSING = 'pnl_lines_empty';
// AC-08: max number of CE keys to attempt deletion during commission overwrite
const MAX_CE_CLEANUP = 20;
const INITIAL_LEDGER_VERSION = 1; // F-23-03 pm-decisions.md Q3: envelope-only field

// window is undefined under node:test (this module is imported there directly) — guard
// instead of a bare `window.__vdg_ledger_repo` default so the browser global stays lazy.
function _defaultLedgerRepo() {
  return typeof window !== 'undefined' ? window.__vdg_ledger_repo : undefined;
}

function directionPrefix(direction) {
  return (direction || '').toLowerCase() === 'import' ? 'IM' : 'EX';
}

// → string[] (empty = valid); used by the old 5-section form
export function validateForm(state) {
  const errs = [];
  if (!state.mbl && !state.hbl && !state.job_file_no) {
    errs.push(t('sales_new.validation.no_bill'));
  }
  if (!state.customer) {
    errs.push(t('sales_new.validation.no_customer'));
  }
  if (!state.pnl_lines.some((l) => l.amount > 0)) {
    errs.push(t('sales_new.validation.no_lines'));
  }
  if (state._etdEtaError) {
    errs.push(t('sales_new.etd_eta_warn'));
  }
  // Override mode: amount + recipient mandatory
  const overrideEntry = (state.commission_entries || []).find((ce) => ce.source === 'Override');
  if (overrideEntry && (!overrideEntry.gross_amount || !overrideEntry.recipient)) {
    errs.push(t('sales_new.validation.override_incomplete'));
  }
  return errs;
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

// The Shipments list + sales analytics aggregate from `pnl_line` entities (only the Excel-import
// path created them). Manual P&Ls had only embedded shipment.pnl_lines → 0 revenue in the list
// ("thiếu doanh thu"). Materialize one pnl_line per embedded line, keyed `${ref}-L<n>`, so both
// entry paths agree. Fields already match (selling_vnd_collect / buying_vnd_pay from buildShipment).
// F-57-01: id now comes from the shared pnlLineId() helper — the import path mints the identical
// shape, so cleanup below reaches lines from either entry path.
async function _writePnlLines(repo, ref, shipment, version) {
  const lines = shipment.pnl_lines || [];
  for (let i = 0; i < lines.length; i++) {
    const id = pnlLineId(ref, i + 1);
    await repo.put('pnl_line', id, { ...lines[i], id, shipment_ref: ref, _ledger_version: version });
  }
}

// F-57-01: enumerate-and-delete, replacing a fixed `${ref}-L1`..`-L50` probe that could not see
// the import path's zero-padded `-L000` ids — those survived the overwrite and double-counted
// the shipment's revenue in the grid and in sales analytics.
async function _deletePnlLines(repo, ref) {
  await deletePnlLinesFor(repo, ref);
}

// F-18-11: seed-if-unseeded + load once per call — resolver input for buildShipment's state
// constraint (DEFECT-1: shared seed-on-first-read helper, idempotent).
async function _loadStateAliasRows(repo) {
  return ensureShipmentStateAliases(repo);
}

async function _repCodeFor(repo, salesRepId) {
  const userId = `user:${salesRepId}`;
  const user = (await repo.get(KIND_USER, userId).catch(() => null)) || { id: userId, sales_code: null };
  return ensureRepCode(user, repo);
}

// True if some OTHER shipment (shipment_ref !== excludeRef) already carries jobNo. Catches the
// stale-draft-reuse case: a form draft persisted job_no before submit (mount-time preview),
// the user abandons/reopens it after already submitting once, and resubmits — without this
// check the second save would mint a duplicate legal doc number (F-32-01 QA rework).
async function _jobNoTaken(repo, jobNo, excludeRef) {
  const matches = await listEnvelopes(repo, (s) => s.job_no === jobNo && s.shipment_ref !== excludeRef);
  return matches.length > 0;
}

// Cross-tab TOCTOU (F-41-04): two submits can BOTH pass _jobNoTaken before either write lands —
// the pre-check is check-then-write, not atomic, and the submit guard only covers one render.
// So after the write, look again. The LOWEST shipment_ref keeps the contested number (the same
// deterministic winner rule as bundle-file-heal / drive-file-dedup, so both sides agree without
// coordination); the loser re-mints and re-saves. HBL/D-O mirror the Job No when auto-filled
// (F-32-01), so a healed number carries them along. Cross-DEVICE collisions that sync in after
// both sessions closed are not reachable from here — that residue is E-32's numbering redesign.
async function _healJobNoCollision(repo, shipment, salesRepId) {
  const jobNo = shipment.job_no;
  if (!jobNo) return;
  const rivals = await listEnvelopes(repo, (s) => s.job_no === jobNo && s.shipment_ref !== shipment.shipment_ref);
  if (!rivals.length) return;
  const winner = [shipment.shipment_ref, ...rivals.map((r) => r.shipment_ref)].sort()[0];
  if (winner === shipment.shipment_ref) return; // we keep the number; the rival's session heals its own
  const fresh = await assignJobNo(repo, await _repCodeFor(repo, salesRepId));
  if (shipment.do_no === jobNo) shipment.do_no = fresh;
  if (shipment.hbl === jobNo) shipment.hbl = fresh;
  shipment.job_no = fresh;
  await putShipment(repo, shipment);
}

// F-32-01: use the form-supplied Job No when present; on edit, preserve the shipment's prior
// Job No (mirrors the state-preservation precedent above); otherwise generate one locally —
// keeps submitForm/updateForm complete, independently-correct entry points for callers that
// bypass the interactive form (e.g. batch import, tests). `ownRef` is the shipment_ref this
// call is writing to (null for submitForm's brand-new ref) — excluded from the collision check
// so re-saving a record never regenerates its own job_no.
async function _resolveJobNo(state, repo, salesRepId, priorJobNo = null, ownRef = null) {
  if (state.job_no) {
    if (state.job_no === priorJobNo) return state.job_no; // own record, unchanged — no lookup needed
    if (await _jobNoTaken(repo, state.job_no, ownRef)) {
      return assignJobNo(repo, await _repCodeFor(repo, salesRepId));
    }
    return state.job_no;
  }
  if (priorJobNo) return priorJobNo;
  return assignJobNo(repo, await _repCodeFor(repo, salesRepId));
}

// #13 (owner 2026-08-08): shipment_ref = EX|IM-YYMMDD-{HASH8}, minted in WASM
// (store/operators/ref_gen.rs) — entropy from (rep salt + time + nonce) plus a local same-id
// regen guard. Replaces the counted sequence whose per-user cache made two reps mint the
// same EX-YYMMDD-001 on the same day (the KNOWN LIMIT this comment block used to carry).
async function _mintFreeShipmentRef(repo, dir, salesRepId) {
  if (!repo?.mint_shipment_ref) throw new Error('WASM repo not ready');
  return await repo.mint_shipment_ref(dir, String(salesRepId || ''));
}

// Rollback steps run for their effect, never for their verdict — see submitForm's catch block.
// A step that cannot run leaves an orphan the repost/reconcile pass already knows how to clean,
// which is strictly better than losing the error that caused the rollback in the first place.
async function _bestEffort(step) {
  try {
    await step();
  } catch (cleanupErr) {
    console.warn('[VDG] rollback step failed, original error preserved:', cleanupErr?.message || cleanupErr);
  }
}

// validate → buildShipment → repo.put → commission_entries → post ledger → return
// { ref, warnings } | throws. F-23-03: ledger-post failure rolls back every repo.put this
// call made (compensating delete, not a real transaction — pm-decisions.md Q3).
export async function submitForm(state, repo, salesRepId, ledgerRepo = _defaultLedgerRepo(), opts = {}) {
  if (!repo) throw new Error('Repo not available');

  const publish = opts.publish !== false;

  // F-41-03 follow-up: the same derivation the record stores — an import job's ref must not
  // mint under EX just because the form has no explicit direction field.
  const dir = directionPrefix(deriveDirection(state));
  const ref = await _mintFreeShipmentRef(repo, dir, salesRepId);

  const stateAliasRows = await _loadStateAliasRows(repo);
  const jobNo = await _resolveJobNo(state, repo, salesRepId);
  const shipment = buildShipment(state, ref, salesRepId, { publishState: publish ? 'publish_pending' : 'draft', stateAliasRows, jobNo });
  shipment._ledger_version = INITIAL_LEDGER_VERSION;
  // E-37: two records, split in Rust. The envelope goes to _shared/shipments where CS and the rep
  // both work; the sell side goes to the rep's fork, which CS holds no permission on.
  await putShipment(repo, shipment);
  await _healJobNoCollision(repo, shipment, salesRepId);
  await registerFsmEntity(ref, shipment.state); // F-19-88 AC-01: make it a first-class FSM entity

  const warnings = [];
  if (!shipment.pnl_lines || shipment.pnl_lines.length === 0) {
    warnings.push(WARN_PNL_LINES_MISSING);
  }

  // F-15-59: commission_lines is the ground-truth (embedded in shipment payload via
  // buildShipment); write one commission_entry row per line, mirrors updateForm.
  const commLines = shipment.commission_lines || [];
  const writtenCe = [];

  try {
    for (let i = 0; i < commLines.length; i++) {
      const key    = `${ref}-CE${i + 1}`;
      const record = {
        ...commLines[i],
        shipment_ref:      ref,
        occurred_at:       todayLocal(),
        created_by:        salesRepId || null,
        _ledger_version:   INITIAL_LEDGER_VERSION,
      };
      await repo.put('commission_entry', key, record);
      writtenCe.push({ key, record });
    }

    // Materialize pnl_line entities so the Shipments list + analytics see this manual P&L.
    await _writePnlLines(repo, ref, shipment, INITIAL_LEDGER_VERSION);

    // F-37-05: publish is what CREATES the record Accounting reads. A publish_state flag on the
    // envelope cannot make "kế toán chỉ thấy sau khi publish" true - Accounting is not in the
    // reader set of _shared/shipments at all, so it sees nothing there whatever the flag says.
    if (publish) await _handOverToAccounting(repo, shipment);
    // Draft or Publish Pending: persist only. Accounting logic is now handled asynchronously by WASM.
  } catch (err) {
    // Every step BEST-EFFORT, and `err` rethrown no matter what any of them does. This block used
    // to `await deleteShipment(...)` first: that call is gated on `shipment.delete`, which is
    // Manager-only, so for the CS and SalesRep desks it THREW — taking the two cleanups below with
    // it and replacing the real failure with "access.action.denied:shipment.delete". The envelope
    // written at putShipment then survived forever, and every retry minted a new ref and stranded
    // another one: duplicate rows carrying no revenue, opening a blank detail panel. A rollback
    // that can fail louder than the thing it is rolling back hides the only error worth reading.
    await _bestEffort(() => rollbackShipmentCreate(repo, ref));
    for (const { key } of writtenCe) await _bestEffort(() => repo.delete('commission_entry', key));
    await _bestEffort(() => _deletePnlLines(repo, ref));
    throw err;
  }

  // E-40: data-driven advance — booking entered on the very first save moves the job itself
  const advancedTo = await autoAdvanceShipment(repo, shipment);

  return { ref, warnings, publishState: shipment.publish_state, advancedTo };
}

// AC-04..AC-06: update in-place — overwrite shipment record + commission_entry set for ref.
// commission_lines are embedded in the shipment payload (ground truth for UI).
// Audit trail via outbox events pending implementation.
// F-23-03: `_ledger_version` bumps on every save so a re-post produces new entry_ids
// instead of matching the already-posted dedup key from the prior version (pm-decisions.md
// Q3). A ledger-post failure here still propagates to the caller's catch — unlike
// submitForm there is no safe compensating delete for an in-place edit of a pre-existing
// record (would destroy the customer's prior data, not just this call's writes).
export async function updateForm(state, repo, salesRepId, ref, ledgerRepo = _defaultLedgerRepo(), opts = {}) {
  if (!repo) throw new Error('Repo not available');

  const publish = opts.publish !== false;

  const prior = await getEnvelope(repo, ref).catch(() => null);
  const stateAliasRows = await _loadStateAliasRows(repo);
  // F-18-11 AC-02: a re-save that carries no explicit state change must never regress the
  // prior resolved canonical state back to the create-time default — read prior.state BEFORE
  // rebuilding via buildShipment. An explicit edit-time state change (once the UI grows one)
  // still wins since state.state is checked first.
  const stateInput = { ...state, state: state.state ?? prior?.state };
  const jobNo = await _resolveJobNo(state, repo, salesRepId, prior?.job_no, ref);
  const shipment = buildShipment(stateInput, ref, salesRepId, { publishState: publish ? 'publish_pending' : 'draft', stateAliasRows, jobNo });
  shipment._ledger_version = (prior?._ledger_version || 0) + 1;
  await putShipment(repo, shipment);
  await _healJobNoCollision(repo, shipment, salesRepId);
  await registerFsmEntity(ref, shipment.state); // AC-09: register-if-absent, never regresses an advanced state

  // Commission overwrite: delete existing CE records then write new set (PM-locked strategy).
  for (let i = 1; i <= MAX_CE_CLEANUP; i++) {
    await repo.delete('commission_entry', `${ref}-CE${i}`);
  }
  await repo.delete('commission_entry', `${ref}-CR1`);  // pre-F-15-59 compat

  const commLines = state.commission_lines || [];
  const written = [];
  for (let i = 0; i < commLines.length; i++) {
    const record = {
      ...commLines[i],
      shipment_ref:    ref,
      occurred_at:     todayLocal(),
      created_by:      salesRepId || null,
      _ledger_version: shipment._ledger_version,
    };
    await repo.put('commission_entry', `${ref}-CE${i + 1}`, record);
    written.push(record);
  }

  // F-37-05: an amendment publishes a NEW REVISION. Never an overwrite - Accounting may already
  // have raised an invoice from the previous one, and changing the figures under it is exactly
  // the thing a published record must not be able to do.
  if (publish) await _handOverToAccounting(repo, shipment);
  // Overwrite pnl_line entities (delete old set, write new) — mirrors commission handling.
  await _deletePnlLines(repo, ref);
  await _writePnlLines(repo, ref, shipment, shipment._ledger_version);

  // Accounting logic is now handled asynchronously by WASM.

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
