// masters-customers-modal.js — add/edit dialog split out of masters-customers.js (350-line cap).

import { t } from '../../../kernel/core_abstractions/i18n/index.js';

const KIND_PREFIX = 'CUST'; // AC-M2

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function genId() {
  return `${KIND_PREFIX}-${Date.now()}`;
}

// F-41-01: which rep serves this customer lives on the customer master, so a CS-created job
// inherits its rep from the customer instead of from whoever typed it (industry rule). A stored
// account no longer in the active list is still offered so an edit never silently drops it.
function repOptions(reps, selected) {
  const known  = (reps || []).some((r) => r.account === selected);
  const legacy = selected && !known ? `<option value="${escHtml(selected)}" selected>${escHtml(selected)}</option>` : '';
  return `<option value="">${t('masters_customers.field.sales_rep_none')}</option>${legacy}` +
    (reps || []).map((r) =>
      `<option value="${escHtml(r.account)}"${r.account === selected ? ' selected' : ''}>${escHtml(r.name)}${r.handle ? ` (${escHtml(r.handle)})` : ''}</option>`).join('');
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

export function openModal(root, entity, onSave, reps = []) {
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
