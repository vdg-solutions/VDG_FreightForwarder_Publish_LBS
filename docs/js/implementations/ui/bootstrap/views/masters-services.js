// F-12-11 — Master CRUD: Services

import { hasRole } from '../../../ui/core_abstractions/ports/auth/session-roles.js';
import { ROLE_MANAGER } from '../../../ui/core_abstractions/roles.js';
import { mergeRecords, repointRefs } from '../../core_abstractions/ports/governance/master-merge.js';
import { openMergeModal } from './merge-modal.js';
import { showConfirm } from '../helpers/show-confirm.js';
import { agGridLocaleText } from '../../../kernel/core_abstractions/i18n/ag-grid-locale.js';
import { t } from '../../../kernel/core_abstractions/i18n/index.js';

const KIND       = 'services';
const KIND_PREFIX = 'SVC'; // AC-M2

// Valid kinds from F-12-02 boundary
const VALID_SERVICE_KINDS = [
  'OceanFreight', 'LocalCharges', 'Documentation', 'Customs', 'Insurance',
  'Trucking', 'Handling', 'Storage', 'Other',
];

// ── helpers ───────────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function genId() {
  return `${KIND_PREFIX}-${Date.now()}`;
}

// ── modal ─────────────────────────────────────────────────────────────────────

function buildModal(entity) {
  const e = entity || {};
  const kindOptions = VALID_SERVICE_KINDS.map((k) =>
    `<option value="${k}" ${e.default_kind === k ? 'selected' : ''}>${k}</option>`
  ).join('');
  return `
    <dialog id="master-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-md backdrop:bg-black/30">
      <form id="modal-form" method="dialog" class="p-6 space-y-4">
        <div class="text-base font-semibold text-slate-900 mb-1">${entity ? t('masters_services.modal.edit') : t('masters_services.modal.new')}</div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters_services.field.name')} <span class="text-red-500">*</span></label>
          <input id="m-name" type="text" value="${escHtml(e.name)}" required
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <span id="m-err-name" class="hidden text-xs text-red-600"></span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters_services.field.code')}</label>
            <input id="m-code" type="text" value="${escHtml(e.code)}"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters_services.field.default_kind')}</label>
            <select id="m-default_kind"
                    class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">— select —</option>
              ${kindOptions}
            </select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters_services.field.description')}</label>
          <textarea id="m-description" rows="2"
                    class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none">${escHtml(e.description)}</textarea>
        </div>
        <div class="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit"
                  class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">${t('common.action.save')}</button>
          <button type="button" id="btn-modal-cancel"
                  class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">${t('common.action.cancel')}</button>
        </div>
      </form>
    </dialog>`;
}

function openModal(root, entity, onSave) {
  root.querySelector('#master-modal')?.remove();
  root.insertAdjacentHTML('beforeend', buildModal(entity));
  const dialog = root.querySelector('#master-modal');
  dialog.showModal();
  dialog.querySelector('#btn-modal-cancel').addEventListener('click', () => dialog.close());
  dialog.querySelector('#modal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = dialog.querySelector('#m-name').value.trim();
    const errEl = dialog.querySelector('#m-err-name');
    if (!name) { errEl.textContent = 'Name is required'; errEl.classList.remove('hidden'); return; }
    errEl.classList.add('hidden');
    const updated = {
      ...(entity || {}),
      id:           entity?.id || genId(),
      name,
      code:         dialog.querySelector('#m-code').value.trim() || null,
      default_kind: dialog.querySelector('#m-default_kind').value || null,
      description:  dialog.querySelector('#m-description').value.trim() || null,
    };
    await onSave(updated);
    dialog.close();
  });
}

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

