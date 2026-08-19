// F-06-03 — Debit/Credit Note print view — window.print(), no jsPDF
//
// F-57-01 — this view used to print a FABRICATED document. `shipmentRef` was shown in the
// header but never used to load anything: every shipment printed the same three hardcoded
// charges (Ocean Freight 2850.00 / BAF 320.00 / Doc Fee 75.00) and the same hardcoded
// recipient, on a page carrying the company's real bank account, SWIFT and signature block.
// The only markers saying "preview"/"mock data" both sat inside `no-print` wrappers, so the
// printed PDF had no indication at all. Note numbers came from an in-memory `++_dnSeq` that
// reset on every reload, so DN-<year>-0008 was re-issued to every customer on every page load.
//
// Now: lines come from the shipment's own pnl_line rows, the recipient from its customer, and
// the note number is derived from the shipment_ref so it is stable and never re-minted. There
// is no issuance FSM behind this view yet, so the printed page always carries a PRINT-VISIBLE
// draft banner — removing it is a deliberate act once notes are wired to the Billing FSM.

import { t } from '../../../kernel/core_abstractions/i18n/index.js';
import { todayLocal } from '../../../kernel/core_abstractions/util/today-local.js';
import { loadNoteData, NOTE_TYPE_DEBIT, NOTE_TYPE_CREDIT } from './note-print-data.js';

const PAYMENT_TERM_DAYS = 30;

const BANK_DETAILS = {
  bank: 'Vietcombank — Ho Chi Minh City Branch',
  account: '0071001234567',
  swift: 'BFTVVNVX',
  beneficiary: 'VDG Freight Services Co., Ltd',
};

// PRINT-VISIBLE. Deliberately NOT `no-print` — that was the defect. Until a note can be
// formally issued through the Billing FSM, every printed copy must say so on the paper.
function draftBanner() {
  return `
    <div class="mb-6 border-2 border-red-500 rounded-lg p-3 text-center">
      <div class="text-base font-bold uppercase tracking-wider text-red-600">${t('note_print.draft_watermark')}</div>
      <div class="text-xs text-red-500 mt-0.5">${t('note_print.draft_explain')}</div>
    </div>
  `;
}

function noteHeader(noteNo, type, shipmentRef) {
  const label = type === NOTE_TYPE_DEBIT ? t('note_print.title.debit_note') : t('note_print.title.credit_note');
  return `
    <div class="flex justify-between items-start mb-6">
      <div>
        <div class="text-2xl font-bold tracking-tight text-slate-900 uppercase">${label}</div>
        <div class="text-sm text-slate-500 mt-0.5">${t('note_print.label.note_no')} <span class="font-semibold text-slate-700">${noteNo}</span></div>
        <div class="text-sm text-slate-500">${t('note_print.label.ref_shipment')} <span class="font-semibold text-slate-700">${shipmentRef}</span></div>
        <div class="text-sm text-slate-500">${t('note_print.label.date')}: <span class="font-semibold text-slate-700">${todayLocal()}</span></div>
      </div>
      <div class="text-right text-xs text-slate-500">
        <div class="text-base font-bold text-slate-900 mb-1">VDG FREIGHT SERVICES CO., LTD</div>
        <div>123 Nguyen Hue, District 1</div>
        <div>Ho Chi Minh City, Vietnam</div>
        <div class="mt-1">${t('note_print.label.tel')}: +84 28 3822 0000</div>
        <div>ops@vdgfreight.vn</div>
        <div>${t('note_print.label.vat')}: 0312345678</div>
      </div>
    </div>
  `;
}

// F-57-01: recipient comes from the shipment's customer, not a hardcoded "Acme Logistics".
function billedToBlock(type, customer) {
  const name    = customer?.name    || t('note_print.recipient.unknown');
  const address = customer?.address || '';
  const attn    = customer?.contact || '';
  return `
    <div class="mb-6 p-4 bg-slate-50 rounded-lg text-sm">
      <div class="font-semibold text-slate-700 mb-1">${type === NOTE_TYPE_DEBIT ? t('note_print.recipient.bill_to') : t('note_print.recipient.issued_to')}</div>
      <div class="text-slate-900 font-medium">${name}</div>
      ${address ? `<div class="text-slate-600">${address}</div>` : ''}
      ${attn ? `<div class="text-slate-600">${attn}</div>` : ''}
    </div>
  `;
}

function lineTable(lines, currency) {
  const rows = lines.map((l) => `
    <tr class="border-b border-slate-100">
      <td class="py-2 pr-4">${l.description}</td>
      <td class="py-2 text-center w-12">${l.qty}</td>
      <td class="py-2 text-center w-16">${l.currency}</td>
      <td class="py-2 text-right w-28">${l.unit_amount.toFixed(2)}</td>
      <td class="py-2 text-right w-28 font-medium">${l.total.toFixed(2)}</td>
    </tr>
  `).join('');

  const grandTotal = lines.reduce((s, l) => s + l.total, 0);

  return `
    <table class="w-full text-sm mb-6">
      <thead>
        <tr class="border-b-2 border-slate-300 text-slate-600 text-xs uppercase tracking-wide">
          <th class="py-2 text-left">${t('sales_drop.preview.col.description')}</th>
          <th class="py-2 text-center">${t('note_print.table.qty')}</th>
          <th class="py-2 text-center">${t('currency')}</th>
          <th class="py-2 text-right">${t('quote_new.col.amount')}</th>
          <th class="py-2 text-right">${t('note_print.table.total')}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr class="border-t-2 border-slate-300">
          <td colspan="4" class="py-3 text-right font-bold text-slate-700">${t('note_print.footer.total')} ${currency}</td>
          <td class="py-3 text-right font-bold text-slate-900 text-base">${grandTotal.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
  `;
}

