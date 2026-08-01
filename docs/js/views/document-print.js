// F-03-03 — browser print-to-PDF, no jsPDF/WASM rendering yet
// Wire real WASM call once F-03-01 operator surface lands
import { t } from '../i18n/index.js';

const DOC_TYPES = ['HBL', 'MBL', 'D/O', 'AN', 'Debit Note'];

// Tab-selector display label — DOC_TYPES entries double as MOCK_FIELDS lookup keys and the
// ?type= route param, so the underlying value stays English; only the visible tab text is VN.
function docTypeLabel(docType) {
  return docType === 'Debit Note' ? t('note_print.title.debit_note') : docType;
}

// Mock per-type field templates. First tuple element is an i18n KEY (or a kept loanword-abbrev
// like ETD/ETA/Container) resolved through t() in fieldTable — the visible field LABELS render
// VN; the second element is sample DATA, kept verbatim. Prose labels shared across doc types
// reuse one key (Shipper/Consignee/Port of Load/…) so each is translated once.
const MOCK_FIELDS = {
  HBL: [
    ['sales_new.field.shipper',            'Acme Logistics Pte Ltd, 10 Tuas South Ave 2, Singapore 637367'],
    ['sales_new.field.consignee',          'To Order of Acme Logistics'],
    ['document_print.field.notify_party',  'Acme Logistics Pte Ltd'],
    ['document_print.field.vessel_voy',    'MSC OSCAR / 0623E'],
    ['document_print.field.port_of_load',  'Hochiminh City (VNSGN)'],
    ['document_print.field.port_of_disch', 'Los Angeles (USLAX)'],
    ['document_print.field.marks_nos',     'EX-260612-001 / TCNU1234567'],
    ['document_print.field.description',   'CONSUMER ELECTRONICS — 1 × 40HC'],
    ['document_print.field.gross_weight',  '14,500 KGS'],
    ['document_print.field.measurement',   '67.3 CBM'],
  ],
  MBL: [
    ['budget_print.field.carrier',         'Mediterranean Shipping Company S.A.'],
    ['document_print.field.bl_number',     'MSCUSGN0623E001'],
    ['sales_new.field.shipper',            'VDG Freight Services Co., Ltd'],
    ['sales_new.field.consignee',          'MSC Agent — LAX'],
    ['document_print.field.vessel_voy',    'MSC OSCAR / 0623E'],
    ['document_print.field.port_of_load',  'Hochiminh City (VNSGN)'],
    ['document_print.field.port_of_disch', 'Los Angeles (USLAX)'],
    ['document_print.field.no_of_bls',     'THREE (3) ORIGINALS'],
    ['document_print.field.freight',       'PREPAID'],
  ],
  'D/O': [
    ['document_print.field.do_no',         'DO-VDG-2100-01'],
    ['note_print.recipient.issued_to',     'Acme Logistics Pte Ltd'],
    ['document_print.field.container_no',  'TCNU1234567 / 40HC'],
    ['document_print.field.seal_no',       'VDG000123'],
    ['document_print.field.terminal',      'Cai Mep International Terminal (CMIT)'],
    ['document_print.field.free_time',     '7 days from discharge date'],
    ['document_print.field.release_date',  '2026-07-18'],
    ['document_print.field.remarks',       'Present original HBL to collect'],
  ],
  AN: [
    ['document_print.field.an_no',         'AN-VDG-2100-01'],
    ['sales_new.field.consignee',          'Acme Logistics Pte Ltd'],
    ['sales_new.field.vessel',             'MSC OSCAR'],
    ['document_print.field.voyage',        '0623E'],
    ['ETD',                                '2026-06-23'],
    ['ETA',                                '2026-07-18'],
    ['document_print.field.port_of_disch', 'Los Angeles (USLAX)'],
    ['Container',                          'TCNU1234567 / 40HC / 14,500 KGS'],
    ['document_print.field.freight_status','PREPAID'],
  ],
  'Debit Note': [
    ['document_print.field.debit_note_no', 'DN-VDG-2100-01'],
    ['note_print.recipient.issued_to',     'Acme Logistics Pte Ltd'],
    ['document_print.field.ref_shipment',  'EX-260612-001'],
    ['sales_drop.preview.col.description', 'Ocean Freight — HCM → LAX — 1 × 40HC'],
    ['quote_new.col.amount',               'USD 2,850.00'],
    ['currency',                           'USD'],
    ['document_print.field.due_date',      '2026-07-28'],
    ['document_print.field.bank',          'Vietcombank — HCM Branch — Acc 0071001234567'],
  ],
};

