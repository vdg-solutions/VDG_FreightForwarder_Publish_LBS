// user-add-modal.js — Add User modal for the admin Users view (F-24-04).
// F-24-07 partial fix: SalesRep add provisions the ACL folder (users/{sales_prefix}) before
// granting Drive perms, so assignRole doesn't fail on a folder that hasn't been created yet.
// F-24-08 D-03: assignRole failure after the user record was upserted rolls back via
// UserRepo.remove(email) — no orphaned row with zero Drive grants.

import { t } from '../../i18n/index.js';
import {
  ROLE_VALUES, ROLE_SALES_REP, deriveSalesPrefix, isValidEmail,
} from '../../operators/manager/users-view-composer.js';
import { activeWorkspaceName } from '../../operators/workspace-registry.js';

const ROLE_LABEL_KEYS = {
  Manager:    'admin.users.role.manager',
  SalesRep:   'admin.users.role.sales_rep',
  Accountant: 'admin.users.role.accountant',
  Auditor:    'admin.users.role.auditor',
};

function getUserRepo()   { return window.__vdg_user_repo; }
function getRoleService() { return window.__vdg_role_assignment_service; }
function getDriveApi()   { return window.__vdg_drive_api; }

function showError(overlay, message) {
  const err = overlay.querySelector('#add-err');
  err.textContent = message;
  err.classList.remove('hidden');
}

function togglePrefixField(overlay) {
  const role = overlay.querySelector('#add-role').value;
  overlay.querySelector('#add-prefix-wrap').classList.toggle('hidden', role !== ROLE_SALES_REP);
}

/// AC-03: submit -> (SalesRep only) ensure Drive folder exists -> assignRole -> refresh.
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
        <label class="block text-xs text-slate-600">${t('admin.users.column.role')}
          <select id="add-role" class="mt-1 w-full border rounded px-3 py-1.5 text-xs">
            ${ROLE_VALUES.map((r) => `<option value="${r}">${t(ROLE_LABEL_KEYS[r])}</option>`).join('')}
          </select></label>
        <label id="add-prefix-wrap" class="block text-xs text-slate-600 hidden">${t('admin.users.column.sales_prefix')}
          <input id="add-prefix" class="mt-1 w-full border rounded px-3 py-1.5 text-xs" /></label>
      </div>
      <div id="add-err" class="text-xs text-red-600 hidden"></div>
      <div class="flex gap-2 justify-end">
        <button id="add-cancel" class="px-3 py-1.5 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200">${t('admin.users.action.cancel')}</button>
        <button id="add-submit" class="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">${t('admin.users.action.save')}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const emailInput  = overlay.querySelector('#add-email');
  const prefixInput = overlay.querySelector('#add-prefix');
  let prefixTouched = false;
  prefixInput.addEventListener('input', () => { prefixTouched = true; });
  emailInput.addEventListener('input', () => {
    if (!prefixTouched) prefixInput.value = deriveSalesPrefix(emailInput.value);
  });

  overlay.querySelector('#add-role').addEventListener('change', () => togglePrefixField(overlay));
  overlay.querySelector('#add-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#add-submit').addEventListener('click', () => _onSubmit(overlay, onAdded));
}

async function _onSubmit(overlay, onAdded) {
  const email = overlay.querySelector('#add-email').value.trim();
  const name  = overlay.querySelector('#add-name').value.trim();
  const role  = overlay.querySelector('#add-role').value;
  const prefixRaw = overlay.querySelector('#add-prefix').value.trim();

  if (!email) return showError(overlay, t('admin.users.error.email_required'));
  if (!isValidEmail(email)) return showError(overlay, t('admin.users.error.email_invalid'));
  if (!name) return showError(overlay, t('admin.users.error.name_required'));

  const salesPrefix = role === ROLE_SALES_REP ? (prefixRaw || deriveSalesPrefix(email)) : null;
  const roleService = getRoleService();
  const driveApi     = getDriveApi();
  const userRepo     = getUserRepo();
  if (!roleService || !driveApi || !userRepo) return showError(overlay, 'Workspace not ready');

  const submitBtn = overlay.querySelector('#add-submit');
  submitBtn.disabled = true;
  let assignSkipped = [];
  try {
    // Record display_name up front so assignRole's own upsert (which defaults display_name to
    // the existing record) reproduces it verbatim instead of overwriting with the email.
    await userRepo.upsert({
      email, display_name: name, role, sales_prefix: salesPrefix,
      active: true, created_at: new Date().toISOString(),
    });

    try {
      // F-24-07 partial: create the ACL folder first — assignRole's resolvePathToFolderId
      // throws if users/{sales_prefix} doesn't exist yet for a brand-new SalesRep.
      if (role === ROLE_SALES_REP && salesPrefix) {
        const wsRoot = await driveApi.findWorkspaceRoot(activeWorkspaceName());
        if (!wsRoot) throw new Error('Workspace root not found');
        await driveApi.getOrCreateFolderPath(wsRoot, `users/${salesPrefix}`);
      }
      // Returns { user, skipped } — skipped = ACL folders drive.file couldn't grant because
      // they hold non-app-created files (appNotAuthorizedToChild). Non-fatal; surfaced below.
      const assignResult = await roleService.assignRole(email, role, salesPrefix);
      assignSkipped = assignResult?.skipped || [];
    } catch (err) {
      // F-24-08 D-03: assignRole failed after the user record was upserted above — soft-delete
      // it so no orphaned row with zero Drive grants survives a failed add.
      await userRepo.remove(email);
      throw err;
    }

    overlay.remove();
    window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type: 'success', message: t('admin.users.toast.added').replace('{email}', email) } }));
    if (assignSkipped.length) {
      window.dispatchEvent(new CustomEvent('vdg:toast', { detail: {
        type: 'warn', duration: 8000,
        message: t('admin.users.toast.acl_partial').replace('{count}', String(assignSkipped.length)),
      } }));
    }
    await onAdded?.();
  } catch (err) {
    showError(overlay, err.message);
    submitBtn.disabled = false;
  }
}