function paymentTerms() {
  return `
    <div class="mb-6 text-sm">
      <div class="font-semibold text-slate-700 mb-1">${t('note_print.label.payment_terms')}</div>
      <div class="text-slate-600">${t('note_print.text.due_within', { n: PAYMENT_TERM_DAYS })}</div>
      <div class="text-slate-600 mt-2 font-semibold">${t('note_print.label.bank_details')}</div>
      <div class="text-slate-600">${BANK_DETAILS.beneficiary}</div>
      <div class="text-slate-600">${BANK_DETAILS.bank}</div>
      <div class="text-slate-600">${t('note_print.label.account')}: ${BANK_DETAILS.account} · SWIFT: ${BANK_DETAILS.swift}</div>
    </div>
  `;
}

function signatureBlock() {
  return `
    <div class="mt-10 flex justify-between text-xs text-slate-600">
      <div>
        <div class="border-t border-slate-400 pt-1 mt-8 w-48">${t('note_print.label.authorised_by')}</div>
      </div>
      <div>
        <div class="border-t border-slate-400 pt-1 mt-8 w-48">
          For VDG Freight Services Co., Ltd
        </div>
      </div>
    </div>
  `;
}

// No shipment, or no billable lines on it. Renders an explanation and NO document — printing a
// letterheaded page with an empty or invented line table is exactly what this card removed.
function emptyState(messageKey, shipmentRef) {
  return `
    <div class="bg-white rounded-xl border border-slate-200 p-10 text-center">
      <div class="text-sm font-semibold text-slate-900">${t(messageKey)}</div>
      <div class="text-xs text-slate-500 mt-1">${shipmentRef}</div>
      <a href="#/documents" class="inline-block mt-4 text-xs text-blue-600 hover:underline">← ${t('common.back')}</a>
    </div>
  `;
}

function toolbar(shipmentRef, noteType, canPrint) {
  const tab = (type, label) => `
    <a href="#/note/${shipmentRef}/${type}"
       class="px-3 py-1.5 text-xs rounded font-medium border transition
              ${noteType === type ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}">
      ${label}
    </a>`;
  return `
    <div class="flex items-center justify-between mb-4 no-print">
      <div>
        <div class="text-xs text-slate-500">F-06-03 · ${t('note_print.preview_suffix')}</div>
        <div class="text-base font-semibold text-slate-900">${shipmentRef}</div>
      </div>
      <div class="flex items-center gap-3">
        <a href="#/documents" class="text-xs text-slate-500 hover:underline">← ${t('common.back')}</a>
        ${tab(NOTE_TYPE_DEBIT, t('note_print.title.debit_note'))}
        ${tab(NOTE_TYPE_CREDIT, t('note_print.title.credit_note'))}
        ${canPrint ? `<button id="note-print-btn"
                class="px-4 py-1.5 bg-blue-600 text-white text-xs rounded font-medium hover:bg-blue-700 transition">
          ${t('print')} / PDF
        </button>` : ''}
      </div>
    </div>
  `;
}

export async function render(root, shipmentRef, type) {
  const noteType = (type === NOTE_TYPE_CREDIT) ? NOTE_TYPE_CREDIT : NOTE_TYPE_DEBIT;
  const data     = await loadNoteData(shipmentRef, noteType);

  if (!data.shipment) {
    root.innerHTML = `<div class="p-6 max-w-[900px] mx-auto">
      ${toolbar(shipmentRef, noteType, false)}
      ${emptyState('note_print.empty.no_shipment', shipmentRef)}
    </div>`;
    return;
  }

  if (data.lines.length === 0) {
    root.innerHTML = `<div class="p-6 max-w-[900px] mx-auto">
      ${toolbar(shipmentRef, noteType, false)}
      ${emptyState('note_print.empty.no_lines', shipmentRef)}
    </div>`;
    return;
  }

  root.innerHTML = `
    <div class="p-6 max-w-[900px] mx-auto">
      ${toolbar(shipmentRef, noteType, true)}
      <div class="print-doc bg-white rounded-xl border border-slate-200 p-10 shadow-sm">
        ${draftBanner()}
        ${noteHeader(data.noteNo, noteType, shipmentRef)}
        ${billedToBlock(noteType, data.customer)}
        ${lineTable(data.lines, data.currency)}
        ${paymentTerms()}
        ${signatureBlock()}
      </div>
    </div>
  `;

  root.querySelector('#note-print-btn')?.addEventListener('click', () => window.print());
}
