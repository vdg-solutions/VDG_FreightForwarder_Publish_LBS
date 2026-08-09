// user-edit-modal.js — Edit User modal for the admin Users view (F-24-04).
// Role change cascades Drive ACL via RoleAssignmentService.changeRole; a display_name-only
// edit is a plain repo upsert (backlog: "Change display_name (upsert only)").
// F-27-01: {sales_prefix} -> {user_prefix} rename. Prefix field stays SalesRep-only for now —
// widening to every role is Open Q #1 in the F-27-01 design, not decided here.

import { t } from '../../i18n/index.js';
import { deriveUserPrefix, rolesFromForm, roleCheckboxesHtml } from '../../operators/manager/users-view-composer.js';

const ROLE_LABEL_KEYS = {
  Manager:    'admin.users.role.manager',
  SalesRep:   'admin.users.role.sales_rep',
  Accountant: 'admin.users.role.accountant',
  Auditor:    'admin.users.role.auditor',
  Pricing:    'admin.users.hat.pricing',
};


function getUserRepo()    { return window.__vdg_user_repo; }
function getRoleService() { return window.__vdg_role_assignment_service; }

function showError(overlay, message) {
  const err = overlay.querySelector('#edit-err');
  err.textContent = message;
  err.classList.remove('hidden');
}

/// AC-04: role change -> changeRole cascade (revoke old ACL, grant new). Name-only change ->
/// plain upsert, no Drive calls.
export function openEditUserModal(user, { onSaved } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 bg-black/40 flex items-center justify-center';
  overlay.innerHTML = `
    <div class="bg-white rounded-xl shadow-xl p-6 w-96 space-y-4">
      <div class="text-sm font-semibold text-slate-800">${t('admin.users.modal.edit_title')} — ${user.email}</div>
      <div class="space-y-3">
        <label class="block text-xs text-slate-600">${t('admin.users.column.display_name')}
          <input id="edit-name" value="${user.display_name || ''}"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" /></label>
        <div class="space-y-1">
          <div class="text-xs font-medium text-slate-700">${t('admin.users.column.role')}</div>
          <div class="text-[11px] text-slate-400">${t('admin.users.roles.hint')}</div>
          ${roleCheckboxesHtml(user.roles || [user.role], (r) => t(ROLE_LABEL_KEYS[r] || r))}
        </div>
        <label id="edit-prefix-wrap" class="block text-xs text-slate-600">${t('admin.users.column.user_prefix')}
          <input id="edit-prefix" value="${user.user_prefix || ''}"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" /></label>
      </div>
      <div id="edit-err" class="text-xs text-red-600 hidden"></div>
      <div class="flex gap-2 justify-end">
        <button id="edit-cancel" class="px-3 py-1.5 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200">${t('admin.users.action.cancel')}</button>
        <button id="edit-submit" class="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">${t('admin.users.action.save')}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  overlay.querySelector('#edit-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#edit-submit').addEventListener('click', () => _onSubmit(overlay, user, onSaved));
}

async function _onSubmit(overlay, user, onSaved) {
  const newName   = overlay.querySelector('#edit-name').value.trim();
  const newRoles  = rolesFromForm(overlay);
  const newRole   = newRoles[0] || '';
  const prefixRaw = overlay.querySelector('#edit-prefix').value.trim();
  // #28: every user owns a fork, whatever their roles — never null.
  const newPrefix = prefixRaw || deriveUserPrefix(user.email);
  const newHats   = newRoles.slice(1);

  if (!newName) return showError(overlay, t('admin.users.error.name_required'));
  if (!newRoles.length) return showError(overlay, t('admin.users.error.role_required'));

  const roleService = getRoleService();
  const userRepo     = getUserRepo();
  if (!roleService || !userRepo) return showError(overlay, 'Workspace not ready');

  const oldRoles    = (user.roles || [user.role, ...(user.extra_roles || [])]).filter(Boolean).join(',');
  const roleChanged = newRoles.join(',') !== oldRoles || newPrefix !== (user.user_prefix || null);
  const nameChanged = newName !== (user.display_name || '');

  const submitBtn = overlay.querySelector('#edit-submit');
  submitBtn.disabled = true;
  let assignSkipped = [];
  try {
    if (roleChanged) {
      // changeRole returns { skipped } — ACL folders drive.file couldn't grant (they hold
      // non-app-created files). Non-fatal; surfaced below.
      const changeResult = await roleService.changeRole(user, newRole, newPrefix, newHats);
      assignSkipped = changeResult?.skipped || [];
    }
    if (nameChanged) {
      await userRepo.upsert({
        email: user.email, display_name: newName, role: newRole, user_prefix: newPrefix,
        roles: newRoles, extra_roles: newHats, active: true, created_at: user.created_at,
      });
    }

    overlay.remove();
    window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type: 'success', message: t('admin.users.toast.updated').replace('{email}', user.email) } }));
    if (assignSkipped.length) {
      window.dispatchEvent(new CustomEvent('vdg:toast', { detail: {
        type: 'warn', duration: 8000,
        message: t('admin.users.toast.acl_partial').replace('{count}', String(assignSkipped.length)),
      } }));
    }
    await onSaved?.();
  } catch (err) {
    showError(overlay, err.message);
    submitBtn.disabled = false;
  }
}
