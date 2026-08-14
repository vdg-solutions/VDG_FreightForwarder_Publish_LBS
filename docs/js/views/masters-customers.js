// F-12-11 — Master CRUD: Customers

import { hasRole, ROLE_MANAGER } from '../auth/auth-gate.js';
import { openMergeModal, mergeRecords, repointRefs } from '../operators/manager/merge-orchestrator.js';
import { showConfirm } from '../helpers/show-confirm.js';
import { boundedList, renderMasterLoadRetryStatus } from '../util/master-load.js';
import { getActiveSalesReps } from '../operators/sales-registry.js';
import { t } from '../i18n/index.js';

const KIND       = 'customers';
const KIND_PREFIX = 'CUST'; // AC-M2

const COLS = ['name', 'short_code', 'contact_person', 'tel', 'sales_rep', 'actions'];

const LOAD_ERROR_MSG   = "Couldn't load customers. Please retry.";
const LOAD_RETRY_LABEL = 'Retry';

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
      `<option value="${escHtml(r.prefix)}"${r.prefix === selected ? ' selected' : ''}>${escHtml(r.name)}${r.sales_code ? ` (${escHtml(r.sales_code)})` : ''}</option>`).join('');
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
      errEl.textContent = 'Name is required'; errEl.classList.remove('hidden'); return;
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

// ── table ─────────────────────────────────────────────────────────────────────

function rowHtml(e, isM) {
  const actions = isM ? `
    <button class="btn-edit text-xs text-blue-600 hover:underline mr-2" data-id="${e.id}">${t('common.action.edit')}</button>
    <button class="btn-delete text-xs text-red-500 hover:underline" data-id="${e.id}">${t('common.action.delete')}</button>` : '';
  const checkCell = isM ? `<td class="px-2 py-2"><input type="checkbox" class="row-check" data-id="${e.id}" /></td>` : '';
  return `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs" data-id="${e.id}">
      ${checkCell}
      <td class="px-3 py-2">${escHtml(e.name)}</td>
      <td class="px-3 py-2 font-mono">${escHtml(e.short_code)}</td>
      <td class="px-3 py-2">${escHtml(e.contact_person)}</td>
      <td class="px-3 py-2">${escHtml(e.tel)}</td>
      <td class="px-3 py-2 font-mono">${escHtml(e.sales_rep_id)}</td>
      ${isM ? `<td class="px-3 py-2">${actions}</td>` : ''}
    </tr>`;
}

// ── entry point ───────────────────────────────────────────────────────────────

export async function render(root) {
  const isM  = hasRole(ROLE_MANAGER);
  const repo = window.__vdg_repo;
  let items  = [];
  // F-41-01: options for the "sales phụ trách" select. Loaded when a modal OPENS, never on
  // render's critical path — a stalled user-kind read must not push this view past its
  // bounded-load ceiling (the F-29-14 guarantee).
  const loadReps = async () => (repo ? await getActiveSalesReps(repo).catch(() => []) : []);

  const checkCol = isM ? '<th class="px-2 py-2 w-8"></th>' : '';
  const actCol   = isM ? `<th class="px-3 py-2 text-left w-28">${t('common.col.actions')}</th>` : '';

  root.innerHTML = `
    <div class="p-6 max-w-[1100px] mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div class="text-lg font-semibold text-slate-900">${t('masters_customers.title')}</div>
        <div class="flex gap-2">
          <button id="btn-merge" class="hidden px-3 py-1.5 text-xs rounded bg-amber-100 text-amber-700 hover:bg-amber-200">Merge into →</button>
          ${isM ? `<button id="btn-add" class="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700">${t('masters_customers.action.add')}</button>` : ''}
        </div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              ${checkCol}
              <th class="px-3 py-2 text-left">${t('masters_customers.col.name')}</th>
              <th class="px-3 py-2 text-left">${t('masters_customers.col.short_code')}</th>
              <th class="px-3 py-2 text-left">${t('masters_customers.col.contact')}</th>
              <th class="px-3 py-2 text-left">${t('masters_customers.col.tel')}</th>
              <th class="px-3 py-2 text-left">${t('masters_customers.col.sales_rep')}</th>
              ${actCol}
            </tr>
          </thead>
          <tbody id="m-tbody"></tbody>
        </table>
        <div id="m-empty" class="hidden text-center text-xs text-slate-400 py-8">${t('masters_customers.empty')}</div>
      </div>
      <div id="m-status" class="text-xs text-slate-400 mt-2">Loading…</div>
    </div>`;

  // F-29-14: bounded — a stalled/failed customers read resolves to an actionable retry
  // instead of hanging the app-shell at "Loading view…". Exactly one terminal state renders.
  async function reload() {
    const tbody    = root.querySelector('#m-tbody');
    const emptyEl  = root.querySelector('#m-empty');
    const statusEl = root.querySelector('#m-status');
    if (!repo) {
      items = [];
      if (tbody) tbody.innerHTML = '';
      emptyEl?.classList.add('hidden');
      if (statusEl) statusEl.textContent = '';
      updateMergeBtn();
      return;
    }

    const listRes = await boundedList(repo, KIND, 'customers:list');
    if (!listRes.ok) {
      items = [];
      if (tbody) tbody.innerHTML = '';
      emptyEl?.classList.add('hidden');
      renderMasterLoadRetryStatus(statusEl, LOAD_ERROR_MSG, LOAD_RETRY_LABEL, reload);
      updateMergeBtn();
      return;
    }

    items = listRes.value;
    if (tbody) tbody.innerHTML = items.map((e) => rowHtml(e, isM)).join('');
    if (emptyEl) emptyEl.classList.toggle('hidden', items.length > 0);
    if (statusEl) statusEl.textContent = '';
    updateMergeBtn();
  }

  function updateMergeBtn() {
    const checked = root.querySelectorAll('.row-check:checked');
    const btn = root.querySelector('#btn-merge');
    if (btn) btn.classList.toggle('hidden', checked.length !== 2);
  }

  await reload();

  root.querySelector('#btn-add')?.addEventListener('click', async () => {
    openModal(root, null, async (entity) => {
      await repo.put(KIND, entity.id, entity);
      await reload();
    }, await loadReps());
  });

  root.querySelector('#m-tbody')?.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.btn-edit');
    if (editBtn) {
      const entity = items.find((i) => i.id === editBtn.dataset.id);
      if (entity) openModal(root, entity, async (updated) => { await repo.put(KIND, updated.id, updated); await reload(); }, await loadReps());
    }
    const delBtn = e.target.closest('.btn-delete');
    if (delBtn) {
      const ok = await showConfirm({
        title: t('masters_customers.confirm_delete'), confirmLabel: t('common.action.delete'), cancelLabel: t('common.action.cancel'), destructive: true,
      });
      if (!ok) return;
      items = items.filter((i) => i.id !== delBtn.dataset.id);
      root.querySelector(`tr[data-id="${delBtn.dataset.id}"]`)?.remove();
      await repo.delete(KIND, delBtn.dataset.id);
    }
    if (e.target.classList.contains('row-check')) updateMergeBtn();
  });

  root.querySelector('#btn-merge')?.addEventListener('click', async () => {
    const checked = [...root.querySelectorAll('.row-check:checked')];
    if (checked.length !== 2) return;
    const selected = checked.map((c) => items.find((i) => i.id === c.dataset.id)).filter(Boolean);
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
