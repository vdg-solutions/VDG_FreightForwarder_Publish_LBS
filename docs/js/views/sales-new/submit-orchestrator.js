// submit-orchestrator.js — validate, persist; buildShipment delegated to shipment-builder.js

import { t } from '../../i18n/index.js';
import { genShipmentRef, nextSeq, recordSeq } from '../../operators/shipment-ref-gen.js';
import { buildShipment } from './shipment-builder.js';
import { ensureShipmentStateAliases } from '../../util/shipment-state-aliases.js';
import { registerFsmEntity } from '../../operators/fsm-ingest.js';
import { ensureRepCode } from '../../operators/rep-code-registry.js';
import { assignJobNo } from '../../operators/job-no-gen.js';
import { pnlLineId, deletePnlLinesFor } from '../../util/pnl-line-id.js';
import { todayLocal } from '../../util/today-local.js';

const KIND_USER = 'user';
const WARN_PNL_LINES_MISSING = 'pnl_lines_empty';
// AC-08: max number of CE keys to attempt deletion during commission overwrite
const MAX_CE_CLEANUP = 20;
const INITIAL_LEDGER_VERSION = 1; // F-23-03 pm-decisions.md Q3: envelope-only field
const MAX_REF_MINT_ATTEMPTS  = 50;  // F-57-01: bound the free-ref search; 50 shipments/rep/day

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

// Highlight fields + show summary block (AC-11)
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

  const summaryEl = root.querySelector('#form-error-summary');
  if (summaryEl) {
    summaryEl.innerHTML = errors.map((e) => `<div>• ${e}</div>`).join('');
    summaryEl.classList.toggle('hidden', errors.length === 0);
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
  const matches = await repo.list('shipment', (s) => s.job_no === jobNo && s.shipment_ref !== excludeRef);
  return matches.length > 0;
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

// F-57-01: mint a shipment_ref and confirm it is actually free before writing to it.
// nextSeq() derives the sequence from repo.list('shipment') plus an in-memory session map, so
// a cleared session map, a resumed tab or a clock the user rolled back could hand back a
// sequence already on disk — and repo.put() would then blind-overwrite a real shipment. Mirrors
// the _jobNoTaken precedent above: check, then step forward rather than trusting the generator.
//
// KNOWN LIMIT (not fixable here): `shipment` is a per-user kind, so repo.list only ever sees
// THIS rep's shipments. Two reps creating an export shipment on the same day both compute
// repoMax = 0 and both mint EX-YYMMDD-001. Nothing overwrites — the records live in different
// Drive folders — but manager-level aggregation across reps can conflate them. Closing that
// needs the rep code inside the ref, which changes REF_REGEX and every already-issued document
// number: a product decision, not a bug fix.
async function _mintFreeShipmentRef(repo, dir) {
  const now = Date.now();
  let seq = await nextSeq(repo, dir, now);
  for (let attempt = 0; attempt < MAX_REF_MINT_ATTEMPTS; attempt++) {
    const ref = genShipmentRef(dir, now, seq);
    const taken = await repo.get('shipment', ref).catch(() => null);
    if (!taken) { recordSeq(dir, now, seq); return ref; }
    seq++;
  }
  throw new Error(`Could not allocate a free shipment_ref after ${MAX_REF_MINT_ATTEMPTS} attempts`);
}

// validate → buildShipment → repo.put → commission_entries → post ledger → return
// { ref, warnings } | throws. F-23-03: ledger-post failure rolls back every repo.put this
// call made (compensating delete, not a real transaction — pm-decisions.md Q3).
export async function submitForm(state, repo, salesRepId, ledgerRepo = _defaultLedgerRepo(), opts = {}) {
  if (!repo) throw new Error('Repo not available');

  const publish = opts.publish !== false;

  const dir = directionPrefix(state.direction);
  const ref = await _mintFreeShipmentRef(repo, dir);

  const stateAliasRows = await _loadStateAliasRows(repo);
  const jobNo = await _resolveJobNo(state, repo, salesRepId);
  const shipment = buildShipment(state, ref, salesRepId, { publishState: publish ? 'publish_pending' : 'draft', stateAliasRows, jobNo });
  shipment._ledger_version = INITIAL_LEDGER_VERSION;
  await repo.put('shipment', ref, shipment);
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

    // Draft or Publish Pending: persist only. Accounting logic is now handled asynchronously by WASM.
  } catch (err) {
    await repo.delete('shipment', ref);
    for (const { key } of writtenCe) await repo.delete('commission_entry', key);
    await _deletePnlLines(repo, ref);
    throw err;
  }

  return { ref, warnings, publishState: shipment.publish_state };
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

  const prior = await repo.get('shipment', ref).catch(() => null);
  const stateAliasRows = await _loadStateAliasRows(repo);
  // F-18-11 AC-02: a re-save that carries no explicit state change must never regress the
  // prior resolved canonical state back to the create-time default — read prior.state BEFORE
  // rebuilding via buildShipment. An explicit edit-time state change (once the UI grows one)
  // still wins since state.state is checked first.
  const stateInput = { ...state, state: state.state ?? prior?.state };
  const jobNo = await _resolveJobNo(state, repo, salesRepId, prior?.job_no, ref);
  const shipment = buildShipment(stateInput, ref, salesRepId, { publishState: publish ? 'publish_pending' : 'draft', stateAliasRows, jobNo });
  shipment._ledger_version = (prior?._ledger_version || 0) + 1;
  await repo.put('shipment', ref, shipment);
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

  // Overwrite pnl_line entities (delete old set, write new) — mirrors commission handling.
  await _deletePnlLines(repo, ref);
  await _writePnlLines(repo, ref, shipment, shipment._ledger_version);

  // Accounting logic is now handled asynchronously by WASM.

  return { publishState: shipment.publish_state };
}
