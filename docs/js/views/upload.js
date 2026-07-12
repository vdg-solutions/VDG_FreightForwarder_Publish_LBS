import { loadWasm } from '../wasm-loader.js';

const CSV_HEADER = 'Row,Column,Field,Category,Message';

const TEMPLATES = [
  { name: 'booking_template.xlsx',   desc: 'Booking + container details · FSM-01',      href: '/docs/templates/booking_template.md' },
  { name: 'job_cost_template.xlsx',  desc: 'Revenue & cost lines per job · FSM-03',     href: '/docs/templates/job_cost_template.md' },
  { name: 'document_template.xlsx',  desc: 'Document checklist per job · FSM-02',       href: '/docs/templates/document_template.md' },
];

const SAMPLE_ERRORS = [
  { row: 4, col: 'D', field: 'origin', code: 'MISSING_REQUIRED', message: 'Origin port is required', category: 'Missing Required' },
  { row: 7, col: 'F', field: 'etd', code: 'INVALID_FORMAT', message: 'ETD must be ISO 8601 date', category: 'Invalid Format' },
  { row: 7, col: 'G', field: 'eta', code: 'BUSINESS_RULE', message: 'ETA must be after ETD', category: 'Business Rule Violation' },
  { row: 12, col: 'B', field: 'shipment_ref', code: 'INVALID_FORMAT', message: 'Reference must match EX-YYMMDD-NNN or IM-YYMMDD-NNN', category: 'Invalid Format' },
  { row: 19, col: 'D', field: 'origin', code: 'MISSING_REQUIRED', message: 'Origin port is required', category: 'Missing Required' },
];

function errorTable(errors) {
  const grouped = {};
  for (const e of errors) {
    (grouped[e.category] = grouped[e.category] || []).push(e);
  }
  const groupBlocks = Object.entries(grouped).map(([cat, list]) => `
    <div class="mb-4">
      <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">${cat} <span class="text-slate-400">(${list.length})</span></div>
      <div class="rounded-lg border border-slate-200 overflow-hidden">
        <table class="w-full text-xs">
          <thead class="bg-slate-50 text-slate-600 font-semibold">
            <tr>
              <th class="px-3 py-2 text-left w-16">Row</th>
              <th class="px-3 py-2 text-left w-16">Col</th>
              <th class="px-3 py-2 text-left w-40">Field</th>
              <th class="px-3 py-2 text-left">Message</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${list.map((e) => `
              <tr class="hover:bg-slate-50">
                <td class="px-3 py-2 font-mono text-slate-700">${e.row}</td>
                <td class="px-3 py-2 font-mono text-slate-700">${e.col}</td>
                <td class="px-3 py-2 font-mono text-slate-700">${e.field}</td>
                <td class="px-3 py-2 text-slate-800">${e.message}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `).join('');
  return `
    <div class="bg-white rounded-xl border border-slate-200 p-5">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <div class="text-sm font-semibold text-slate-900">${errors.length} errors found</div>
            <div class="text-xs text-slate-500">Fix and re-upload</div>
          </div>
        </div>
        <button id="export-errors-csv" class="text-xs px-3 py-1.5 border border-slate-200 rounded-md text-slate-700 bg-white hover:bg-slate-50">Export to CSV</button>
      </div>
      ${groupBlocks}
    </div>
  `;
}

function templatesPanel() {
  return `
    <div class="bg-white rounded-xl border border-slate-200 p-5">
      <div class="text-sm font-semibold text-slate-900 mb-3">Templates</div>
      <div class="space-y-2">
        ${TEMPLATES.map((t) => `
          <a href="${t.href}" target="_blank" rel="noopener" class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer group no-underline">
            <div class="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-slate-800 truncate">${t.name}</div>
              <div class="text-[11px] text-slate-500 truncate">${t.desc}</div>
            </div>
            <svg class="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </a>
        `).join('')}
      </div>
    </div>
  `;
}

function exportErrorsCsv(errors) {
  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const rows   = errors.map((e) => [e.row, e.col, e.field, e.category, e.message].map(escape).join(','));
  const csv    = [CSV_HEADER, ...rows].join('\n');
  const blob   = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = 'vdg_validation_errors.csv';
  a.click();
  URL.revokeObjectURL(url);
}

async function handleFile(file, statusEl) {
  statusEl.textContent = 'Reading file…';
  const bytes = new Uint8Array(await file.arrayBuffer());
  const wasm = await loadWasm();
  if (!wasm) {
    statusEl.innerHTML = `<span class="text-amber-600">WASM not built yet — run <code class="font-mono bg-amber-50 px-1.5 py-0.5 rounded">make build-wasm</code>. Showing mock errors below.</span>`;
    return;
  }
  try {
    const report = wasm.process_excel_file(bytes);
    const sheetSummary = report.sheets.map((s) => `${s.name} (${s.row_count} rows)`).join(', ');
    statusEl.innerHTML = `<span class="text-emerald-600">Parsed ${report.sheets.length} sheet(s): ${sheetSummary}</span>`;
  } catch (err) {
    statusEl.innerHTML = `<span class="text-red-600">WASM error: ${err.message}</span>`;
  }
}

export async function render(root) {
  root.innerHTML = `
    <div class="p-6 max-w-[1400px] mx-auto">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 space-y-4">
          <div class="bg-white rounded-xl border border-slate-200 p-5">
            <div class="text-sm font-semibold text-slate-900 mb-1">Excel ingestion</div>
            <div class="text-xs text-slate-500 mb-4">Browser → Rust WASM (calamine) → FSM validation. Sensitive data never leaves your machine.</div>
            <upload-zone></upload-zone>
            <div id="upload-status" class="mt-3 text-xs text-slate-600"></div>
          </div>
          ${errorTable(SAMPLE_ERRORS)}
        </div>
        <div class="space-y-4">
          ${templatesPanel()}
          <div class="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-5 text-white">
            <div class="text-xs uppercase tracking-wider text-blue-200">Pipeline</div>
            <div class="text-sm font-medium mt-1.5">drop → ArrayBuffer → wasm-bindgen → calamine → FSM guard → AG Grid</div>
            <div class="text-xs text-blue-200 mt-3">10k rows parse target: &lt; 500ms in-browser</div>
          </div>
        </div>
      </div>
    </div>
  `;

  const status = document.getElementById('upload-status');
  document.querySelector('upload-zone').addEventListener('vdg:file', (e) => {
    handleFile(e.detail.file, status);
  });

  document.getElementById('export-errors-csv').addEventListener('click', () => {
    exportErrorsCsv(SAMPLE_ERRORS);
  });
}