export async function render(root) {
  const isM  = hasRole(ROLE_MANAGER);
  const repo = window.__vdg_repo;
  let items  = [];
  let api    = null;

  root.innerHTML = `
    <div class="p-6 max-w-[1200px] mx-auto">
      <div id="grid-header"></div>
      <div id="svc-grid" class="ag-theme-quartz rounded-xl overflow-hidden border border-slate-200" style="height:520px;"></div>
      <div id="m-status" class="text-xs text-slate-400 mt-2">Loading…</div>
    </div>`;

  function renderToolbar(total) {
    const mergeBtn = isM
      ? `<button id="btn-merge" disabled class="px-3 py-1.5 text-xs rounded bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-40 disabled:cursor-not-allowed">${t('masters_services.action.merge')}</button>`
      : '';
    const addBtn = isM
      ? `<button id="btn-add" class="text-xs px-3 py-1.5 bg-slate-900 text-white rounded-md hover:bg-slate-800">${t('masters_services.action.add')}</button>`
      : '';
    return `
      <div class="flex items-center justify-between mb-4">
        <div class="text-lg font-semibold text-slate-900">${t('masters_services.title')} <span class="text-sm font-normal text-slate-400">(${total})</span></div>
        <div class="flex items-center gap-2">
          <div class="relative">
            <svg class="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input id="grid-search" placeholder="${t('masters_services.toolbar.search_placeholder')}" class="text-sm pl-8 pr-3 py-1.5 border border-slate-200 rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
          </div>
          <button id="export-csv" class="text-xs px-3 py-1.5 border border-slate-200 rounded-md text-slate-700 bg-white hover:bg-slate-50">${t('masters_services.toolbar.export_csv')}</button>
          ${mergeBtn}
          ${addBtn}
        </div>
      </div>`;
  }

  async function onEdit(entity) {
    openModal(root, entity, async (u) => {
      await repo.put(KIND, u.id, u);
      items = items.map((i) => (i.id === u.id ? u : i));
      api?.setGridOption('rowData', items);
    });
  }

  async function onDelete(entity) {
    const ok = await showConfirm({
      title: t('masters_services.confirm_delete'), confirmLabel: t('common.action.delete'), cancelLabel: t('common.action.cancel'), destructive: true,
    });
    if (!ok) return;
    await repo.delete(KIND, entity.id);
    items = items.filter((i) => i.id !== entity.id);
    api?.setGridOption('rowData', items);
  }

  function buildColumnDefs() {
    const cols = [];
    if (isM) {
      cols.push({
        headerCheckboxSelection: false,
        checkboxSelection: true,
        width: 45,
        sortable: false,
        filter: false,
        resizable: false,
      });
    }
    cols.push(
      { headerName: t('masters_services.col.name'),         field: 'name',         flex: 2, minWidth: 160 },
      { headerName: t('masters_services.col.code'),         field: 'code',         width: 120, cellClass: 'font-mono text-xs', valueGetter: (p) => p.data.code ?? '—' },
      { headerName: t('masters_services.col.default_kind'), field: 'default_kind', flex: 1, minWidth: 140, valueGetter: (p) => p.data.default_kind ?? '—' },
    );
    if (isM) {
      cols.push({ headerName: '', field: 'actions', width: 110, sortable: false, filter: false, cellRenderer: makeActionsRenderer(onEdit, onDelete) });
    }
    return cols;
  }

  async function reload() {
    items = repo ? await repo.list(KIND, null).catch(() => []) : [];
    api?.setGridOption('rowData', items);
    const statusEl = root.querySelector('#m-status');
    if (statusEl) statusEl.textContent = '';
    const hdr = root.querySelector('#grid-header');
    if (hdr) hdr.innerHTML = renderToolbar(items.length);
    wireToolbar();
  }

  function updateMergeBtn() {
    const btn = root.querySelector('#btn-merge');
    if (!btn) return;
    const sel = api?.getSelectedRows() || [];
    btn.disabled = sel.length !== 2;
  }

  function wireToolbar() {
    root.querySelector('#grid-search')?.addEventListener('input', (e) => {
      api?.setGridOption('quickFilterText', e.target.value);
    });
    root.querySelector('#export-csv')?.addEventListener('click', () => {
      api?.exportDataAsCsv({ fileName: 'vdg_services.csv' });
    });
    root.querySelector('#btn-add')?.addEventListener('click', () => {
      openModal(root, null, async (entity) => {
        await repo.put(KIND, entity.id, entity);
        items = [...items, entity];
        api?.setGridOption('rowData', items);
        const hdr = root.querySelector('#grid-header');
        if (hdr) hdr.innerHTML = renderToolbar(items.length);
        wireToolbar();
      });
    });
    root.querySelector('#btn-merge')?.addEventListener('click', async () => {
      const selected = api?.getSelectedRows() || [];
      if (selected.length !== 2) return;
      openMergeModal(root, KIND, selected, async (target, source, _label) => {
        const merged = mergeRecords(target, source);
        await repo.put(KIND, target.id, merged);
        await repo.delete(KIND, source.id);
        const n = await repointRefs(repo, KIND, source.id, target.id);
        window.dispatchEvent(new CustomEvent('vdg:toast', {
          detail: { type: 'success', message: `Merged ${source.name} → ${target.name}, ${n} refs updated` },
        }));
        await reload();
      });
    });
  }

  const headerDiv = root.querySelector('#grid-header');
  if (headerDiv) headerDiv.innerHTML = renderToolbar(0);

  const gridDiv = root.querySelector('#svc-grid');
  if (window.agGrid && gridDiv) {
    api = window.agGrid.createGrid(gridDiv, {
      columnDefs: buildColumnDefs(),
      rowData: [],
      defaultColDef: { sortable: true, resizable: true, filter: true },
      rowSelection: isM ? 'multiple' : 'single',
      rowMultiSelectWithClick: false,
      suppressRowClickSelection: true,
      onSelectionChanged: updateMergeBtn,
      rowHeight: 38,
      headerHeight: 36,
      localeText: agGridLocaleText(),
    });
  }

  wireToolbar();
  await reload();
}

