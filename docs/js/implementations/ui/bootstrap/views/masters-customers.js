// F-12-11 — Master CRUD: Customers

import { currentRoles } from '../../../ui/core_abstractions/ports/auth/session-roles.js';
import { canWriteMaster } from '../../core_abstractions/ports/cache/master-registry.js';
import { showConfirm } from '../helpers/show-confirm.js';
import { boundedList, renderMasterLoadRetryStatus } from '../../../kernel/core_abstractions/util/master-load.js';
import { getActiveSalesReps } from '../../core_abstractions/ports/flows/sales-registry.js';
import { mountAgGrid } from '../../../kernel/core_abstractions/i18n/ag-grid-locale.js';
import { t } from '../../../kernel/core_abstractions/i18n/index.js';
import { openModal } from './masters-customers-modal.js';
import { wireGridFilterEmptyState } from '../components/empty-state.js';

const KIND       = 'customers';

// ── cell renderers ────────────────────────────────────────────────────────────

function makeActionsRenderer(onEdit, onDelete) {
  return function actionsRenderer(params) {
    const wrap = document.createElement('div');
    wrap.className = 'flex items-center gap-2 h-full';
    const editBtn = document.createElement('button');
    editBtn.className = 'text-xs text-blue-600 hover:underline';
    editBtn.textContent = t('common.action.edit');
    editBtn.addEventListener('click', (e) => { e.stopPropagation(); onEdit(params.data); });
    const delBtn = document.createElement('button');
    delBtn.className = 'text-xs text-red-500 hover:underline';
    delBtn.textContent = t('common.action.delete');
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); onDelete(params.data); });
    wrap.appendChild(editBtn);
    wrap.appendChild(delBtn);
    return wrap;
  };
}

// ── entry point ───────────────────────────────────────────────────────────────


let _onLocale = null;

