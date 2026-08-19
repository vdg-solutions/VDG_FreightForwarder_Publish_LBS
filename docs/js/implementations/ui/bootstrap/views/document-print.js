// F-03-03 — browser print-to-PDF, no jsPDF/WASM rendering yet
//
// F-57-02 — MOCK_FIELDS is gone. docId was rendered in the header but never used to load
// anything, so every shipment printed the same invented HBL/MBL/D-O/AN — same vessel MSC
// OSCAR, same container TCNU1234567, same consignee — on company letterhead, and the only
// "mock data" marker sat inside a `no-print` wrapper so the printed PDF said nothing. Same
// defect and same fix as note-print.js: real shipment data, an explicit empty state, and a
// draft banner that survives printing.
import { t } from '../../../kernel/core_abstractions/i18n/index.js';
import { loadDocumentData, DOC_TYPES, DOC_TYPE_HBL } from './document-print-data.js';

// Tab-selector display label — DOC_TYPES entries double as the field-builder lookup key and
// the ?type= route param, so the underlying value stays English; only the tab text is VN.
function docTypeLabel(docType) {
  return docType === 'Debit Note' ? t('note_print.title.debit_note') : docType;
}

// PRINT-VISIBLE. Deliberately NOT `no-print` — that was the defect. No document here is
// issued through the Document FSM yet, so every printed copy has to say so on the paper.
function draftBanner() {
  return `
    <div class="mb-6 border-2 border-red-500 rounded-lg p-3 text-center">
      <div class="text-base font-bold uppercase tracking-wider text-red-600">${t('note_print.draft_watermark')}</div>
      <div class="text-xs text-red-500 mt-0.5">${t('note_print.draft_explain')}</div>
    </div>
  `;
}

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

// No shipment behind this id — render the reason and NO document. Printing letterhead with an
// empty field table is the same failure as printing an invented one.
function emptyState(docId) {
  return `
    <div class="bg-white rounded-xl border border-slate-200 p-10 text-center">
      <div class="text-sm font-semibold text-slate-900">${t('document_print.empty.no_shipment')}</div>
      <div class="text-xs text-slate-500 mt-1">${docId}</div>
      <a href="#/documents" class="inline-block mt-4 text-xs text-blue-600 hover:underline">← ${t('common.back')}</a>
    </div>
  `;
}

function chrome(docId, docType, hasDoc) {
  return `
    <div class="flex items-center justify-between mb-4 no-print">
      <div>
        <div class="text-xs text-slate-500">F-03-03 · ${t('document_print.preview_caption')}</div>
        <div class="text-base font-semibold text-slate-900">${docId}</div>
      </div>
      <div class="flex items-center gap-2">
        <a href="#/documents" class="text-xs text-slate-500 hover:underline no-print">← ${t('common.back')}</a>
        ${hasDoc ? `<vdg-print-button doc-id="${docId}" doc-type="${docType}"></vdg-print-button>` : ''}
      </div>
    </div>
  `;
}

export async function render(root, docId) {
  // Type from query param or default HBL
  const params  = new URLSearchParams(location.hash.split('?')[1] || '');
  const docType = params.get('type') || DOC_TYPE_HBL;
  const data    = await loadDocumentData(docId, docType);

  // Minimal chrome — sidebar/topbar are already hidden by @media print
  root.innerHTML = `
    <div class="p-6 max-w-[900px] mx-auto">
      ${chrome(docId, docType, Boolean(data.shipment))}
      ${docTypeSelector(docType, docId)}
      ${data.shipment ? `
      <div class="print-doc bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        ${draftBanner()}
        ${docHeader(docId, docType)}
        ${fieldTable(data.fields)}
        ${signatureBlock(docType)}
      </div>` : emptyState(docId)}
    </div>
  `;

  // Re-init print button after innerHTML injection
  if (data.shipment) await customElements.whenDefined('vdg-print-button');

  // Handle tab clicks without full re-navigate — update query param
  root.querySelectorAll('[href*="?type="]').forEach((a) => {
    a.addEventListener('click', async (e) => {
      e.preventDefault();
      const newType = new URL(a.href, location.href).searchParams.get('type') || DOC_TYPE_HBL;
      location.hash = `/document/${docId}/print?type=${encodeURIComponent(newType)}`;
    });
  });
}
