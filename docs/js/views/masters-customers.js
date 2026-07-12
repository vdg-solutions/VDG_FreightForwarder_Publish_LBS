// F-12-11 — Master CRUD: Customers

import { isManager } from '../auth/auth-gate.js';
import { openMergeModal, mergeRecords, repointRefs } from '../operators/manager/merge-orchestrator.js';
import { showConfirm } from '../helpers/show-confirm.js';

const KIND       = 'customers';
const KIND_PREFIX = 'CUST'; // AC-M2

const COLS = ['name', 'short_code', 'contact_person', 'tel', 'actions'];

// ── helpers ───────────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function genId() {
  return `${KIND_PREFIX}-${Date.now()}`;
}

// ── modal ─────────────────────────────────────────────────────────────────────

function buildModal(entity) {
  const isEdit = !!entity;
  const e = entity || {};
  return `
    <dialog id="master-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-md backdrop:bg-black/30">
      <form id="modal-form" method="dialog" class="p-6 space-y-4">
        <div class="text-base font-semibold text-slate-900 mb-1">${isEdit ? 'Edit Customer' : 'New Customer'}</div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Name <span class="text-red-500">*</span></label>
          <input id="m-name" type="text" value="${escHtml(e.name)}" required
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <span id="m-err-name" class="hidden text-xs text-red-600"></span>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Short Code</label>
          <input id="m-short_code" type="text" value="${escHtml(e.short_code)}"
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Contact Person</label>
          <input id="m-contact_person" type="text" value="${escHtml(e.contact_person)}"
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Tel</label>
            <input id="m-tel" type="text" value="${escHtml(e.tel)}"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Email</label>
            <input id="m-email" type="email" value="${escHtml(e.email)}"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Address</label>
          <input id="m-address" type="text" value="${escHtml(e.address)}"
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Commercial Terms</label>
            <select id="m-commercial_terms"
                    class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">— None —</option>
              <option value="NET-30" ${e.commercial_terms === 'NET-30' ? 'selected' : ''}>NET-30</option>
              <option value="NET-45" ${e.commercial_terms === 'NET-45' ? 'selected' : ''}>NET-45</option>
              <option value="NET-60" ${e.commercial_terms === 'NET-60' ? 'selected' : ''}>NET-60</option>
              <option value="COD"    ${e.commercial_terms === 'COD'    ? 'selected' : ''}>COD</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Dunning override (days)</label>
            <input id="m-dunning_threshold_days_override" type="number" min="1" max="365"
                   value="${escHtml(e.dunning_threshold_days_override)}"
                   placeholder="Default ladder"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div class="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit"
                  class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">Save</button>
          <button type="button" id="btn-modal-cancel"
                  class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
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
    if (!name) {
      errEl.textContent = 'Name is required'; errEl.classList.remove('hidden'); return;
    }
    errEl.classList.add('hidden');

    const thresholdRaw = dialog.querySelector('#m-dunning_threshold_days_override').value.trim();
    const updated = {
      ...(entity || {}),
      id:             entity?.id || genId(),
      name,
      short_code:     dialog.querySelector('#m-short_code').value.trim() || null,
      contact_person: dialog.querySelector('#m-contact_person').value.trim() || null,
      tel:            dialog.querySelector('#m-tel').value.trim() || null,
      email:          dialog.querySelector('#m-email').value.trim() || null,
      address:        dialog.querySelector('#m-address').value.trim() || null,
      commercial_terms:                  dialog.querySelector('#m-commercial_terms').value || null,
      dunning_threshold_days_override:   thresholdRaw ? Number(thresholdRaw) : null,
    };

    await onSave(updated);
    dialog.close();
  });
}

// ── table ─────────────────────────────────────────────────────────────────────

function rowHtml(e, isM) {
  const actions = isM ? `
    <button class="btn-edit text-xs text-blue-600 hover:underline mr-2" data-id="${e.id}">Edit</button>
    <button class="btn-delete text-xs text-red-500 hover:underline" data-id="${e.id}">Delete</button>` : '';
  const checkCell = isM ? `<td class="px-2 py-2"><input type="checkbox" class="row-check" data-id="${e.id}" /></td>` : '';
  return `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs" data-id="${e.id}">
      ${checkCell}
      <td class="px-3 py-2">${escHtml(e.name)}</td>
      <td class="px-3 py-2 font-mono">${escHtml(e.short_code)}</td>
      <td class="px-3 py-2">${escHtml(e.contact_person)}</td>
      <td class="px-3 py-2">${escHtml(e.tel)}</td>
      ${isM ? `<td class="px-3 py-2">${actions}</td>` : ''}
    </tr>`;
}

// ── entry point ───────────────────────────────────────────────────────────────

export async function render(root) {
  const isM  = isManager();
  const repo = window.__vdg_repo;
  let items  = [];

  const checkCol = isM ? '<th class="px-2 py-2 w-8"></th>' : '';
  const actCol   = isM ? '<th class="px-3 py-2 text-left w-28">Actions</th>' : '';

  root.innerHTML = `
    <div class="p-6 max-w-[1100px] mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div class="text-lg font-semibold text-slate-900">Customers</div>
        <div class="flex gap-2">
          <button id="btn-merge" class="hidden px-3 py-1.5 text-xs rounded bg-amber-100 text-amber-700 hover:bg-amber-200">Merge into →</button>
          ${isM ? `<button id="btn-add" class="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700">+ Add New</button>` : ''}
        </div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              ${checkCol}
              <th class="px-3 py-2 text-left">Name</th>
              <th class="px-3 py-2 text-left">Short Code</th>
              <th class="px-3 py-2 text-left">Contact</th>
              <th class="px-3 py-2 text-left">Tel</th>
              ${actCol}
            </tr>
          </thead>
          <tbody id="m-tbody"></tbody>
        </table>
        <div id="m-empty" class="hidden text-center text-xs text-slate-400 py-8">No customers found.</div>
      </div>
      <div id="m-status" class="text-xs text-slate-400 mt-2">Loading…</div>
    </div>`;

  async function reload() {
    items = repo ? await repo.list(KIND, null).catch(() => []) : [];
    const tbody = root.querySelector('#m-tbody');
    const emptyEl = root.querySelector('#m-empty');
    if (tbody) tbody.innerHTML = items.map((e) => rowHtml(e, isM)).join('');
    if (emptyEl) emptyEl.classList.toggle('hidden', items.length > 0);
    root.querySelector('#m-status').textContent = '';
    updateMergeBtn();
  }

  function updateMergeBtn() {
    const checked = root.querySelectorAll('.row-check:checked');
    const btn = root.querySelector('#btn-merge');
    if (btn) btn.classList.toggle('hidden', checked.length !== 2);
  }

  await reload();

  root.querySelector('#btn-add')?.addEventListener('click', () => {
    openModal(root, null, async (entity) => {
      await repo.put(KIND, entity.id, entity);
      await reload();
    });
  });

  root.querySelector('#m-tbody')?.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.btn-edit');
    if (editBtn) {
      const entity = items.find((i) => i.id === editBtn.dataset.id);
      if (entity) openModal(root, entity, async (updated) => { await repo.put(KIND, updated.id, updated); await reload(); });
    }
    const delBtn = e.target.closest('.btn-delete');
    if (delBtn) {
      const ok = await showConfirm({
        title: 'Delete this customer?', confirmLabel: 'Delete', cancelLabel: 'Cancel', destructive: true,
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
