// F-06-03 — Debit/Credit Note print view — window.print(), no jsPDF

const DN_PREFIX = 'DN';
const CN_PREFIX = 'CN';
const CURRENT_YEAR = new Date().getFullYear();

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
  const label = type === 'debit' ? 'DEBIT NOTE' : 'CREDIT NOTE';
  return `
    <div class="flex justify-between items-start mb-6">
      <div>
        <div class="text-2xl font-bold tracking-tight text-slate-900">${label}</div>
        <div class="text-sm text-slate-500 mt-0.5">Note No: <span class="font-semibold text-slate-700">${noteNo}</span></div>
        <div class="text-sm text-slate-500">Ref Shipment: <span class="font-semibold text-slate-700">${shipmentRef}</span></div>
        <div class="text-sm text-slate-500">Date: <span class="font-semibold text-slate-700">${new Date().toISOString().slice(0, 10)}</span></div>
      </div>
      <div class="text-right text-xs text-slate-500">
        <div class="text-base font-bold text-slate-900 mb-1">VDG FREIGHT SERVICES CO., LTD</div>
        <div>123 Nguyen Hue, District 1</div>
        <div>Ho Chi Minh City, Vietnam</div>
        <div class="mt-1">Tel: +84 28 3822 0000</div>
        <div>ops@vdgfreight.vn</div>
        <div>VAT: 0312345678</div>
      </div>
    </div>
  `;
}

function billedToBlock(type) {
  return `
    <div class="mb-6 p-4 bg-slate-50 rounded-lg text-sm">
      <div class="font-semibold text-slate-700 mb-1">${type === 'debit' ? 'Bill To' : 'Issued To'}</div>
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
          <th class="py-2 text-left">Description</th>
          <th class="py-2 text-center">Qty</th>
          <th class="py-2 text-center">Currency</th>
          <th class="py-2 text-right">Amount</th>
          <th class="py-2 text-right">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr class="border-t-2 border-slate-300">
          <td colspan="4" class="py-3 text-right font-bold text-slate-700">TOTAL ${currency}</td>
          <td class="py-3 text-right font-bold text-slate-900 text-base">${grandTotal.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
  `;
}

function paymentTerms() {
  return `
    <div class="mb-6 text-sm">
      <div class="font-semibold text-slate-700 mb-1">Payment Terms</div>
      <div class="text-slate-600">Due within <strong>30 days</strong> from invoice date.</div>
      <div class="text-slate-600 mt-2 font-semibold">Bank Details:</div>
      <div class="text-slate-600">${BANK_DETAILS.beneficiary}</div>
      <div class="text-slate-600">${BANK_DETAILS.bank}</div>
      <div class="text-slate-600">Account: ${BANK_DETAILS.account} · SWIFT: ${BANK_DETAILS.swift}</div>
    </div>
  `;
}

function signatureBlock() {
  return `
    <div class="mt-10 flex justify-between text-xs text-slate-600">
      <div>
        <div class="border-t border-slate-400 pt-1 mt-8 w-48">Authorised by</div>
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

  root.innerHTML = `
    <div class="p-6 max-w-[900px] mx-auto">
      <div class="flex items-center justify-between mb-4 no-print">
        <div>
          <div class="text-xs text-slate-500">F-06-03 · ${noteType} note preview</div>
          <div class="text-base font-semibold text-slate-900">${shipmentRef}</div>
        </div>
        <div class="flex items-center gap-3">
          <a href="#/documents" class="text-xs text-slate-500 hover:underline">← Back</a>
          <a href="#/note/${shipmentRef}/debit"
             class="px-3 py-1.5 text-xs rounded font-medium border transition
                    ${noteType === 'debit' ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}">
            Debit Note
          </a>
          <a href="#/note/${shipmentRef}/credit"
             class="px-3 py-1.5 text-xs rounded font-medium border transition
                    ${noteType === 'credit' ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}">
            Credit Note
          </a>
          <button onclick="window.print()"
                  class="px-4 py-1.5 bg-blue-600 text-white text-xs rounded font-medium hover:bg-blue-700 transition">
            Print / PDF
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
          Mock data — wire billing operator once F-06-01 lands
        </div>
      </div>
    </div>
  `;
}
