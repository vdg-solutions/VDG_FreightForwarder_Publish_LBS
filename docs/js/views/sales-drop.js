import { loadWasm } from '../wasm-loader.js';
import { commitPnlReport } from '../operators/pnl-commit-orchestrator.js';
import { runBatchImport } from '../operators/pnl-vertical-batch-import.js';
import { t } from '../i18n/index.js';
import '../components/upload-zone.js';
import { navigate } from '../router.js';
import { currentSalesRepId } from '../auth/auth-gate.js';
import { PNL_VERTICAL_AUTOFILL_KEY } from './sales-new-form/pnl-vertical-autofill.js';
import { renderShipmentRow, renderLinesSubTable, renderRightPanel } from './sales-drop-preview.js';

const ROUTE_SALES_DROP        = '/sales/drop';
const ROUTE_SALES_NEW         = '/sales/me/pnl/new';
const ROUTE_SHIPMENTS         = '/shipments';  // batch success navigation target
const UNKNOWN_FORMAT          = 'Unknown';
const FORMAT_COMBINED         = 'Combined';
const MS_PER_SECOND           = 1000;
const BIFF_NOT_SUPPORTED_ERROR = 'biff open failed';
const SCHEMA_ZERO_JOBS_ERROR   = 'SCHEMA_FORMAT_ZERO_JOBS';

// Columns shown in shipment preview table
const PREVIEW_COLS = ['shipment_ref','customer','pol','pod','etd','mode','carrier','buy_total','sell_total','margin'];

// ── render helpers ────────────────────────────────────────────────────────────

function renderFormatBanner(detect, fileName) {
  const fmt_name = detect.format  || 'Unknown';
  const conf     = detect.confidence != null ? ` · ${(detect.confidence * 100).toFixed(0)}%` : '';
  const cls = fmt_name === UNKNOWN_FORMAT
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-blue-50 border-blue-200 text-blue-700';
  return `
    <div class="rounded-lg border ${cls} px-4 py-3 text-sm flex items-center gap-3">
      <span class="font-semibold">${fmt_name}${conf}</span>
      <span class="text-xs opacity-70">${fileName}</span>
    </div>`;
}

// ── state ─────────────────────────────────────────────────────────────────────

let _state = {
  detect: null,
  report: null,
  file:   null,
  committing: false,
  committed:  false,
  summary:    null,
  expandedRow: null,
};

// ── core logic ────────────────────────────────────────────────────────────────

// F-15-57: single pair keeps the F-15-64 form-review path; N>1 pairs batch-commit directly
async function _handleLegacyImport(pairs, root) {
  if (pairs.length === 1) {
    sessionStorage.setItem(PNL_VERTICAL_AUTOFILL_KEY, JSON.stringify(pairs[0]));
    navigate(ROUTE_SALES_NEW);
    return;
  }

  const salesRepId = currentSalesRepId() || '';
  const result = await runBatchImport(pairs, window.__vdg_repo, salesRepId);
  if (!result.ok) {
    const msg = t('pnl.import.batch_failed_at_pair').replace('{index}', result.pairIndex);
    // D-02: spec requires floating toast, not inline status text
    window.dispatchEvent(new CustomEvent('vdg:toast', {
      detail: { message: `${msg}: ${result.reason}`, type: 'error' },
    }));
    return;
  }
  window.dispatchEvent(new CustomEvent('vdg:toast', {
    detail: { message: t('pnl.import.batch_created').replace('{count}', result.refs.length), type: 'success' },
  }));
  navigate(ROUTE_SHIPMENTS);
}