export async function render(root) {
  if (_onLocale) window.removeEventListener('vdg:locale-changed', _onLocale);
  _onLocale = () => {
    const liveRoot = document.getElementById('view-root');
    if (liveRoot) render(liveRoot);
  };
  window.addEventListener('vdg:locale-changed', _onLocale);

  const canEdit  = canWriteMaster(KIND, currentRoles());
  const repo = window.__vdg_repo;
  let items  = [];
  let api    = null;

  const loadReps = async () => (repo ? await getActiveSalesReps(repo).catch(() => []) : []);

  root.innerHTML = `
    <div class="p-6 max-w-[1600px] mx-auto">
      <div id="grid-header"></div>
      <div id="cust-grid" class="ag-theme-quartz rounded-xl overflow-hidden border border-slate-200" style="height:520px;"></div>
      <div id="m-status" class="text-xs text-slate-400 mt-2">Loading…</div>
    </div>`;

  function renderToolbar(total) {
    const addBtn = canEdit
      ? `<button id="btn-add" class="text-xs px-3 py-1.5 bg-slate-900 text-white rounded-md hover:bg-slate-800">${t('masters_customers.action.add')}</button>`
      : '';
    return `
      <div class="flex items-center justify-between mb-4">
        <div class="text-lg font-semibold text-slate-900">${t('masters_customers.title')} <span class="text-sm font-normal text-slate-400">(${total})</span></div>
        <div class="flex items-center gap-2">
          <div class="relative">
            <svg class="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input id="grid-search" placeholder="${t('masters_customers.toolbar.search_placeholder')}" class="text-sm pl-8 pr-3 py-1.5 border border-slate-200 rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
          </div>
          <button id="export-csv" class="text-xs px-3 py-1.5 border border-slate-200 rounded-md text-slate-700 bg-white hover:bg-slate-50">${t('masters_customers.toolbar.export_csv')}</button>
          ${addBtn}
        </div>
      </div>`;
  }

  async function onEdit(entity) {
    openModal(root, entity, async (updated) => {
      await repo.put(KIND, updated.id, updated);
      items = items.map((i) => (i.id === updated.id ? updated : i));
      api?.setGridOption('rowData', items);
    }, await loadReps());
  }

  async function onDelete(entity) {
    const ok = await showConfirm({
      title: t('masters_customers.confirm_delete'), confirmLabel: t('common.action.delete'), cancelLabel: t('common.action.cancel'), destructive: true,
    });
    if (!ok) return;
    await repo.delete(KIND, entity.id);
    items = items.filter((i) => i.id !== entity.id);
    api?.setGridOption('rowData', items);
  }

  function buildColumnDefs() {
    const cols = [];
    cols.push(
      { headerName: t('masters_customers.col.name'),       field: 'name',           flex: 2, minWidth: 160 },
      { headerName: t('masters_customers.col.short_code'), field: 'short_code',     width: 110, cellClass: 'font-mono text-xs', valueGetter: (p) => p.data.short_code ?? '—' },
      { headerName: t('masters_customers.col.contact'),    field: 'contact_person', flex: 1, minWidth: 120, valueGetter: (p) => p.data.contact_person ?? '—' },
      { headerName: t('masters_customers.col.tel'),        field: 'tel',            width: 130, valueGetter: (p) => p.data.tel ?? '—' },
      { headerName: t('masters_customers.col.sales_rep'),  field: 'sales_rep_id',   width: 100, cellClass: 'font-mono text-xs', valueGetter: (p) => p.data.sales_rep_id ?? '—' },
    );
    if (canEdit) {
      cols.push({ headerName: '', field: 'actions', width: 110, sortable: false, filter: false, cellRenderer: makeActionsRenderer(onEdit, onDelete) });
    }
    return cols;
  }

  async function reload() {
    const statusEl = root.querySelector('#m-status');
    if (!repo) {
      items = [];
      api?.setGridOption('rowData', items);
      if (statusEl) statusEl.textContent = '';
      return;
    }

    const listRes = await boundedList(repo, KIND, 'customers:list');
    if (!listRes.ok) {
      items = [];
      api?.setGridOption('rowData', items);
      renderMasterLoadRetryStatus(statusEl, t('masters.load_error'), t('common.load.retry'), reload);
      return;
    }

    items = listRes.value;
    api?.setGridOption('rowData', items);
    if (statusEl) statusEl.textContent = '';
    const hdr = root.querySelector('#grid-header');
    if (hdr) hdr.innerHTML = renderToolbar(items.length);
    wireToolbar();
  }

  async function handleAdd() {
    openModal(root, null, async (entity) => {
      await repo.put(KIND, entity.id, entity);
      items = [...items, entity];
      api?.setGridOption('rowData', items);
      const hdr = root.querySelector('#grid-header');
      if (hdr) hdr.innerHTML = renderToolbar(items.length);
      wireToolbar();
    }, await loadReps());
  }

  function wireToolbar() {
    wireGridFilterEmptyState({
      root,
      getApi: () => api,
      searchSelector: '#grid-search',
      getTotal: () => items.length,
      entity: t('masters_customers.empty.entity'),
      // CTA relies on the generic empty_state.filtered.create / first_run.create templates —
      // matches this view's own "+ Thêm mới" toolbar verb, so no per-view override is needed.
      onCreate: canEdit ? handleAdd : undefined,
    });
    root.querySelector('#export-csv')?.addEventListener('click', () => {
      api?.exportDataAsCsv({ fileName: 'vdg_customers.csv' });
    });
    root.querySelector('#btn-add')?.addEventListener('click', handleAdd);
  }

  const headerDiv = root.querySelector('#grid-header');
  if (headerDiv) headerDiv.innerHTML = renderToolbar(0);

  const gridDiv = root.querySelector('#cust-grid');
  if (window.agGrid && gridDiv) {
    api = mountAgGrid(gridDiv, {
      columnDefs: buildColumnDefs(),
      rowData: [],
      defaultColDef: { sortable: true, resizable: true, filter: true },
      rowHeight: 38,
      headerHeight: 36,
    });
  }

  wireToolbar();
  await reload();
}

