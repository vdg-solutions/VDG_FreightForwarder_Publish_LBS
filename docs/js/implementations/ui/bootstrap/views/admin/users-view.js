// Admin Users view — F-24-04. Manager-only /admin/users: table + filter/search + Add/Edit/
// Deactivate/Reactivate. F-46-03: reads/writes go straight to GET/POST/PATCH /api/users — no
// wasm-bound repo to wait on, so the F-24-25 "cold-boot deep link" retry this view used to need is
// gone with it.
//
// E-37: a deactivated account keeps its grant row forever (soft-deactivate, never a hard delete —
// a user who ever touched a record must stay resolvable), so BOTH active and deactivated rows are
// read and the status filter narrows the view — the server refuses that read to anyone but a
// Manager/owner, same gate as the writes below.
//
// The view holds NO rows. It names a filter and gets back the matching users plus the table's own
// size; `refresh: true` is this screen saying its copy is stale. It used to fetch the staff table
// itself into `_allUsers` and hand it back in for every keystroke.

import { navigate }  from '../../router.js';
import { t }         from '../../../../kernel/core_abstractions/i18n/index.js';
import { listUsersFiltered } from '../../../core_abstractions/ports/manager/users-view-composer.js';
import { filterBarHtml, renderUsersTable, renderUsersSkeleton, bindRowActions } from './users-list.js';
import { openAddUserModal }  from './user-add-modal.js';
import { openEditUserModal } from './user-edit-modal.js';
import { showConfirm }       from '../../helpers/show-confirm.js';
import { patchUser } from '../../../../storage/core_abstractions/user-directory.js';
import { usersErrorMessage } from './users-error-message.js';
// Affordance only — the server (default_policy.cedar) is the authority and 403s regardless;
// this just keeps a Manager without the HumanResources hat from staring at buttons that always
// fail. Decision comes from the same Rust action policy every other screen's can() reaches
// (action_policy.rs via governance_action_guard), never a role-name string compared here.
import { can } from '../../../core_abstractions/ports/governance/action-guard.js';
import { bindEmptyStateActions } from '../../components/empty-state.js';

const TOAST_MS = 4_000;
const DEFAULT_ACTIVE_FILTER = '';

let _filter = { search: '', role: '', activeFilter: DEFAULT_ACTIVE_FILTER };

function toast(type, message) {
  window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type, message, duration: TOAST_MS } }));
}

function shellHtml() {
  return `
    <div class="p-6 max-w-[1600px] mx-auto space-y-4">
      <div class="flex items-center justify-between">
        <div class="text-lg font-semibold text-slate-900">${t('admin.users.title')}</div>
        <div class="flex gap-2">
          ${can('user.audit.read') ? `
          <button id="btn-view-audit-log" class="px-4 py-2 text-xs rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">
            ${t('admin.users.audit_log.link_text')}
          </button>` : ''}
          ${can('user.create') ? `
          <button id="btn-add-user" class="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            ${t('admin.users.add_button')}
          </button>` : ''}
        </div>
      </div>
      <div id="usr-filter-bar"></div>
      <div id="usr-table-wrap"></div>
    </div>`;
}

async function _applyAndRender(root, refresh = false) {
  const reply = await listUsersFiltered({ ..._filter, refresh });
  const wrap  = root.querySelector('#usr-table-wrap');
  if (!reply.ok) {
    toast('error', reply.error);
  }
  const rows = reply.ok ? reply.users : [];
  // The reply's own ok/total ride through: an unreadable table and a filter that matched nothing
  // are different answers, and the empty branch is the only place that can still tell them apart.
  renderUsersTable(wrap, rows, reply);
  bindRowActions(wrap, rows, {
    onEdit:       (user) => openEditUserModal(user, { onSaved: () => _reload(root) }),
    onDeactivate: (user) => _onDeactivate(root, user),
    onReactivate: (user) => openEditUserModal(user, { reactivate: true, onSaved: () => _reload(root) }),
  });
  const countEl = root.querySelector('#usr-count');
  if (countEl) countEl.textContent = reply.ok ? `${rows.length} / ${reply.total}` : '';
}

/// A write happened, or the screen just mounted: the snapshot behind the filter is stale.
async function _reload(root) {
  renderUsersSkeleton(root.querySelector('#usr-table-wrap'));
  await _applyAndRender(root, true);
}

/// AC-04/AC-05: custom branded dialog replaces window.confirm(); confirm -> PATCH active:false.
/// Reversible from this same screen: the Reactivate action on a deactivated row (bindRowActions
/// below) opens the edit modal in reactivate mode and PATCHes roles back on.
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
    toast('error', usersErrorMessage(err));
  }
}

function bindFilterBar(root) {
  // No `refresh`: filtering re-asks the snapshot wasm already holds, so a keystroke is not a fetch.
  root.querySelector('#usr-search')?.addEventListener('input', (e) => {
    _filter.search = e.target.value;
    _applyAndRender(root);
  });
  root.querySelector('#usr-role')?.addEventListener('change', (e) => {
    _filter.role = e.target.value;
    _applyAndRender(root);
  });
  root.querySelector('#usr-status')?.addEventListener('change', (e) => {
    _filter.activeFilter = e.target.value;
    _applyAndRender(root);
  });
}

/// The empty-state card carries real buttons (clear filter / retry). Unbound they would be
/// placebos — an affordance that admits it changes nothing is worse than no affordance.
function bindEmptyState(root) {
  bindEmptyStateActions(root, {
    onClearFilter: () => {
      _filter = { search: '', role: '', activeFilter: DEFAULT_ACTIVE_FILTER };
      root.querySelector('#usr-filter-bar').innerHTML = filterBarHtml(_filter);
      bindFilterBar(root);
      _applyAndRender(root);
    },
    onRetry: () => _reload(root),
  });
}

export async function render(root) {
  _filter = { search: '', role: '', activeFilter: DEFAULT_ACTIVE_FILTER };
  root.innerHTML = shellHtml();
  root.querySelector('#usr-filter-bar').innerHTML = filterBarHtml(_filter);
  bindFilterBar(root);
  bindEmptyState(root);
  // Buttons render only when can() admits the action (shellHtml above) — optional chaining here
  // is what a hidden button (no element to bind) needs, not a second permission decision.
  root.querySelector('#btn-add-user')?.addEventListener('click', () => {
    openAddUserModal({ onAdded: () => _reload(root) });
  });
  root.querySelector('#btn-view-audit-log')?.addEventListener('click', () => navigate('/admin/users/audit-log'));

  await _reload(root);
}