// Exported for the F-19-95 lane test (AC-07) — drives the wasm detect/parse branch matrix
// directly, the lower-friction seam vs. simulating the upload-zone custom-element indirection.
export async function processFile(file, root) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const wasm  = await loadWasm();

  setStatus(root, t('sales_drop.status.detecting'));
  let detect;
  try { detect = wasm ? wasm.detect_pnl_format_wasm(bytes) : null; }
  catch (e) { setStatus(root, e.message.includes(BIFF_NOT_SUPPORTED_ERROR) ? `<span class="text-amber-600">${t('sales_drop.biff_pending')}</span>` : `<span class="text-red-600">${t('sales_drop.status.detect_error', { error: e.message })}</span>`); return; }
  if (!detect) {
    setStatus(root, `<span class="text-amber-600">${t('sales_drop.status.wasm_not_built')}</span>`);
    return;
  }

  // AC-10: unknown/unsupported format (e.g. horizontal layout) → graceful reject
  if (detect.format === UNKNOWN_FORMAT) {
    setStatus(root, `<span class="text-red-600">${t('pnl.import.unsupported_format')}</span>`);
    return;
  }

  // Vertical legacy format → bridge to 4-section form for review (AC-05)
  if (detect.format !== FORMAT_COMBINED) {
    let pairs;
    try { pairs = wasm.import_legacy_pnl_wasm(bytes); }
    catch (e) {
      if (e.message.includes(BIFF_NOT_SUPPORTED_ERROR)) { setStatus(root, `<span class="text-amber-600">${t('sales_drop.biff_pending')}</span>`); return; }
      const statusMsg = e.message.includes(SCHEMA_ZERO_JOBS_ERROR)
        ? `${t('sales_drop.status.schema_error')}: ${e.message}`
        : t('sales_drop.status.parse_error', { error: e.message });
      setStatus(root, `<span class="text-red-600">${statusMsg}</span>`);
      return;
    }
    if (!pairs?.length) { setStatus(root, `<span class="text-amber-600">${t('sales_drop.status.no_shipments')}</span>`); return; }
    await _handleLegacyImport(pairs, root);
    return;
  }

  setStatus(root, t('sales_drop.status.parsing', { fmt: detect.format }));
  let report;
  try { report = wasm.import_pnl_combined_wasm(bytes); }
  catch (err) { setStatus(root, `<span class="text-red-600">${t('sales_drop.status.parse_error', { error: err.message })}</span>`); return; }
  _state = { ..._state, detect, report, file, committed: false, summary: null, expandedRow: null };
  setStatus(root, '');
  renderPreview(root);
}

async function handleCommit(root) {
  const { report } = _state;
  if (!report || _state.committing) return;
  _state.committing = true;
  const started = Date.now();
  const onProg = (e) => {
    const { done, total } = e.detail || {};
    const secs = ((Date.now() - started) / MS_PER_SECOND).toFixed(0);
    setStatus(root, t('sales_drop.status.saving', { done, total, secs }));
  };
  window.addEventListener('vdg:save-progress', onProg);
  try {
    const summary = await commitPnlReport(report, window.__vdg_repo);
    const total   = summary.created_shipments + summary.created_lines;
    const secs    = ((Date.now() - started) / MS_PER_SECOND).toFixed(0);
    _state = { ..._state, committing: false, committed: true, summary };
    setStatus(root, t('sales_drop.status.saved', { done: total, total, secs }));
    renderPreview(root);
  } catch (err) {
    _state.committing = false;
    setStatus(root, `<span class="text-red-600">${t('sales_drop.status.commit_failed', { error: err.message })}</span>`);
  } finally {
    window.removeEventListener('vdg:save-progress', onProg);
  }
}

// ── DOM rendering ─────────────────────────────────────────────────────────────

function setStatus(root, html) {
  const el = root.querySelector('#sdrop-status');
  if (el) el.innerHTML = html;
}

