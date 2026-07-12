// Admin Users view — F-24-04. Manager-only /admin/users: table + filter/search + Add/Edit/
// Deactivate, wired to UserRepoPort (F-24-02) + RoleAssignmentService (F-24-03).

import { isManager } from '../../auth/auth-gate.js';
import { navigate }  from '../../router.js';
import { t }         from '../../i18n/index.js';
import { filterUsers, sortUsersByEmail } from '../../operators/manager/users-view-composer.js';
import { filterBarHtml, renderUsersTable, bindRowActions } from './users-list.js';
import { openAddUserModal }  from './user-add-modal.js';
import { openEditUserModal } from './user-edit-modal.js';
import { showConfirm }       from '../../helpers/show-confirm.js';

const TOAST_MS = 4_000;

function getUserRepo()    { return window.__vdg_user_repo; }
function getRoleService() { return window.__vdg_role_assignment_service; }

function toast(type, message) {
  window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type, message, duration: TOAST_MS } }));
}

let _allUsers = [];
let _filter   = { search: '', role: '', activeFilter: '' };

function shellHtml() {
  return `
    <div class="p-6 max-w-[1400px] mx-auto space-y-4">
      <div class="flex items-center justify-between">
        <div class="text-lg font-semibold text-slate-900">${t('admin.users.title')}</div>
        <div class="flex gap-2">
          <button id="btn-view-audit-log" class="px-4 py-2 text-xs rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">
            ${t('admin.users.audit_log.link_text')}
          </button>
          <button id="btn-add-user" class="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            ${t('admin.users.add_button')}
          </button>
        </div>
      </div>
      <div id="usr-filter-bar"></div>
      <div id="usr-table-wrap"></div>
    </div>`;
}

function _applyAndRender(root) {
  const rows = filterUsers(_allUsers, _filter);
  const wrap = root.querySelector('#usr-table-wrap');
  renderUsersTable(wrap, rows);
  bindRowActions(wrap, rows, {
    onEdit:       (user) => openEditUserModal(user, { onSaved: () => _reload(root) }),
    onDeactivate: (user) => _onDeactivate(root, user),
  });
  const countEl = root.querySelector('#usr-count');
  if (countEl) countEl.textContent = `${rows.length} / ${_allUsers.length}`;
}

async function _reload(root) {
  const repo = getUserRepo();
  _allUsers  = repo ? sortUsersByEmail(await repo.listAll()) : [];
  _applyAndRender(root);
}

/// AC-04/AC-05: custom branded dialog replaces window.confirm(); confirm -> revokeRole
/// (cascades Drive perm revoke + soft-delete in one call).
async function _onDeactivate(root, user) {
  const ok = await showConfirm({
    title:        t('admin.users.confirm.deactivate_title').replace('{email}', user.email),
    body:         t('admin.users.confirm.deactivate_body'),
    confirmLabel: t('admin.users.action.deactivate'),
    cancelLabel:  t('admin.users.action.cancel'),
    destructive:  true,
  });
  if (!ok) return;

  const roleService = getRoleService();
  if (!roleService) { toast('error', 'Workspace not ready'); return; }

  try {
    await roleService.revokeRole(user.email, user.role, user.sales_prefix);
    toast('success', t('admin.users.toast.deactivated').replace('{email}', user.email));
    await _reload(root);
  } catch (err) {
    toast('error', err.message);
  }
}

function bindFilterBar(root) {
  root.querySelector('#usr-search')?.addEventListener('input', (e) => {
    _filter.search = e.target.value;
    _applyAndRender(root);
  });
  root.querySelector('#usr-role')?.addEventListener('change', (e) => {
    _filter.role = e.target.value;
    _applyAndRender(root);
  });
  root.querySelector('#usr-active')?.addEventListener('change', (e) => {
    _filter.activeFilter = e.target.value;
    _applyAndRender(root);
  });
}

export async function render(root) {
  if (!isManager()) { navigate('/dashboard'); return; }

  _filter = { search: '', role: '', activeFilter: '' };
  root.innerHTML = shellHtml();
  root.querySelector('#usr-filter-bar').innerHTML = filterBarHtml(_filter);
  bindFilterBar(root);
  root.querySelector('#btn-add-user').addEventListener('click', () => {
    openAddUserModal({ onAdded: () => _reload(root) });
  });
  root.querySelector('#btn-view-audit-log').addEventListener('click', () => navigate('/admin/users/audit-log'));

  await _reload(root);
}
