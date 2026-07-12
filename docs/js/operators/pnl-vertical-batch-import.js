// pnl-vertical-batch-import.js — N-pair vertical PNL batch import (F-15-57)
// Halt-before-commit: all pairs validated + built in memory first; only if ALL pass do we write.

import { t } from '../i18n/index.js';
import { niDtoToDraft } from '../views/sales-new-form/pnl-vertical-autofill.js';
import { buildShipment } from '../views/sales-new/shipment-builder.js';
import { genShipmentRef, nextSeq, directionFromMode } from './shipment-ref-gen.js';
import { postShipment, postCommission } from './ledger-poster.js';

const DEFAULT_DIRECTION      = 'EX';  // when draft.mode unset (mirrors shipment-ref-gen.js default)
const CE_KEY_PREFIX          = 'CE';  // matches submit-orchestrator.js
const INITIAL_LEDGER_VERSION = 1;     // F-23-03 pm-decisions.md Q3: envelope-only field

// window is undefined under node:test (this module is imported there directly) — guard
// instead of a bare `window.__vdg_ledger_repo` default so the browser global stays lazy.
function _defaultLedgerRepo() {
  return typeof window !== 'undefined' ? window.__vdg_ledger_repo : undefined;
}

// Vertical parser never fills `customer` (deferred to human review in the single-pair
// form path) — batch import has no review step, so the required-field subset drops
// the bill/customer checks and keeps only "has ≥1 usable line".
const VALIDATE_MISSING_LINES = 'sales_new.validation.no_lines';

// draft → i18n key[] (empty = valid). Subset of validateNiForm: no bill/customer required.
function _validateBatchPair(draft) {
  const errs = [];
  const hasLine = (draft.lines || []).some((l) => l.vnd_pay > 0 || l.vnd_collect > 0);
  if (!hasLine) errs.push(VALIDATE_MISSING_LINES);
  return errs;
}

// pair → { draft, shipment, errors: string[] }; shipment is null when errors non-empty
function _pairToStaged(pair, salesRepId) {
  const draft  = niDtoToDraft(pair);
  const errors = _validateBatchPair(draft);
  if (errors.length) return { draft, shipment: null, errors };
  const shipment = buildShipment(draft, '', salesRepId);
  return { draft, shipment, errors: [] };
}

// staged → { ref }; writes shipment + commission_entry rows, mirrors submitForm body.
// F-23-03: posts ledger legs for both after the writes — a post failure on pair N surfaces
// through runBatchImport's catch; pairs 1..N-1 already committed are not rolled back
// (same documented tradeoff as an IDB write failure here, see runBatchImport below).
async function _persistStaged(staged, repo, salesRepId, dateMs, ledgerRepo) {
  const dir = directionFromMode(staged.draft.mode) || DEFAULT_DIRECTION;
  const seq = await nextSeq(repo, dir, dateMs);
  const ref = genShipmentRef(dir, dateMs, seq);

  const shipment = { ...staged.shipment, shipment_ref: ref, _ledger_version: INITIAL_LEDGER_VERSION };
  await repo.put('shipment', ref, shipment);

  const lines = shipment.commission_lines || [];
  const writtenCe = [];
  for (let i = 0; i < lines.length; i++) {
    const record = {
      ...lines[i],
      shipment_ref:    ref,
      occurred_at:     new Date(dateMs).toISOString().slice(0, 10),
      created_by:      salesRepId || null,
      _ledger_version: INITIAL_LEDGER_VERSION,
    };
    await repo.put('commission_entry', `${ref}-${CE_KEY_PREFIX}${i + 1}`, record);
    writtenCe.push(record);
  }

  await postShipment(shipment, ledgerRepo);
  for (const record of writtenCe) await postCommission(record, ledgerRepo);

  return { ref };
}

/**
 * runBatchImport — validate all pairs, then commit all. Never throws.
 * @returns {{ ok: true, refs: string[] } | { ok: false, pairIndex: number, reason: string }}
 */
export async function runBatchImport(pairs, repo, salesRepId, ledgerRepo = _defaultLedgerRepo()) {
  const staged = [];
  for (let i = 0; i < pairs.length; i++) {
    let result;
    try { result = _pairToStaged(pairs[i], salesRepId); }
    catch (err) { return { ok: false, pairIndex: i + 1, reason: err.message }; }
    if (result.errors.length) {
      return { ok: false, pairIndex: i + 1, reason: result.errors.map((k) => t(k)).join(', ') };
    }
    staged.push(result);
  }

  const refs   = [];
  const dateMs = Date.now();
  try {
    for (const s of staged) {
      const { ref } = await _persistStaged(s, repo, salesRepId, dateMs, ledgerRepo);
      refs.push(ref);
    }
  } catch (err) {
    // IDB write failure after validation is unexpected (design.md failure modes) — v1
    // surfaces it as an admin-diagnosable event rather than attempting cleanup.
    console.error(`[batch-import] committed ${refs.length} of ${staged.length}`, err); // DEV
    return { ok: false, pairIndex: refs.length + 1, reason: err.message };
  }

  return { ok: true, refs };
}
