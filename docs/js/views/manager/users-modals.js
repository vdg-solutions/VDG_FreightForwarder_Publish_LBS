// users-modals.js — edit-profile + invite-sales overlay dialogs for manager/users.js.
// Split out to respect the 350-line/file cap; pure DOM builders, no repo/Drive calls of their
// own beyond what's passed in via deps.

import { t } from '../../i18n/index.js';

export function openEditModal(user, root, deps) {
  const { getRepo, editProfile, toast, reload } = deps;
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 bg-black/40 flex items-center justify-center';
  overlay.innerHTML = `
    <div class="bg-white rounded-xl shadow-xl p-6 w-96 space-y-4">
      <div class="text-sm font-semibold text-slate-800">${t('users.edit.title', { email: user.email })}</div>
      <div class="space-y-3">
        <label class="block text-xs text-slate-600">${t('name')}
          <input id="ep-name" value="${user.name || ''}"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" />
        </label>
        <label class="block text-xs text-slate-600">${t('users.edit.field.sales_code')}
          <input id="ep-code" value="${user.sales_code || ''}"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" />
        </label>
        <label class="block text-xs text-slate-600">${t('users.edit.field.commission_override')}
          <input id="ep-comm" type="number" step="0.1" value="${user.commission_pct_override ?? ''}"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" />
        </label>
        <label class="block text-xs text-slate-600">${t('users.edit.field.dunning_override')}
          <input id="ep-dun" type="number" value="${user.dunning_threshold_days_override ?? ''}"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" />
        </label>
      </div>
      <div id="ep-err" class="text-xs text-red-600 hidden"></div>
      <div class="flex gap-2 justify-end">
        <button id="ep-cancel" class="px-3 py-1.5 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200">${t('common.action.cancel')}</button>
        <button id="ep-save"   class="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">${t('common.action.save')}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  overlay.querySelector('#ep-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#ep-save').onclick   = async () => {
    const repo   = getRepo();
    const fields = {
      name:                            overlay.querySelector('#ep-name').value.trim(),
      sales_code:                      overlay.querySelector('#ep-code').value.trim(),
      commission_pct_override:         overlay.querySelector('#ep-comm').value !== '' ? Number(overlay.querySelector('#ep-comm').value) : undefined,
      dunning_threshold_days_override: overlay.querySelector('#ep-dun').value  !== '' ? Number(overlay.querySelector('#ep-dun').value)  : undefined,
    };
    // Remove undefined keys
    Object.keys(fields).forEach((k) => fields[k] === undefined && delete fields[k]);
    try {
      await editProfile(user.id, fields, repo);
      overlay.remove();
      toast('success', t('users.toast.profile_updated'));
      await reload(root);
    } catch (err) {
      overlay.querySelector('#ep-err').textContent = err.message;
      overlay.querySelector('#ep-err').classList.remove('hidden');
    }
  };
}

export function openInviteModal(root, deps) {
  const { getRepo, getDriveApi, inviteSales, activeWorkspaceName, toast, reload } = deps;
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 bg-black/40 flex items-center justify-center';
  overlay.innerHTML = `
    <div class="bg-white rounded-xl shadow-xl p-6 w-96 space-y-4">
      <div class="text-sm font-semibold text-slate-800">${t('users.invite.modal_title')}</div>
      <div class="space-y-3">
        <label class="block text-xs text-slate-600">${t('email')}
          <input id="inv-email" type="email" placeholder="sales@company.com"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" />
        </label>
        <label class="block text-xs text-slate-600">${t('admin.users.column.display_name')}
          <input id="inv-name" placeholder="Nguyễn Văn A"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" />
        </label>
      </div>
      <div id="inv-err" class="text-xs text-red-600 hidden"></div>
      <div class="flex gap-2 justify-end">
        <button id="inv-cancel" class="px-3 py-1.5 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200">${t('common.action.cancel')}</button>
        <button id="inv-send"   class="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">${t('users.action.invite')}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  overlay.querySelector('#inv-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#inv-send').onclick   = async () => {
    const email = overlay.querySelector('#inv-email').value.trim();
    const name  = overlay.querySelector('#inv-name').value.trim();
    if (!email) { overlay.querySelector('#inv-err').textContent = t('admin.users.error.email_required'); overlay.querySelector('#inv-err').classList.remove('hidden'); return; }

    const repo     = getRepo();
    const driveApi = getDriveApi();
    const wsRoot   = driveApi ? await driveApi.findWorkspaceRoot(activeWorkspaceName()) : null;
    if (!repo || !driveApi || !wsRoot) {
      overlay.querySelector('#inv-err').textContent = t('users.error.workspace_not_ready');
      overlay.querySelector('#inv-err').classList.remove('hidden');
      return;
    }

    overlay.querySelector('#inv-send').disabled = true;
    try {
      await inviteSales(email, name, driveApi, repo, wsRoot);
      overlay.remove();
      toast('success', t('users.toast.invited', { email }));
      await reload(root);
    } catch (err) {
      overlay.querySelector('#inv-err').textContent = err.message;
      overlay.querySelector('#inv-err').classList.remove('hidden');
      overlay.querySelector('#inv-send').disabled = false;
    }
  };
}
