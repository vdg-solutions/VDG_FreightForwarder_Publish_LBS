// submit-orchestrator.js — validate, persist; buildShipment delegated to shipment-builder.js

import { t } from '../../i18n/index.js';
import { genShipmentRef, nextSeq } from '../../operators/shipment-ref-gen.js';
import { buildShipment } from './shipment-builder.js';

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

const MAX_PL_CLEANUP = 50; // max pnl_line rows to attempt deletion on overwrite

// The Shipments list + sales analytics aggregate from `pnl_line` entities (only the Excel-import
// path created them). Manual P&Ls had only embedded shipment.pnl_lines → 0 revenue in the list
// ("thiếu doanh thu"). Materialize one pnl_line per embedded line, keyed `${ref}-L<n>`, so both
// entry paths agree. Fields already match (selling_vnd_collect / buying_vnd_pay from buildShipment).
async function _writePnlLines(repo, ref, shipment, version) {
  const lines = shipment.pnl_lines || [];
  for (let i = 0; i < lines.length; i++) {
    const id = `${ref}-L${i + 1}`;
    await repo.put('pnl_line', id, { ...lines[i], id, shipment_ref: ref, _ledger_version: version });
  }
}

async function _deletePnlLines(repo, ref) {
  for (let i = 1; i <= MAX_PL_CLEANUP; i++) await repo.delete('pnl_line', `${ref}-L${i}`);
}

// validate → buildShipment → repo.put → commission_entries → post ledger → return
// { ref, warnings } | throws. F-23-03: ledger-post failure rolls back every repo.put this
// call made (compensating delete, not a real transaction — pm-decisions.md Q3).
export async function submitForm(state, repo, salesRepId, ledgerRepo = _defaultLedgerRepo(), opts = {}) {
  if (!repo) throw new Error('Repo not available');

  const publish = opts.publish !== false;

  const dir = directionPrefix(state.direction);
  const seq = await nextSeq(repo, dir, Date.now());
  const ref = genShipmentRef(dir, Date.now(), seq);

  const shipment = buildShipment(state, ref, salesRepId, { publishState: publish ? 'publish_pending' : 'draft' });
  shipment._ledger_version = INITIAL_LEDGER_VERSION;
  await repo.put('shipment', ref, shipment);

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
        occurred_at:       new Date().toISOString().slice(0, 10),
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

  const prior   = await repo.get('shipment', ref).catch(() => null);
  const shipment = buildShipment(state, ref, salesRepId, { publishState: publish ? 'publish_pending' : 'draft' });
  shipment._ledger_version = (prior?._ledger_version || 0) + 1;
  await repo.put('shipment', ref, shipment);

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
      occurred_at:     new Date().toISOString().slice(0, 10),
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
