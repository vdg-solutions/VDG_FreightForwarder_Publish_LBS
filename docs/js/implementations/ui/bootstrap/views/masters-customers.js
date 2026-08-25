// F-12-11 — Master CRUD: Customers

import { hasRole } from '../../../ui/core_abstractions/ports/auth/session-roles.js';
import { ROLE_MANAGER } from '../../../ui/core_abstractions/roles.js';
import { mergeRecords, repointRefs } from '../../core_abstractions/ports/governance/master-merge.js';
import { openMergeModal } from './merge-modal.js';
import { showConfirm } from '../helpers/show-confirm.js';
import { boundedList, renderMasterLoadRetryStatus } from '../../../kernel/core_abstractions/util/master-load.js';
import { getActiveSalesReps } from '../../core_abstractions/ports/flows/sales-registry.js';
import { agGridLocaleText } from '../../../kernel/core_abstractions/i18n/ag-grid-locale.js';
import { t } from '../../../kernel/core_abstractions/i18n/index.js';

const KIND       = 'customers';
const KIND_PREFIX = 'CUST'; // AC-M2

const LOAD_ERROR_MSG   = t('masters.load_error');
const LOAD_RETRY_LABEL = t('common.retry');

// ── helpers ───────────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function genId() {
  return `${KIND_PREFIX}-${Date.now()}`;
}

// ── modal ─────────────────────────────────────────────────────────────────────

// F-41-01: which rep serves this customer lives on the customer master, so a CS-created job
// inherits its rep from the customer instead of from whoever typed it (industry rule). A stored
// prefix no longer in the active list is still offered so an edit never silently drops it.
function repOptions(reps, selected) {
  const known  = (reps || []).some((r) => r.prefix === selected);
  const legacy = selected && !known ? `<option value="${escHtml(selected)}" selected>${escHtml(selected)}</option>` : '';
  return `<option value="">${t('masters_customers.field.sales_rep_none')}</option>${legacy}` +
    (reps || []).map((r) =>
      `<option value="${escHtml(r.prefix)}"${r.prefix === selected ? ' selected' : ''}>${escHtml(r.name)}${r.handle ? ` (${escHtml(r.handle)})` : ''}</option>`).join('');
}

