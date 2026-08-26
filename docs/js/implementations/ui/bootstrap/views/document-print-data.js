// document-print-data.js — F-57-02. Builds each printable document's field table from the
// real shipment, replacing document-print.js's MOCK_FIELDS.
//
// Same defect as note-print.js (F-57-01): docId was rendered in the header but never used to
// load anything, so every shipment printed the same invented HBL/MBL/D-O/AN — same vessel,
// same containers, same consignee — on company letterhead, with the "mock data" notice hidden
// behind `no-print`.
//
// A field the shipment genuinely does not carry renders as FIELD_ABSENT. A blank on a draft
// B/L is honest; a plausible invented value is not. Label keys are unchanged, so the existing
// i18n coverage still applies.

import { loadNoteData, NOTE_TYPE_DEBIT } from './note-print-data.js';
import { getShipment } from '../../core_abstractions/ports/data/shipment-repo.js';

const KIND_SHIPMENT = 'shipment';

export const FIELD_ABSENT = '—';

export const DOC_TYPE_HBL   = 'HBL';
export const DOC_TYPE_MBL   = 'MBL';
export const DOC_TYPE_DO    = 'D/O';
export const DOC_TYPE_AN    = 'AN';
export const DOC_TYPE_DEBIT = 'Debit Note';

export const DOC_TYPES = [DOC_TYPE_HBL, DOC_TYPE_MBL, DOC_TYPE_DO, DOC_TYPE_AN, DOC_TYPE_DEBIT];

const OWN_LEGAL_NAME = 'VDG Freight Services Co., Ltd';
const BANK_LINE      = 'Vietcombank — HCM Branch — Acc 0071001234567';

function val(v) {
  return (v === null || v === undefined || v === '') ? FIELD_ABSENT : String(v);
}

// Vessel and voyage are one visual field but two concepts; the shipment stores only `vessel`.
function vesselVoy(s) {
  return val(s.vessel);
}

function weight(s) {
  return s.weight_actual ? `${s.weight_actual} ${s.weight_uom || 'KG'}` : FIELD_ABSENT;
}

// [i18n-key, value] tuples — document-print.js resolves the key through t() at render time.
const BUILDERS = {
  [DOC_TYPE_HBL]: (s) => [
    ['sales_new.field.shipper',            val(s.shipper)],
    ['sales_new.field.consignee',          val(s.consignee)],
    ['document_print.field.notify_party',  val(s.notify_party)],
    ['document_print.field.vessel_voy',    vesselVoy(s)],
    ['document_print.field.port_of_load',  val(s.pol)],
    ['document_print.field.port_of_disch', val(s.pod)],
    ['document_print.field.marks_nos',     val(s.container_spec || s.shipment_ref)],
    ['document_print.field.description',   val(s.commodity_description)],
    ['document_print.field.gross_weight',  weight(s)],
    ['document_print.field.measurement',   FIELD_ABSENT], // not captured on the shipment yet
  ],
  [DOC_TYPE_MBL]: (s) => [
    ['budget_print.field.carrier',         val(s.carrier)],
    ['document_print.field.bl_number',     val(s.mbl)],
    ['sales_new.field.shipper',            OWN_LEGAL_NAME],
    ['sales_new.field.consignee',          val(s.handling_agent || s.consignee)],
    ['document_print.field.vessel_voy',    vesselVoy(s)],
    ['document_print.field.port_of_load',  val(s.pol)],
    ['document_print.field.port_of_disch', val(s.pod)],
    ['document_print.field.no_of_bls',     FIELD_ABSENT], // not captured on the shipment yet
    ['document_print.field.freight',       val(s.freight_terms)],
  ],
  [DOC_TYPE_DO]: (s) => [
    ['document_print.field.do_no',         val(s.do_no)],
    ['note_print.recipient.issued_to',     val(s.customer)],
    ['document_print.field.container_no',  val(s.container_spec)],
    ['document_print.field.seal_no',       FIELD_ABSENT],
    ['document_print.field.terminal',      val(s.pod)],
    ['document_print.field.free_time',     FIELD_ABSENT],
    ['document_print.field.release_date',  val(s.eta)],
    ['document_print.field.remarks',       FIELD_ABSENT],
  ],
  [DOC_TYPE_AN]: (s) => [
    ['document_print.field.an_no',          val(s.job_no)],
    ['sales_new.field.consignee',           val(s.consignee)],
    ['sales_new.field.vessel',              val(s.vessel)],
    ['document_print.field.voyage',         val(s.flight_no)], // air leg; sea voyage not stored
    ['ETD',                                 val(s.etd)],
    ['ETA',                                 val(s.eta)],
    ['document_print.field.port_of_disch',  val(s.pod)],
    ['Container',                           val(s.container_spec)],
    ['document_print.field.freight_status', val(s.freight_terms)],
  ],
};

// The Debit Note tab shares its numbers with /note/:ref/debit — one source, so the two screens
// can never disagree about what the customer owes.
function debitFields(shipment, note) {
  const total = note.lines.reduce((sum, l) => sum + l.total, 0);
  return [
    ['document_print.field.debit_note_no', note.noteNo],
    ['note_print.recipient.issued_to',     val(note.customer?.name || shipment.customer)],
    ['document_print.field.ref_shipment',  val(shipment.shipment_ref)],
    ['sales_drop.preview.col.description', note.lines.length
      ? note.lines.map((l) => l.description).filter(Boolean).join(' · ')
      : FIELD_ABSENT],
    ['quote_new.col.amount',               note.lines.length
      ? `${note.currency} ${total.toFixed(2)}`
      : FIELD_ABSENT],
    ['currency',                           val(note.currency)],
    ['document_print.field.due_date',      FIELD_ABSENT], // no payment-term field on the shipment
    ['document_print.field.bank',          BANK_LINE],
  ];
}

/**
 * @param {string} docId    shipment_ref the document is for
 * @param {string} docType  one of DOC_TYPES
 * @param {object} [repo]   injectable for tests; defaults to window.__vdg_repo
 * @returns {Promise<{ shipment: object|null, fields: Array<[string, string]> }>}
 */
export async function loadDocumentData(
  docId, docType,
  repo = (typeof window !== 'undefined' ? window.__vdg_repo : null),
) {
  if (!repo || !docId) return { shipment: null, fields: [] };

  const shipment = await getShipment(repo, docId).catch(() => null);
  if (!shipment) return { shipment: null, fields: [] };

  if (docType === DOC_TYPE_DEBIT) {
    const note = await loadNoteData(docId, NOTE_TYPE_DEBIT, repo);
    return { shipment, fields: debitFields(shipment, note) };
  }

  const build = BUILDERS[docType] || BUILDERS[DOC_TYPE_HBL];
  return { shipment, fields: build(shipment) };
}
