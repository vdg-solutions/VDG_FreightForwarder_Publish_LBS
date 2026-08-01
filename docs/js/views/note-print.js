// F-06-03 — Debit/Credit Note print view — window.print(), no jsPDF
import { t } from '../i18n/index.js';

const DN_PREFIX = 'DN';
const CN_PREFIX = 'CN';
const CURRENT_YEAR = new Date().getFullYear();
const PAYMENT_TERM_DAYS = 30;

// Mock counter — replace with real sequence once billing entity lands
let _dnSeq = 7;
let _cnSeq = 3;

function nextNoteNumber(type) {
  if (type === 'debit') {
    return `${DN_PREFIX}-${CURRENT_YEAR}-${String(++_dnSeq).padStart(4, '0')}`;
  }
  return `${CN_PREFIX}-${CURRENT_YEAR}-${String(++_cnSeq).padStart(4, '0')}`;
}

// Mock line items per note type
const MOCK_LINES = {
  debit: [
    { description: 'Ocean Freight — HCM → LAX — 1 × 40HC', qty: 1, currency: 'USD', unit_amount: 2850.00, total: 2850.00 },
    { description: 'Fuel Surcharge (BAF)',                    qty: 1, currency: 'USD', unit_amount: 320.00,  total: 320.00  },
    { description: 'Documentation Fee',                       qty: 1, currency: 'USD', unit_amount: 75.00,   total: 75.00   },
  ],
  credit: [
    { description: 'Rate adjustment — agreed contract rate',  qty: 1, currency: 'USD', unit_amount: -200.00, total: -200.00 },
    { description: 'Over-declared weight refund',             qty: 1, currency: 'USD', unit_amount: -85.00,  total: -85.00  },
  ],
};

const BANK_DETAILS = {
  bank: 'Vietcombank — Ho Chi Minh City Branch',
  account: '0071001234567',
  swift: 'BFTVVNVX',
  beneficiary: 'VDG Freight Services Co., Ltd',
};

function noteHeader(noteNo, type, shipmentRef) {
  const label = type === 'debit' ? t('note_print.title.debit_note') : t('note_print.title.credit_note');
  return `
    <div class="flex justify-between items-start mb-6">
      <div>
        <div class="text-2xl font-bold tracking-tight text-slate-900 uppercase">${label}</div>
        <div class="text-sm text-slate-500 mt-0.5">${t('note_print.label.note_no')} <span class="font-semibold text-slate-700">${noteNo}</span></div>
        <div class="text-sm text-slate-500">${t('note_print.label.ref_shipment')} <span class="font-semibold text-slate-700">${shipmentRef}</span></div>
        <div class="text-sm text-slate-500">${t('note_print.label.date')}: <span class="font-semibold text-slate-700">${new Date().toISOString().slice(0, 10)}</span></div>
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

function billedToBlock(type) {
  return `
    <div class="mb-6 p-4 bg-slate-50 rounded-lg text-sm">
      <div class="font-semibold text-slate-700 mb-1">${type === 'debit' ? t('note_print.recipient.bill_to') : t('note_print.recipient.issued_to')}</div>
      <div class="text-slate-900 font-medium">Acme Logistics Pte Ltd</div>
      <div class="text-slate-600">10 Tuas South Ave 2, Singapore 637367</div>
      <div class="text-slate-600">Attn: Finance Department</div>
    </div>
  `;
}

function lineTable(lines) {
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
  const currency = lines[0]?.currency ?? 'USD';

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

export async function render(root, shipmentRef, type) {
  const noteType  = (type === 'credit') ? 'credit' : 'debit';
  const noteNo    = nextNoteNumber(noteType);
  const lines     = MOCK_LINES[noteType];
  const typeLabel = noteType === 'debit' ? t('note_print.title.debit_note') : t('note_print.title.credit_note');

  root.innerHTML = `
    <div class="p-6 max-w-[900px] mx-auto">
      <div class="flex items-center justify-between mb-4 no-print">
        <div>
          <div class="text-xs text-slate-500">F-06-03 · ${typeLabel} · ${t('note_print.preview_suffix')}</div>
          <div class="text-base font-semibold text-slate-900">${shipmentRef}</div>
        </div>
        <div class="flex items-center gap-3">
          <a href="#/documents" class="text-xs text-slate-500 hover:underline">← ${t('common.back')}</a>
          <a href="#/note/${shipmentRef}/debit"
             class="px-3 py-1.5 text-xs rounded font-medium border transition
                    ${noteType === 'debit' ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}">
            ${t('note_print.title.debit_note')}
          </a>
          <a href="#/note/${shipmentRef}/credit"
             class="px-3 py-1.5 text-xs rounded font-medium border transition
                    ${noteType === 'credit' ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}">
            ${t('note_print.title.credit_note')}
          </a>
          <button onclick="window.print()"
                  class="px-4 py-1.5 bg-blue-600 text-white text-xs rounded font-medium hover:bg-blue-700 transition">
            ${t('print')} / PDF
          </button>
        </div>
      </div>

      <div class="print-doc bg-white rounded-xl border border-slate-200 p-10 shadow-sm">
        ${noteHeader(noteNo, noteType, shipmentRef)}
        ${billedToBlock(noteType)}
        ${lineTable(lines)}
        ${paymentTerms()}
        ${signatureBlock()}
        <div class="mt-4 pt-4 border-t border-slate-100 text-[10px] text-slate-400 no-print">
          ${t('common.mock_data_notice')}
        </div>
      </div>
    </div>
  `;
}
