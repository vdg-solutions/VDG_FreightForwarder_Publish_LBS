// Admin Users view — F-24-04. Manager-only /admin/users: table + filter/search + Add/Edit/
// Deactivate. F-46-03: reads/writes go straight to GET/POST/PATCH /api/users — no wasm-bound repo
// to wait on, so the F-24-25 "cold-boot deep link" retry this view used to need is gone with it.

import { navigate }  from '../../router.js';
import { t }         from '../../../../kernel/core_abstractions/i18n/index.js';
import { filterUsers, sortUsersByEmail } from '../../../core_abstractions/ports/manager/users-view-composer.js';
import { filterBarHtml, renderUsersTable, renderUsersSkeleton, bindRowActions } from './users-list.js';
import { openAddUserModal }  from './user-add-modal.js';
import { openEditUserModal } from './user-edit-modal.js';
import { showConfirm }       from '../../helpers/show-confirm.js';
import { listUsers, patchUser } from '../../../../storage/core_abstractions/user-directory.js';

const TOAST_MS = 4_000;
const DEFAULT_ACTIVE_FILTER = '';

let _allUsers = [];
let _filter   = { search: '', role: '', activeFilter: DEFAULT_ACTIVE_FILTER };

function toast(type, message) {
  window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type, message, duration: TOAST_MS } }));
}

function shellHtml() {
  return `
    <div class="p-6 max-w-[1600px] mx-auto space-y-4">
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
  renderUsersSkeleton(root.querySelector('#usr-table-wrap'));
  try {
    const { users } = await listUsers();
    _allUsers = sortUsersByEmail(users || []);
  } catch (err) {
    toast('error', err.message);
    _allUsers = [];
  }
  _applyAndRender(root);
}

/// AC-04/AC-05: custom branded dialog replaces window.confirm(); confirm -> PATCH active:false —
/// no reactivate flow in this feature's scope (matches the old cascade's own boundary).
async function _onDeactivate(root, user) {
  const ok = await showConfirm({
    title:        t('admin.users.confirm.deactivate_title').replace('{email}', user.email),
    body:         t('admin.users.confirm.deactivate_body'),
    confirmLabel: t('admin.users.action.deactivate'),
    cancelLabel:  t('admin.users.action.cancel'),
    destructive:  true,
  });
  if (!ok) return;

  try {
    await patchUser(user.email, { active: false });
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
}

export async function render(root) {
  _filter = { search: '', role: '', activeFilter: DEFAULT_ACTIVE_FILTER };
  root.innerHTML = shellHtml();
  root.querySelector('#usr-filter-bar').innerHTML = filterBarHtml(_filter);
  bindFilterBar(root);
  root.querySelector('#btn-add-user').addEventListener('click', () => {
    openAddUserModal({ onAdded: () => _reload(root) });
  });
  root.querySelector('#btn-view-audit-log').addEventListener('click', () => navigate('/admin/users/audit-log'));

  await _reload(root);
}
