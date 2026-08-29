// F-15-07 — Error log viewer (/manager/errors)

import { showConfirm } from '../../helpers/show-confirm.js';
import { t, currentLocale } from '../../../../kernel/core_abstractions/i18n/index.js';
import { mountDateHints } from '../../util/date-input-hint.js';
import { mountAgGrid } from '../../../../kernel/core_abstractions/i18n/ag-grid-locale.js';
import { listErrorRecords, purgeErrorMonth } from '../../../core_abstractions/ports/governance/error-log-store.js';

// raw technical tokens shown verbatim (mono diagnostic dump), same carve-out as row.kind below
const KIND_OPTS = ['js_error', 'unhandled_rejection', 'sync_error'];

let _grid     = null;
let _allRows  = [];
let _kindFilter = '';
let _dateFilter = '';

function getApi() { return window.__vdg_drive_api || null; }

// ── grid ───────────────────────────────────────────────────────────────────────

function applyFilters(rows) {
  return rows.filter((r) => {
    if (_kindFilter && r.kind !== _kindFilter) return false;
    if (_dateFilter && !(r.ts || '').startsWith(_dateFilter)) return false;
    return true;
  });
}

function mountGrid(container, rows) {
  if (_grid) { try { _grid.destroy(); } catch { /* ignore */ } _grid = null; }
  container.innerHTML = '<div class="ag-theme-quartz" style="height:420px"></div>';
  if (!window.agGrid) return;

  const colDefs = [
    { field: 'ts',          headerName: t('errors.col.time'),    width: 170, sort: 'desc' },
    { field: 'kind',        headerName: t('errors.col.kind'),    width: 140 },
    { field: 'msg',         headerName: t('errors.col.message'), flex: 1 },
    { field: 'user_email',  headerName: t('errors.col.user'),    width: 160 },
    { field: 'app_version', headerName: t('errors.col.version'), width: 90  },
    { field: 'url',         headerName: t('errors.col.url'),     width: 200 },
  ];

  const opts = {
    columnDefs:   colDefs,
    rowData:      rows,
    defaultColDef: { sortable: true, resizable: true, filter: true },
    onRowClicked:  (e) => _showDetail(container, e.data),
  };
  _grid = mountAgGrid(container.querySelector('.ag-theme-quartz'), opts);
}

function _showDetail(container, row) {
  if (!row) return;
  const existing = container.parentElement.querySelector('.err-detail');
  if (existing) existing.remove();
  const div = document.createElement('div');
  div.className = 'err-detail mt-3 p-4 bg-slate-800 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto';
  div.textContent = `[${row.ts}] ${row.kind}\n${row.msg}\n\n${row.stack || '(no stack)'}`;
  container.parentElement.appendChild(div);
}

// ── render ─────────────────────────────────────────────────────────────────────

export async function render(root) {
  root.innerHTML = `
    <div class="p-6 max-w-[1600px] mx-auto">
      <div class="flex items-center justify-between mb-4">
        <div class="text-lg font-semibold text-slate-900">${t('errors.title')}</div>
        <button id="btn-clear-all"
                class="px-3 py-1.5 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100">
          ${t('errors.action.clear_month')}
        </button>
      </div>
      <div class="flex gap-3 mb-4">
        <select id="filter-kind" class="border rounded-lg px-3 py-1.5 text-xs text-slate-700">
          <option value="">${t('errors.filter.all_kinds')}</option>
          ${KIND_OPTS.map((k) => `<option value="${k}">${k}</option>`).join('')}
        </select>
        <input id="filter-date" type="date" lang="${currentLocale()}"
               class="border rounded-lg px-3 py-1.5 text-xs text-slate-700"
               title="${t('errors.filter.date_title')}" />
        <button id="btn-apply" class="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">
          ${t('errors.action.apply')}
        </button>
        <button id="btn-refresh" class="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
          ${t('errors.action.refresh')}
        </button>
      </div>
      <div id="err-grid-container"></div>
      <div id="err-status" class="text-xs text-slate-400 mt-2">${t('loading')}</div>
    </div>`;
  mountDateHints(root);

  const api = getApi();

  async function reload() {
    root.querySelector('#err-status').textContent = t('loading');
    try {
      _allRows = await listErrorRecords();
    } catch (err) {
      _allRows = [];
      root.querySelector('#err-status').textContent = t('errors.status.error_prefix', { msg: err.message });
      return;
    }
    const filtered = applyFilters(_allRows);
    mountGrid(root.querySelector('#err-grid-container'), filtered);
    root.querySelector('#err-status').textContent = t('errors.status.count', { filtered: filtered.length, total: _allRows.length });
  }

  await reload();

  root.querySelector('#btn-apply').addEventListener('click', () => {
    _kindFilter = root.querySelector('#filter-kind').value;
    _dateFilter = root.querySelector('#filter-date').value;
    const filtered = applyFilters(_allRows);
    mountGrid(root.querySelector('#err-grid-container'), filtered);
    root.querySelector('#err-status').textContent = t('errors.status.count', { filtered: filtered.length, total: _allRows.length });
  });

  root.querySelector('#btn-refresh').addEventListener('click', reload);

  root.querySelector('#btn-clear-all').addEventListener('click', async () => {
    if (!api) return;
    const ok = await showConfirm({
      title: t('errors.confirm.delete_title'),
      body:  t('dunning_tmpl.confirm.body'),
      confirmLabel: t('common.action.delete'),
      cancelLabel:  t('common.action.cancel'),
      destructive:  true,
    });
    if (!ok) return;
    const now   = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    try {
      await purgeErrorMonth(api, month);
      await reload();
    } catch (err) {
      window.dispatchEvent(new CustomEvent('vdg:toast', {
        detail: { type: 'error', message: t('errors.toast.clear_failed', { msg: err.message }) },
      }));
    }
  });
}
