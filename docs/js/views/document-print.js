// F-03-03 — browser print-to-PDF, no jsPDF/WASM rendering yet
// Wire real WASM call once F-03-01 operator surface lands

const DOC_TYPES = ['HBL', 'MBL', 'D/O', 'AN', 'Debit Note'];

// Mock per-type field templates
const MOCK_FIELDS = {
  HBL: [
    ['Shipper',       'Acme Logistics Pte Ltd, 10 Tuas South Ave 2, Singapore 637367'],
    ['Consignee',     'To Order of Acme Logistics'],
    ['Notify Party',  'Acme Logistics Pte Ltd'],
    ['Vessel / Voy',  'MSC OSCAR / 0623E'],
    ['Port of Load',  'Hochiminh City (VNSGN)'],
    ['Port of Disch', 'Los Angeles (USLAX)'],
    ['Marks & Nos',   'EX-260612-001 / TCNU1234567'],
    ['Description',   'CONSUMER ELECTRONICS — 1 × 40HC'],
    ['Gross Weight',  '14,500 KGS'],
    ['Measurement',   '67.3 CBM'],
  ],
  MBL: [
    ['Carrier',       'Mediterranean Shipping Company S.A.'],
    ['B/L Number',    'MSCUSGN0623E001'],
    ['Shipper',       'VDG Freight Services Co., Ltd'],
    ['Consignee',     'MSC Agent — LAX'],
    ['Vessel / Voy',  'MSC OSCAR / 0623E'],
    ['Port of Load',  'Hochiminh City (VNSGN)'],
    ['Port of Disch', 'Los Angeles (USLAX)'],
    ['No. of B/Ls',   'THREE (3) ORIGINALS'],
    ['Freight',       'PREPAID'],
  ],
  'D/O': [
    ['Delivery Order No', 'DO-VDG-2100-01'],
    ['To',               'Acme Logistics Pte Ltd'],
    ['Container No',     'TCNU1234567 / 40HC'],
    ['Seal No',          'VDG000123'],
    ['Terminal',         'Cai Mep International Terminal (CMIT)'],
    ['Free Time',        '7 days from discharge date'],
    ['Release Date',     '2026-07-18'],
    ['Remarks',          'Present original HBL to collect'],
  ],
  AN: [
    ['Arrival Notice No', 'AN-VDG-2100-01'],
    ['Consignee',         'Acme Logistics Pte Ltd'],
    ['Vessel',            'MSC OSCAR'],
    ['Voyage',            '0623E'],
    ['ETD',               '2026-06-23'],
    ['ETA',               '2026-07-18'],
    ['Port of Disch',     'Los Angeles (USLAX)'],
    ['Container',         'TCNU1234567 / 40HC / 14,500 KGS'],
    ['Freight Status',    'PREPAID'],
  ],
  'Debit Note': [
    ['Debit Note No', 'DN-VDG-2100-01'],
    ['Issued To',     'Acme Logistics Pte Ltd'],
    ['Ref Shipment',  'EX-260612-001'],
    ['Description',   'Ocean Freight — HCM → LAX — 1 × 40HC'],
    ['Amount',        'USD 2,850.00'],
    ['Currency',      'USD'],
    ['Due Date',      '2026-07-28'],
    ['Bank',          'Vietcombank — HCM Branch — Acc 0071001234567'],
  ],
};

function docHeader(docId, docType) {
  return `
    <div class="doc-header flex justify-between items-start mb-6">
      <div>
        <div class="doc-title">${docType}</div>
        <div class="doc-subtitle">VDG Freight Services Co., Ltd · Ref: ${docId}</div>
      </div>
      <div class="text-right text-xs text-slate-500">
        <div class="font-semibold text-slate-800">VDG FREIGHT SERVICES CO., LTD</div>
        <div>123 Nguyen Hue, Dist 1, Ho Chi Minh City, Vietnam</div>
        <div>Tel: +84 28 3822 0000 · ops@vdgfreight.vn</div>
      </div>
    </div>
  `;
}

function fieldTable(fields) {
  const rows = fields.map(([label, value]) => `
    <tr>
      <th class="w-1/3 text-left font-semibold bg-slate-50">${label}</th>
      <td>${value}</td>
    </tr>
  `).join('');
  return `<table class="w-full text-sm">${rows}</table>`;
}

function signatureBlock(docType) {
  return `
    <div class="mt-10 flex justify-between text-xs text-slate-600">
      <div>
        <div class="border-t border-slate-400 pt-1 mt-8 w-48">Shipper / Consignor</div>
      </div>
      <div>
        <div class="border-t border-slate-400 pt-1 mt-8 w-48">
          For VDG Freight Services Co., Ltd
          ${docType === 'HBL' ? '<br>As Agents for Carrier' : ''}
        </div>
      </div>
    </div>
  `;
}

function docTypeSelector(activeType, docId) {
  const tabs = DOC_TYPES.map((t) => {
    const active = t === activeType;
    return `
      <a href="#/document/${docId}/print?type=${encodeURIComponent(t)}"
         class="px-3 py-1.5 rounded text-xs font-medium no-print transition
                ${active ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}">
        ${t}
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
          <div class="text-xs text-slate-500">F-03-03 · document preview</div>
          <div class="text-base font-semibold text-slate-900">${docId}</div>
        </div>
        <div class="flex items-center gap-2">
          <a href="#/documents" class="text-xs text-slate-500 hover:underline no-print">← Back</a>
          <vdg-print-button doc-id="${docId}" doc-type="${docType}"></vdg-print-button>
        </div>
      </div>

      ${docTypeSelector(docType, docId)}

      <div class="print-doc bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        ${docHeader(docId, docType)}
        ${fieldTable(fields)}
        ${signatureBlock(docType)}
        <div class="mt-6 pt-4 border-t border-slate-200 text-[10px] text-slate-400 no-print">
          Mock data — wire WASM operator call once F-03-01 lands
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
