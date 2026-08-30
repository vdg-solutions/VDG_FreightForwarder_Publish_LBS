// F-15-15 — Sales rep PROFILE editor (/manager/users): sales_code, commission overrides.
//
// F-46-04: this screen used to also invite/promote/disable through a wasm write into the "user"
// collection — a table the server's RoleResolver never reads (see
// core_abstractions/ports/flows/user-provisioning.js for the full story). That gave a green toast
// for a role change that never took effect. Role and access management now live only at
// /admin/users (POST/PATCH /api/users -> "grants", the collection the server actually authorizes
// from) — this screen keeps the one job that was never duplicated there: the rep's own profile
// fields. There is no live navigation entry to this route (removed from sidebar.js's menu); it is
// reachable by direct URL for a manager who still needs to fix a sales_code or commission
// override.
//
// Both /admin/users and this route are Manager-only (access_policy.rs), so the manager landing
// here already has full reach to /admin/users -- there is no persona that can create/deactivate a
// user and yet gets stuck on this screen. The notice banner just says so instead of leaving what
// reads like a dead-end list with no add/delete of its own.

import { editProfile } from '../../../core_abstractions/ports/flows/user-provisioning.js';
import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { mountAgGrid } from '../../../../kernel/core_abstractions/i18n/ag-grid-locale.js';
import { openEditModal } from './users-modals.js';
import { navigate } from '../../router.js';

const KIND_USER = 'user';
const TOAST_MS  = 4_000;

let _grid     = null;
let _allUsers = [];

function getRepo() { return window.__vdg_repo; }

function toast(type, message) {
  window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type, message, duration: TOAST_MS } }));
}

function fmtDate(iso) {
  if (!iso) return '—';
  return iso.slice(0, 10);
}

// ── grid ──────────────────────────────────────────────────────────────────────

function buildColDefs(root) {
  return [
    { field: 'email',        headerName: t('email'),       flex: 1 },
    { field: 'name',         headerName: t('name'),        width: 160 },
    { field: 'sales_code',   headerName: t('admin.users.column.fork'), width: 100 },
    { field: 'commission_pct_override', headerName: t('users.edit.field.commission_override'), width: 140 },
    { field: 'last_login_at', headerName: t('users.column.last_login'), width: 130,
      valueFormatter: ({ value }) => fmtDate(value) },
    { headerName: t('common.col.actions'), width: 120, cellRenderer: (p) => _buildActionsCell(p.data, root) },
  ];
}

function _buildActionsCell(user, root) {
  const wrap = document.createElement('div');
  wrap.className = 'flex gap-1 items-center h-full';

  const editBtn = document.createElement('button');
  editBtn.textContent = t('common.action.edit');
  editBtn.className   = 'px-2 py-0.5 text-xs rounded bg-slate-50 text-slate-700 hover:bg-slate-100';
  editBtn.onclick     = () => openEditModal(user, root, _modalDeps());
  wrap.appendChild(editBtn);

  return wrap;
}

function mountGrid(container, rows, root) {
  if (_grid) { try { _grid.destroy(); } catch { /* ignore */ } _grid = null; }
  container.innerHTML = '<div class="ag-theme-quartz" style="height:420px"></div>';
  if (!window.agGrid) return;
  const opts = {
    columnDefs:    buildColDefs(root),
    rowData:       rows,
    defaultColDef: { sortable: true, resizable: true, filter: true },
  };
  _grid = mountAgGrid(container.querySelector('.ag-theme-quartz'), opts);
}

// ── filter ────────────────────────────────────────────────────────────────────

function applyFilters(users, search) {
  return users.filter((u) => {
    if (search && !`${u.email} ${u.name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
}

// ── modal deps ────────────────────────────────────────────────────────────────

function _modalDeps() {
  return { getRepo, editProfile, toast, reload: _reload };
}

// ── load + reload ─────────────────────────────────────────────────────────────

async function _reload(root) {
  const repo = getRepo();
  _allUsers  = repo ? await repo.list(KIND_USER, null) : [];
  _applyAndMount(root);
}

function _applyAndMount(root) {
  const search  = root.querySelector('#usr-search')?.value  || '';
  const rows    = applyFilters(_allUsers, search);
  mountGrid(root.querySelector('#usr-grid'), rows, root);
  const countEl = root.querySelector('#usr-count');
  if (countEl) countEl.textContent = `${rows.length} / ${_allUsers.length}`;
}

// ── entry point ───────────────────────────────────────────────────────────────

export async function render(root) {
  root.innerHTML = `
    <div class="p-6 max-w-[1600px] mx-auto space-y-4">
      <div class="flex items-center justify-between">
        <div class="text-lg font-semibold text-slate-900">Hồ sơ Sales</div>
      </div>
      <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600 flex items-center justify-between gap-3">
        <span>${t('manager.users.profile_only_notice')}</span>
        <button id="btn-goto-user-mgmt" class="shrink-0 text-blue-600 hover:underline">${t('manager.users.manage_link')}</button>
      </div>
      <div class="flex gap-3 flex-wrap">
        <input id="usr-search" placeholder="Tìm email / tên…"
               class="border rounded-lg px-3 py-1.5 text-xs w-56 text-slate-700" />
        <span id="usr-count" class="text-xs text-slate-400 self-center"></span>
      </div>
      <div id="usr-grid"></div>
    </div>`;

  root.querySelector('#usr-search').addEventListener('input', () => _applyAndMount(root));
  root.querySelector('#btn-goto-user-mgmt').addEventListener('click', () => navigate('/admin/users'));

  await _reload(root);
}
