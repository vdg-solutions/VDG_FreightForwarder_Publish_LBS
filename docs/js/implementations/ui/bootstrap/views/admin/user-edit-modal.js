// user-edit-modal.js — Edit User modal for the admin Users view (F-24-04).
// F-46-03: one PATCH /api/users/{email} call replaces the old changeRole cascade + separate
// display_name upsert — the server writes both in one request and enforces the last-Manager guard
// itself. The fork is server-managed now (assigned once at create, never edited here).
//
// AC-04/AC-05: this same modal IS the reactivate flow (`{ reactivate: true }`) — a deactivated
// grant's `roles` were wiped to `[]` on the server, so bringing the account back is choosing its
// roles fresh, never restoring an old set nobody kept. Only the copy differs; the write (roles ->
// non-empty PATCH, which is what flips `active` back to true server-side) is the same one Edit
// always made.

import { mountOverlay } from '../../helpers/mount-overlay.js';
import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { rolesFromForm, roleCheckboxesHtml } from '../../../core_abstractions/ports/manager/users-view-composer.js';
import { ROLE_LABEL_KEYS } from '../../../core_abstractions/ports/manager/users-view-composer.js';
import { patchUser } from '../../../../storage/core_abstractions/user-directory.js';

function showError(overlay, message) {
  const err = overlay.querySelector('#edit-err');
  err.textContent = message;
  err.classList.remove('hidden');
}

/// AC-04: role and/or name change -> one PATCH /api/users/{email}. `reactivate: true` is the same
/// write, on a deactivated row, with copy that says so.
export function openEditUserModal(user, { onSaved, reactivate = false } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 bg-black/40 flex items-center justify-center';
  const title = reactivate ? t('admin.users.modal.reactivate_title') : t('admin.users.modal.edit_title');
  const rolesHint = reactivate ? t('admin.users.modal.reactivate_hint') : t('admin.users.roles.hint');
  overlay.innerHTML = `
    <div class="bg-white rounded-xl shadow-xl p-6 w-96 space-y-4">
      <div class="text-sm font-semibold text-slate-800">${title} — ${user.email}</div>
      <div class="space-y-3">
        <label class="block text-xs text-slate-600">${t('admin.users.column.display_name')}
          <input id="edit-name" value="${user.display_name || ''}"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" /></label>
        <div class="space-y-1">
          <div class="text-xs font-medium text-slate-700">${t('admin.users.column.role')}</div>
          <div class="text-[11px] text-slate-400">${rolesHint}</div>
          ${roleCheckboxesHtml(user.roles || [], (r) => t(ROLE_LABEL_KEYS[r] || r))}
        </div>
      </div>
      <div id="edit-err" class="text-xs text-red-600 hidden"></div>
      <div class="flex gap-2 justify-end">
        <button id="edit-cancel" class="px-3 py-1.5 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200">${t('admin.users.action.cancel')}</button>
        <button id="edit-submit" class="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">${t('admin.users.action.save')}</button>
      </div>
    </div>`;

  mountOverlay(overlay);

  overlay.querySelector('#edit-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#edit-submit').addEventListener('click', () => _onSubmit(overlay, user, onSaved, reactivate));
}

async function _onSubmit(overlay, user, onSaved, reactivate) {
  const newName  = overlay.querySelector('#edit-name').value.trim();
  const newRoles = rolesFromForm(overlay);

  if (!newName) return showError(overlay, t('admin.users.error.name_required'));
  if (!newRoles.length) return showError(overlay, t('admin.users.error.role_required'));

  const body = {};
  if (newName !== (user.display_name || '')) body.display_name = newName;
  if (newRoles.join(',') !== (user.roles || []).join(',')) body.roles = newRoles;

  const submitBtn = overlay.querySelector('#edit-submit');
  submitBtn.disabled = true;
  try {
    if (Object.keys(body).length) await patchUser(user.email, body);
    overlay.remove();
    const toastKey = reactivate ? 'admin.users.toast.reactivated' : 'admin.users.toast.updated';
    window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type: 'success', message: t(toastKey).replace('{email}', user.email) } }));
    await onSaved?.();
  } catch (err) {
    showError(overlay, err.message);
    submitBtn.disabled = false;
  }
}