function docHeader(docId, docType) {
  return `
    <div class="doc-header flex justify-between items-start mb-6">
      <div>
        <div class="doc-title">${docTypeLabel(docType)}</div>
        <div class="doc-subtitle">VDG Freight Services Co., Ltd · ${t('document_print.header.ref')}: ${docId}</div>
      </div>
      <div class="text-right text-xs text-slate-500">
        <div class="font-semibold text-slate-800">VDG FREIGHT SERVICES CO., LTD</div>
        <div>123 Nguyen Hue, Dist 1, Ho Chi Minh City, Vietnam</div>
        <div>${t('document_print.header.tel')}: +84 28 3822 0000 · ops@vdgfreight.vn</div>
      </div>
    </div>
  `;
}

function fieldTable(fields) {
  const rows = fields.map(([label, value]) => `
    <tr>
      <th class="w-1/3 text-left font-semibold bg-slate-50">${t(label)}</th>
      <td>${value}</td>
    </tr>
  `).join('');
  return `<table class="w-full text-sm">${rows}</table>`;
}

function signatureBlock(docType) {
  return `
    <div class="mt-10 flex justify-between text-xs text-slate-600">
      <div>
        <div class="border-t border-slate-400 pt-1 mt-8 w-48">${t('document_print.field.shipper_consignor')}</div>
      </div>
      <div>
        <div class="border-t border-slate-400 pt-1 mt-8 w-48">
          For VDG Freight Services Co., Ltd
          ${docType === 'HBL' ? `<br>${t('document_print.field.agent_for_carrier')}` : ''}
        </div>
      </div>
    </div>
  `;
}

function docTypeSelector(activeType, docId) {
  const tabs = DOC_TYPES.map((dt) => {
    const active = dt === activeType;
    return `
      <a href="#/document/${docId}/print?type=${encodeURIComponent(dt)}"
         class="px-3 py-1.5 rounded text-xs font-medium no-print transition
                ${active ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}">
        ${docTypeLabel(dt)}
      </a>
    `;
  }).join('');
  return `<div class="flex gap-2 mb-6 no-print">${tabs}</div>`;
}

export async function render(root, docId) {
  // Type from query param or default HBL
  const params  = new URLSearchParams(location.hash.split('?')[1] || '');
  const docType = params.get('type') || 'HBL';
  const fields  = MOCK_FIELDS[docType] || MOCK_FIELDS.HBL;

  // Minimal chrome — sidebar/topbar are already hidden by @media print
  root.innerHTML = `
    <div class="p-6 max-w-[900px] mx-auto">
      <div class="flex items-center justify-between mb-4 no-print">
        <div>
          <div class="text-xs text-slate-500">F-03-03 · ${t('document_print.preview_caption')}</div>
          <div class="text-base font-semibold text-slate-900">${docId}</div>
        </div>
        <div class="flex items-center gap-2">
          <a href="#/documents" class="text-xs text-slate-500 hover:underline no-print">← ${t('common.back')}</a>
          <vdg-print-button doc-id="${docId}" doc-type="${docType}"></vdg-print-button>
        </div>
      </div>

      ${docTypeSelector(docType, docId)}

      <div class="print-doc bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        ${docHeader(docId, docType)}
        ${fieldTable(fields)}
        ${signatureBlock(docType)}
        <div class="mt-6 pt-4 border-t border-slate-200 text-[10px] text-slate-400 no-print">
          ${t('common.mock_data_notice')}
        </div>
      </div>
    </div>
  `;

  // Re-init print button after innerHTML injection
  await customElements.whenDefined('vdg-print-button');

  // Handle tab clicks without full re-navigate — update query param
  root.querySelectorAll('[href*="?type="]').forEach((a) => {
    a.addEventListener('click', async (e) => {
      e.preventDefault();
      const newType = new URL(a.href, location.href).searchParams.get('type') || 'HBL';
      location.hash = `/document/${docId}/print?type=${encodeURIComponent(newType)}`;
    });
  });
}
