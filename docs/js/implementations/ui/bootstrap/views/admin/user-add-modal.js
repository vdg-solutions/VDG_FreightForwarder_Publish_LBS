// user-add-modal.js — Add User modal for the admin Users view (F-24-04).
// F-46-03: one POST /api/users call replaces the old read-grant / CAS-write-grant / create-fork-
// folder cascade (userRepo.upsert + roleService.assignRole, ~60s) — the server does the grant
// write and the fork-folder create in one request now, and it is idempotent, so there is no
// partial-failure rollback dance left to write here.

import { mountOverlay } from '../../helpers/mount-overlay.js';
import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { isValidEmail, rolesFromForm, roleCheckboxesHtml } from '../../../core_abstractions/ports/manager/users-view-composer.js';
import { ROLE_LABEL_KEYS } from '../../../core_abstractions/ports/manager/users-view-composer.js';
import { createUser } from '../../../../storage/core_abstractions/user-directory.js';

function showError(overlay, message) {
  const err = overlay.querySelector('#add-err');
  err.textContent = message;
  err.classList.remove('hidden');
}

/// AC-03: submit -> POST /api/users -> refresh.
export function openAddUserModal({ onAdded } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 bg-black/40 flex items-center justify-center';
  overlay.innerHTML = `
    <div class="bg-white rounded-xl shadow-xl p-6 w-96 space-y-4">
      <div class="text-sm font-semibold text-slate-800">${t('admin.users.modal.add_title')}</div>
      <div class="space-y-3">
        <label class="block text-xs text-slate-600">${t('admin.users.column.email')}
          <input id="add-email" type="email" placeholder="user@company.com"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" /></label>
        <label class="block text-xs text-slate-600">${t('admin.users.column.display_name')}
          <input id="add-name" class="mt-1 w-full border rounded px-3 py-1.5 text-xs" /></label>
        <div class="space-y-1">
          <div class="text-xs font-medium text-slate-700">${t('admin.users.column.role')}</div>
          <div class="text-[11px] text-slate-400">${t('admin.users.roles.hint')}</div>
          ${roleCheckboxesHtml([], (r) => t(ROLE_LABEL_KEYS[r] || r))}
        </div>
      </div>
      <div id="add-err" class="text-xs text-red-600 hidden"></div>
      <div class="flex gap-2 justify-end">
        <button id="add-cancel" class="px-3 py-1.5 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200">${t('admin.users.action.cancel')}</button>
        <button id="add-submit" class="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">${t('admin.users.action.save')}</button>
      </div>
    </div>`;

  mountOverlay(overlay);

  overlay.querySelector('#add-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#add-submit').addEventListener('click', () => _onSubmit(overlay, onAdded));
}

async function _onSubmit(overlay, onAdded) {
  const email = overlay.querySelector('#add-email').value.trim();
  const name  = overlay.querySelector('#add-name').value.trim();
  const roles = rolesFromForm(overlay);

  if (!email) return showError(overlay, t('admin.users.error.email_required'));
  if (!isValidEmail(email)) return showError(overlay, t('admin.users.error.email_invalid'));
  if (!name) return showError(overlay, t('admin.users.error.name_required'));
  if (!roles.length) return showError(overlay, t('admin.users.error.role_required'));

  const submitBtn = overlay.querySelector('#add-submit');
  submitBtn.disabled = true;
  try {
    await createUser({ email, display_name: name, roles });
    overlay.remove();
    window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type: 'success', message: t('admin.users.toast.added').replace('{email}', email) } }));
    await onAdded?.();
  } catch (err) {
    showError(overlay, err.message);
    submitBtn.disabled = false;
  }
}
