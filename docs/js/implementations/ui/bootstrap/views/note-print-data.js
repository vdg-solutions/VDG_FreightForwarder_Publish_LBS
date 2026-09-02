// note-print-data.js — F-57-01. Loads the real data behind a Debit/Credit Note.
//
// Split out of note-print.js so that file stays presentation-only (and under the 350-line cap).
// Everything here is a pure read through window.__vdg_repo — no Drive call, no mutation.

import { getShipment } from '../../core_abstractions/ports/data/shipment-repo.js';
import { deriveNoteLines } from '../../core_abstractions/ports/flows/note-lines.js';
import { customerForNote, listPnlLinesFor } from '../../core_abstractions/ports/data/sales-reads.js';

export const NOTE_TYPE_DEBIT  = 'debit';
export const NOTE_TYPE_CREDIT = 'credit';

const DN_PREFIX      = 'DN';
const CN_PREFIX      = 'CN';
const NOTE_SEQ_WIDTH = 4;
const DEFAULT_CURRENCY = 'USD';

// shipment_ref is `(EX|IM)-YYMMDD-NNN`; NNN is the per-period sequence.
const REF_SEQ_RE = /-(\d+)$/;

/**
 * Note number derived from the shipment it belongs to — stable across reloads, devices and
 * users. The old implementation used a module-level `++_dnSeq` that started at 7 and reset on
 * every page load, so the SAME number was issued to every customer, repeatedly.
 *
 * This is not an issuance sequence — it cannot be, until notes are persisted through the
 * Billing FSM. It is a deterministic label, which is why the printed page carries a draft
 * banner. Deriving it from shipment_ref means it is exactly as unique as the shipment is.
 */
export function noteNumberFor(shipmentRef, noteType, year) {
  const prefix = noteType === NOTE_TYPE_CREDIT ? CN_PREFIX : DN_PREFIX;
  const seq    = REF_SEQ_RE.exec(shipmentRef || '')?.[1] ?? '0';
  return `${prefix}-${year}-${seq.padStart(NOTE_SEQ_WIDTH, '0')}`;
}

/**
 * @param {string} shipmentRef
 * @param {string} noteType     NOTE_TYPE_DEBIT | NOTE_TYPE_CREDIT
 * @param {object} [repo]       injectable for tests; defaults to window.__vdg_repo
 * @param {number} [year]       injectable for tests; defaults to the local calendar year
 * @returns {Promise<{shipment: object|null, lines: object[], customer: object|null,
 *                    currency: string, noteNo: string, total: number}>}
 */
export async function loadNoteData(
  shipmentRef,
  noteType,
  repo = (typeof window !== 'undefined' ? window.__vdg_repo : null),
  year = new Date().getFullYear(),
) {
  const empty = {
    shipment: null, lines: [], customer: null,
    currency: DEFAULT_CURRENCY, noteNo: noteNumberFor(shipmentRef, noteType, year), total: 0,
  };
  if (!repo || !shipmentRef) return empty;

  const shipment = await getShipment(repo, shipmentRef).catch(() => null);
  if (!shipment) return empty;

  // Materialized pnl_line rows are the source of truth (both entry paths write them since
  // F-57-01); the shipment's embedded copy is the fallback for older records.
  let rows = await listPnlLinesFor(shipmentRef).catch(() => []);
  if (!rows?.length) rows = shipment.pnl_lines || [];

  // Line derivation (selling-side filter, unit_amount, total) and their sum live in wasm
  // (flows_note_lines, note_lines.rs) — the figure printed on the page the customer receives.
  const { lines, total } = deriveNoteLines(rows, noteType);

  // shipment.customer holds the customer NAME as typed on the form while the master is keyed by
  // id — resolving one to the other, and the name-only fallback that keeps the note addressed to
  // the right party, are the use-case's.
  const customer = shipment.customer ? await customerForNote(shipment.customer) : null;

  return {
    shipment,
    lines,
    customer,
    currency: lines[0]?.currency || shipment.job_currency || DEFAULT_CURRENCY,
    noteNo:   noteNumberFor(shipmentRef, noteType, year),
    total,
  };
}