function renderPreview(root) {
  const { detect, report, file } = _state;
  const previewEl = root.querySelector('#sdrop-preview');
  if (!previewEl) return;

  if (!detect) { previewEl.innerHTML = ''; return; }

  if (detect.format === UNKNOWN_FORMAT) {
    previewEl.innerHTML = `
      ${renderFormatBanner(detect, file.name)}
      <div class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        ${t('sales_drop.unknown_format_hint')}
      </div>`;
    return;
  }

  const shipments = report?.shipments ?? [];
  const lines     = report?.lines     ?? [];
  const errors    = report?.errors    ?? [];
  const canCommit = !_state.committed && shipments.length > 0 && errors.length === 0;

  if (_state.committed && _state.summary) {
    const s = _state.summary;
    previewEl.innerHTML = `
      <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800 space-y-1">
        <div class="font-semibold text-base">${t('sales_drop.import_complete')}</div>
        <div>Shipments: <strong>${s.created_shipments}</strong> · Lines: <strong>${s.created_lines}</strong></div>
        <div>${t('sales_drop.summary.new_customers')} <strong>${s.new_customers}</strong> · ${t('sales_drop.summary.new_carriers')} <strong>${s.new_carriers}</strong></div>
      </div>`;
    return;
  }

  const shipRows = shipments.map((s, i) => renderShipmentRow(s, lines, i)).join('');

  const tableHeader = `
    <tr class="bg-slate-50 text-slate-600 text-[11px] font-semibold uppercase tracking-wider">
      <th class="px-3 py-2 text-left">${t('sales_drop.col.ref')}</th>
      <th class="px-3 py-2 text-left">${t('sales_drop.col.customer')}</th>
      <th class="px-3 py-2 text-left">${t('sales_new.field.pol')}</th>
      <th class="px-3 py-2 text-left">${t('sales_new.field.pod')}</th>
      <th class="px-3 py-2 text-left">${t('sales_new.field.etd')}</th>
      <th class="px-3 py-2 text-left">${t('sales_drop.col.mode')}</th>
      <th class="px-3 py-2 text-left">${t('sales_drop.col.carrier')}</th>
      <th class="px-3 py-2 text-right">${t('sales_drop.col.lines')}</th>
      <th class="px-3 py-2 text-right">${t('sales_drop.col.buy_vnd')}</th>
      <th class="px-3 py-2 text-right">${t('sales_drop.col.sell_vnd')}</th>
      <th class="px-3 py-2 text-right">${t('sales_drop.col.margin')}</th>
    </tr>`;

  previewEl.innerHTML = `
    <div class="space-y-4">
      ${renderFormatBanner(detect, file.name)}
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div class="rounded-xl border border-slate-200 overflow-x-auto">
          <table class="w-full min-w-[700px]">
            <thead>${tableHeader}</thead>
            <tbody id="sdrop-tbody">${shipRows}</tbody>
          </table>
          <div id="sdrop-lines-panel" class="border-t border-slate-100 bg-slate-50"></div>
        </div>
        <div>${renderRightPanel(report, detect)}</div>
      </div>
      <div class="flex items-center gap-4 pt-2 border-t border-slate-200">
        <button id="sdrop-confirm" class="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition
          ${canCommit ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer' : 'bg-slate-300 cursor-not-allowed'}"
          ${canCommit ? '' : 'disabled'}>
          ${t('sales_drop.confirm_create', { n: shipments.length })}
        </button>
        <a href="#/dashboard" class="text-sm text-slate-500 hover:text-slate-700">${t('common.action.cancel')}</a>
        ${errors.length > 0 ? `<span class="text-xs text-red-600">${t('sales_drop.fix_before_commit', { n: errors.length })}</span>` : ''}
      </div>
    </div>`;

  // Row expand → lines sub-table
  previewEl.querySelector('#sdrop-tbody')?.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-row]');
    if (!tr) return;
    const idx = Number(tr.dataset.row);
    const panel = previewEl.querySelector('#sdrop-lines-panel');
    if (_state.expandedRow === idx) {
      _state.expandedRow = null;
      panel.innerHTML = '';
      return;
    }
    _state.expandedRow = idx;
    const s = shipments[idx];
    const ref = s?.shipment_ref || s?.ShipmentRef;
    const shLines = lines.filter((l) => (l.shipment_ref || l.ShipmentRef) === ref);
    panel.innerHTML = renderLinesSubTable(shLines);
  });

  previewEl.querySelector('#sdrop-confirm')?.addEventListener('click', () => handleCommit(root));
}

// ── entry point ───────────────────────────────────────────────────────────────

export async function render(root) {
  _state = { detect: null, report: null, file: null, committing: false, committed: false, summary: null, expandedRow: null };

  root.innerHTML = `
    <div class="p-6 max-w-[1400px] mx-auto space-y-5">
      <div>
        <div class="text-lg font-semibold text-slate-900">${t('sales_drop.button_label')} <span class="text-slate-400 font-normal text-sm">(1 thao tác)</span></div>
        <div class="text-xs text-slate-500 mt-0.5">${t('sales_drop.subtitle')}</div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-5">
        <upload-zone accept=".xlsx, .xls"></upload-zone>
        <div id="sdrop-status" class="mt-2 text-xs text-slate-600"></div>
      </div>
      <div id="sdrop-preview"></div>
    </div>`;

  const zone = root.querySelector('upload-zone');
  zone._validateAndDispatch = function(file) {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      setStatus(root, `<span class="text-red-600">${t('sales_drop.xls_not_supported')}</span>`);
      return;
    }
    this._dispatch(file);
  };

  zone.addEventListener('vdg:file', (e) => processFile(e.detail.file, root));

}
