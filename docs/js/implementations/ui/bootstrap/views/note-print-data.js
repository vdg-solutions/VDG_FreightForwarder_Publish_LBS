// note-print-data.js — F-57-01. Loads the real data behind a Debit/Credit Note.
//
// Split out of note-print.js so that file stays presentation-only (and under the 350-line cap).
// Everything here is a pure read through window.__vdg_repo — no Drive call, no mutation.

import { listWhere } from '../../core_abstractions/ports/data/repo-query.js';
import { getShipment } from '../../core_abstractions/ports/data/shipment-repo.js';

export const NOTE_TYPE_DEBIT  = 'debit';
export const NOTE_TYPE_CREDIT = 'credit';

const KIND_SHIPMENT = 'shipment';
const KIND_PNL_LINE = 'pnl_line';
const KIND_CUSTOMER = 'customers';

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

// A debit note bills the customer → the SELLING side of each P&L line.
// A credit note is an adjustment in the customer's favour → only negative selling amounts,
// rendered as the credits they are. A line with nothing on the selling side belongs on
// neither document.
function toNoteLine(line, noteType) {
  const amount   = Number(line.selling_amount ?? line.sell_amt ?? 0);
  const qty      = Number(line.selling_qty ?? line.sell_qty ?? 1) || 1;
  const currency = line.selling_currency || line.sell_currency || DEFAULT_CURRENCY;

  if (!amount) return null;
  if (noteType === NOTE_TYPE_CREDIT && amount >= 0) return null;
  if (noteType === NOTE_TYPE_DEBIT  && amount <= 0) return null;

  return {
    description: line.description || line.desc || line.subtype || '',
    qty,
    currency,
    unit_amount: amount / qty,
    total: amount,
  };
}

/**
 * @param {string} shipmentRef
 * @param {string} noteType     NOTE_TYPE_DEBIT | NOTE_TYPE_CREDIT
 * @param {object} [repo]       injectable for tests; defaults to window.__vdg_repo
 * @param {number} [year]       injectable for tests; defaults to the local calendar year
 * @returns {Promise<{shipment: object|null, lines: object[], customer: object|null,
 *                    currency: string, noteNo: string}>}
 */
export async function loadNoteData(
  shipmentRef,
  noteType,
  repo = (typeof window !== 'undefined' ? window.__vdg_repo : null),
  year = new Date().getFullYear(),
) {
  const empty = {
    shipment: null, lines: [], customer: null,
    currency: DEFAULT_CURRENCY, noteNo: noteNumberFor(shipmentRef, noteType, year),
  };
  if (!repo || !shipmentRef) return empty;

  const shipment = await getShipment(repo, shipmentRef).catch(() => null);
  if (!shipment) return empty;

  // Materialized pnl_line rows are the source of truth (both entry paths write them since
  // F-57-01); the shipment's embedded copy is the fallback for older records.
  let rows = await listWhere(repo, KIND_PNL_LINE, (l) => l?.shipment_ref === shipmentRef).catch(() => []);
  if (!rows?.length) rows = shipment.pnl_lines || [];

  const lines = rows.map((l) => toNoteLine(l, noteType)).filter(Boolean);

  const customer = shipment.customer
    ? await _resolveCustomer(repo, shipment.customer)
    : null;

  return {
    shipment,
    lines,
    customer,
    currency: lines[0]?.currency || shipment.job_currency || DEFAULT_CURRENCY,
    noteNo:   noteNumberFor(shipmentRef, noteType, year),
  };
}

// shipment.customer holds the customer NAME as typed on the form; the master is keyed by id.
// Fall back to a name-only record so the note still addresses the right party when the master
// has no matching row.
async function _resolveCustomer(repo, nameOrId) {
  const byId = await repo.get(KIND_CUSTOMER, nameOrId).catch(() => null);
  if (byId) return byId;

  const all = await repo.list(KIND_CUSTOMER, null).catch(() => []);
  const hit = (all || []).find(
    (c) => c?.name && String(c.name).toLowerCase() === String(nameOrId).toLowerCase(),
  );
  return hit || { name: nameOrId };
}