function buildModal(entity, reps) {
  const isEdit = !!entity;
  const e = entity || {};
  return `
    <dialog id="master-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-md backdrop:bg-black/30">
      <form id="modal-form" method="dialog" class="p-6 space-y-4">
        <div class="text-base font-semibold text-slate-900 mb-1">${isEdit ? t('masters_customers.modal.edit') : t('masters_customers.modal.new')}</div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters_customers.field.name')} <span class="text-red-500">*</span></label>
          <input id="m-name" type="text" value="${escHtml(e.name)}" required
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <span id="m-err-name" class="hidden text-xs text-red-600"></span>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters_customers.field.short_code')}</label>
          <input id="m-short_code" type="text" value="${escHtml(e.short_code)}"
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters_customers.field.contact_person')}</label>
          <input id="m-contact_person" type="text" value="${escHtml(e.contact_person)}"
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters_customers.field.tel')}</label>
            <input id="m-tel" type="text" value="${escHtml(e.tel)}"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters_customers.field.email')}</label>
            <input id="m-email" type="email" value="${escHtml(e.email)}"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters_customers.field.address')}</label>
          <input id="m-address" type="text" value="${escHtml(e.address)}"
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters_customers.field.sales_rep')}</label>
          <select id="m-sales_rep"
                  class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            ${repOptions(reps, e.sales_rep_id)}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters_customers.field.commercial_terms')}</label>
          <select id="m-commercial_terms"
                  class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">— None —</option>
            <option value="NET-30" ${e.commercial_terms === 'NET-30' ? 'selected' : ''}>NET-30</option>
            <option value="NET-45" ${e.commercial_terms === 'NET-45' ? 'selected' : ''}>NET-45</option>
            <option value="NET-60" ${e.commercial_terms === 'NET-60' ? 'selected' : ''}>NET-60</option>
            <option value="COD"    ${e.commercial_terms === 'COD'    ? 'selected' : ''}>${t('masters_customers.field.cod')}</option>
          </select>
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

function openModal(root, entity, onSave, reps = []) {
  root.querySelector('#master-modal')?.remove();
  root.insertAdjacentHTML('beforeend', buildModal(entity, reps));
  const dialog = root.querySelector('#master-modal');
  dialog.showModal();

  dialog.querySelector('#btn-modal-cancel').addEventListener('click', () => dialog.close());

  dialog.querySelector('#modal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = dialog.querySelector('#m-name').value.trim();
    const errEl = dialog.querySelector('#m-err-name');
    if (!name) {
      errEl.textContent = t('masters.val.name_required'); errEl.classList.remove('hidden'); return;
    }
    errEl.classList.add('hidden');

    const updated = {
      ...(entity || {}),
      id:             entity?.id || genId(),
      name,
      short_code:     dialog.querySelector('#m-short_code').value.trim() || null,
      contact_person: dialog.querySelector('#m-contact_person').value.trim() || null,
      tel:            dialog.querySelector('#m-tel').value.trim() || null,
      email:          dialog.querySelector('#m-email').value.trim() || null,
      address:        dialog.querySelector('#m-address').value.trim() || null,
      sales_rep_id:   dialog.querySelector('#m-sales_rep').value || null,
      commercial_terms:                  dialog.querySelector('#m-commercial_terms').value || null,
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


let _onLocale = null;

export async function render(root) {
  if (_onLocale) window.removeEventListener('vdg:locale-changed', _onLocale);
  _onLocale = () => {
    const liveRoot = document.getElementById('view-root');
    if (liveRoot) render(liveRoot);
  };
  window.addEventListener('vdg:locale-changed', _onLocale);

  const isM  = hasRole(ROLE_MANAGER);
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
    const mergeBtn = isM
      ? `<button id="btn-merge" disabled class="px-3 py-1.5 text-xs rounded bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-40 disabled:cursor-not-allowed">${t('masters_customers.action.merge')}</button>`
      : '';
    const addBtn = isM
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
          ${mergeBtn}
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
      { headerName: t('masters_customers.col.name'),       field: 'name',           flex: 2, minWidth: 160 },
      { headerName: t('masters_customers.col.short_code'), field: 'short_code',     width: 110, cellClass: 'font-mono text-xs', valueGetter: (p) => p.data.short_code ?? '—' },
      { headerName: t('masters_customers.col.contact'),    field: 'contact_person', flex: 1, minWidth: 120, valueGetter: (p) => p.data.contact_person ?? '—' },
      { headerName: t('masters_customers.col.tel'),        field: 'tel',            width: 130, valueGetter: (p) => p.data.tel ?? '—' },
      { headerName: t('masters_customers.col.sales_rep'),  field: 'sales_rep_id',   width: 100, cellClass: 'font-mono text-xs', valueGetter: (p) => p.data.sales_rep_id ?? '—' },
    );
    if (isM) {
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
      renderMasterLoadRetryStatus(statusEl, LOAD_ERROR_MSG, LOAD_RETRY_LABEL, reload);
      return;
    }

    items = listRes.value;
    api?.setGridOption('rowData', items);
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
      api?.exportDataAsCsv({ fileName: 'vdg_customers.csv' });
    });
    root.querySelector('#btn-add')?.addEventListener('click', async () => {
      openModal(root, null, async (entity) => {
        await repo.put(KIND, entity.id, entity);
        items = [...items, entity];
        api?.setGridOption('rowData', items);
        const hdr = root.querySelector('#grid-header');
        if (hdr) hdr.innerHTML = renderToolbar(items.length);
        wireToolbar();
      }, await loadReps());
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

  const gridDiv = root.querySelector('#cust-grid');
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

