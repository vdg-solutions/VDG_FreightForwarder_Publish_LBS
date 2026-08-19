// Shipment-state alias edit modal — split out of shipment-states.js so the save handler is
// unit-testable via the fake-DOM technique proven in local-charges-modal.test.mjs (F-18-11
// AC-03). Alias-editor only: `code` is always readonly (the 6 canonical rows are fixed, never
// added/deleted here — Q2), only aliases/label_vi/label_en are editable.

import { t } from '../../../../../kernel/core_abstractions/i18n/index.js';

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildModal(entity) {
  const e = entity || {};
  const aliases = (e.aliases || []).join(', ');
  return `
    <dialog id="ss-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-lg backdrop:bg-black/30">
      <form id="ss-modal-form" method="dialog" class="p-6 space-y-4">
        <div class="text-base font-semibold text-slate-900 mb-1">${t('shipment_states.modal.title_edit')}</div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t('shipment_states.modal.code_label')}</label>
          <input id="ss-code" type="text" value="${escHtml(e.code)}" readonly
                 class="w-full border rounded-lg px-3 py-2 text-sm font-mono bg-slate-50 text-slate-500" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('shipment_states.modal.label_vi_label')}</label>
            <input id="ss-label-vi" type="text" value="${escHtml(e.label_vi)}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('shipment_states.modal.label_en_label')}</label>
            <input id="ss-label-en" type="text" value="${escHtml(e.label_en)}"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <span id="ss-err-label-vi" class="hidden text-xs text-red-600"></span>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t('shipment_states.modal.aliases_label')}</label>
          <input id="ss-aliases" type="text" value="${escHtml(aliases)}" placeholder="${t('shipment_states.modal.aliases_placeholder')}"
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div class="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">${t('shipment_states.modal.save')}</button>
          <button type="button" id="btn-ss-cancel" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">${t('shipment_states.modal.cancel')}</button>
        </div>
      </form>
    </dialog>`;
}

// entity: existing row from the 6-row registry (code always present, edit-only — no create path)
export function openModal(root, entity, onSave) {
  root.querySelector('#ss-modal')?.remove();
  root.insertAdjacentHTML('beforeend', buildModal(entity));
  const dialog = root.querySelector('#ss-modal');
  dialog.showModal();
  dialog.querySelector('#btn-ss-cancel').addEventListener('click', () => dialog.close());
  dialog.querySelector('#ss-modal-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const labelVi = dialog.querySelector('#ss-label-vi').value.trim();
    const labelEn = dialog.querySelector('#ss-label-en').value.trim();
    const aliases = dialog.querySelector('#ss-aliases').value.split(',').map((a) => a.trim()).filter(Boolean);

    const errEl = dialog.querySelector('#ss-err-label-vi');
    if (!labelVi) {
      errEl.textContent = t('shipment_states.modal.err_label_vi_required');
      errEl.classList.remove('hidden');
      return;
    }
    errEl.classList.add('hidden');

    const updated = { ...(entity || {}), code: entity.code, label_vi: labelVi, label_en: labelEn, aliases };
    await onSave(updated);
    dialog.close();
  });
}
