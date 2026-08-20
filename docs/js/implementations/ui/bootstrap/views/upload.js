import { loadWasm } from '../../core_abstractions/ports/wasm-loader.js';
import { t } from '../../../kernel/core_abstractions/i18n/index.js';
import { runImport } from './upload-report.js';

const CSV_HEADER = 'Row,Column,Field,Category,Message';

// F-57-02: the errors currently on screen. Was a hardcoded sampleErrors() list rendered
// unconditionally at mount and never replaced — so the page showed five invented failures
// ("Row 4, Col D: Origin port is required") before any file existed, and kept showing exactly
// those five after a real upload succeeded. Export-to-CSV then wrote the fake rows to disk.
let _errors = [];

// F-31-04: desc resolved via t() at call time — a locale switch re-renders the templates panel.
function templates() {
  return [
    { name: 'booking_template.xlsx',   desc: t('upload.template.booking_desc'),   href: '/docs/templates/booking_template.md' },
    { name: 'job_cost_template.xlsx',  desc: t('upload.template.job_cost_desc'),  href: '/docs/templates/job_cost_template.md' },
    { name: 'document_template.xlsx',  desc: t('upload.template.document_desc'), href: '/docs/templates/document_template.md' },
  ];
}

// No file dropped yet — say so, rather than filling the panel with invented failures.
function idleResultPanel() {
  return `
    <div class="bg-white rounded-xl border border-slate-200 p-5">
      <div class="text-sm text-slate-500">${t('upload.result.idle')}</div>
    </div>
  `;
}

// Parsed with zero errors — an explicit success state, not an empty table.
function cleanResultPanel(result) {
  return `
    <div class="bg-white rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
      <div class="text-sm font-semibold text-emerald-800">${t('upload.result.clean', { n: result.rowsOk })}</div>
      <div class="text-xs text-emerald-700 mt-0.5">${t('upload.result.sheet', { sheet: result.sheet })}</div>
    </div>
  `;
}

// No importer recognized the workbook's headers.
function unrecognizedPanel() {
  return `
    <div class="bg-white rounded-xl border border-amber-200 bg-amber-50/40 p-5">
      <div class="text-sm font-semibold text-amber-800">${t('upload.result.unrecognized')}</div>
      <div class="text-xs text-amber-700 mt-0.5">${t('upload.result.unrecognized_hint')}</div>
    </div>
  `;
}

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
              <th class="px-3 py-2 text-left w-16">${t('upload.col.row')}</th>
              <th class="px-3 py-2 text-left w-16">${t('upload.col.col')}</th>
              <th class="px-3 py-2 text-left w-40">${t('upload.col.field')}</th>
              <th class="px-3 py-2 text-left">${t('upload.col.message')}</th>
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
            <div class="text-sm font-semibold text-slate-900">${t('upload.errors_found', { n: errors.length })}</div>
            <div class="text-xs text-slate-500">${t('upload.fix_reupload')}</div>
          </div>
        </div>
        <button id="export-errors-csv" class="text-xs px-3 py-1.5 border border-slate-200 rounded-md text-slate-700 bg-white hover:bg-slate-50">${t('upload.export_csv')}</button>
      </div>
      ${groupBlocks}
    </div>
  `;
}

function templatesPanel() {
  return `
    <div class="bg-white rounded-xl border border-slate-200 p-5">
      <div class="text-sm font-semibold text-slate-900 mb-3">${t('upload.templates')}</div>
      <div class="space-y-2">
        ${templates().map((tpl) => `
          <a href="${tpl.href}" target="_blank" rel="noopener" class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer group no-underline">
            <div class="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-slate-800 truncate">${tpl.name}</div>
              <div class="text-[11px] text-slate-500 truncate">${tpl.desc}</div>
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

// Renders whatever the last parse produced into #upload-result.
function paintResult(result) {
  const host = document.getElementById('upload-result');
  if (!host) return;
  if (!result)                    { host.innerHTML = idleResultPanel();  return; }
  if (result.parseError)          { host.innerHTML = unrecognizedPanel(); return; }
  if (result.errors.length === 0) { host.innerHTML = cleanResultPanel(result); return; }

  host.innerHTML = errorTable(result.errors);
  host.querySelector('#export-errors-csv')
      ?.addEventListener('click', () => exportErrorsCsv(_errors));
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
  statusEl.textContent = t('upload.status.reading');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const wasm = await loadWasm();
  if (!wasm) {
    // dev-only fallback — only reachable when wasm-pack hasn't been built; never shown in the
    // built/deployed app (R-rebuild-dist-before-qa), so this stays English (see whitelist).
    statusEl.innerHTML = `<span class="text-amber-600">WASM not built yet — run <code class="font-mono bg-amber-50 px-1.5 py-0.5 rounded">make build-wasm</code>.</span>`;
    return;
  }
  try {
    // F-57-02: run the real import workflow, not process_excel_file(). The latter clears
    // last_errors and only summarizes sheets — the parser never populates errors, so the
    // companion get_validation_errors() was always empty. Validation lives in the importers.
    const result = runImport(bytes, wasm);
    _errors = result.errors;
    paintResult(result);

    if (result.parseError) {
      statusEl.innerHTML = `<span class="text-amber-600">${t('upload.status.unrecognized')}</span>`;
    } else {
      statusEl.innerHTML = `<span class="text-emerald-600">${t('upload.status.imported', {
        sheet: result.sheet, ok: result.rowsOk, total: result.rowsTotal,
      })}</span>`;
    }
  } catch (err) {
    _errors = [];
    paintResult(null);
    statusEl.innerHTML = `<span class="text-red-600">${t('upload.status.wasm_error', { error: err.message })}</span>`;
  }
}

export async function render(root) {
  root.innerHTML = `
    <div class="p-6 max-w-[1400px] mx-auto">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 space-y-4">
          <div class="bg-white rounded-xl border border-slate-200 p-5">
            <div class="text-sm font-semibold text-slate-900 mb-1">${t('upload.title')}</div>
            <div class="text-xs text-slate-500 mb-4">${t('upload.subtitle')}</div>
            <upload-zone></upload-zone>
            <div id="upload-status" class="mt-3 text-xs text-slate-600"></div>
          </div>
          <div id="upload-result"></div>
        </div>
        <div class="space-y-4">
          ${templatesPanel()}
          <div class="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-5 text-white">
            <div class="text-xs uppercase tracking-wider text-blue-200">${t('pipeline')}</div>
            <div class="text-sm font-medium mt-1.5">${t('upload.pipeline_flow')}</div>
            <div class="text-xs text-blue-200 mt-3">${t('upload.parse_target')}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  _errors = [];
  paintResult(null); // idle until a file actually arrives

  const status = document.getElementById('upload-status');
  document.querySelector('upload-zone').addEventListener('vdg:file', (e) => {
    handleFile(e.detail.file, status);
  });
  // The CSV button lives inside the error table, so it is wired in paintResult() — binding it
  // here would only ever find the button from a previous render, or none at all.
}
