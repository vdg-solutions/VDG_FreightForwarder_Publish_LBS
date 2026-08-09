// F-15-15 — Sales user management (/manager/users)

import { hasRole, ROLE_MANAGER } from '../../auth/auth-gate.js';
import { navigate }      from '../../router.js';
import {
  inviteSales, promoteToManager, disableUser, editProfile,
} from '../../operators/user-provisioning.js';
import { activeWorkspaceName } from '../../operators/workspace-registry.js';
import { t } from '../../i18n/index.js';
import { openEditModal, openInviteModal } from './users-modals.js';
import { auditRootSharing } from '../../operators/manager/root-sharing-audit.js';

const KIND_USER         = 'user';
const ROLE_ADMIN        = 'admin';
const ROLE_SALES        = 'sales';
const STATUS_ACTIVE     = 'active';
const STATUS_DISABLED   = 'disabled';
const STATUS_PENDING    = 'pending';
const TOAST_MS          = 4_000;

let _grid     = null;
let _allUsers = [];

function getRepo()     { return window.__vdg_repo; }
function getDriveApi() { return window.__vdg_drive_api; }

function toast(type, message) {
  window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type, message, duration: TOAST_MS } }));
}

// ── badge helpers ─────────────────────────────────────────────────────────────

const ROLE_LABEL_KEYS = {
  [ROLE_ADMIN]: 'topbar.role.manager',
  [ROLE_SALES]: 'topbar.role.sales',
};
const STATUS_LABEL_KEYS = {
  [STATUS_ACTIVE]:   'users.status.active',
  [STATUS_DISABLED]: 'users.status.disabled',
  [STATUS_PENDING]:  'users.status.pending',
};

function roleLabel(role) { return t(ROLE_LABEL_KEYS[role] || role); }
function statusLabel(status) { return t(STATUS_LABEL_KEYS[status] || status); }

function roleBadge(role) {
  const cls = role === ROLE_ADMIN
    ? 'bg-purple-100 text-purple-700'
    : 'bg-blue-100 text-blue-700';
  return `<span class="px-2 py-0.5 rounded text-xs font-medium ${cls}">${roleLabel(role)}</span>`;
}

function statusBadge(status) {
  const map = {
    [STATUS_ACTIVE]:   'bg-emerald-100 text-emerald-700',
    [STATUS_DISABLED]: 'bg-red-100 text-red-700',
    [STATUS_PENDING]:  'bg-amber-100 text-amber-700',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-600';
  return `<span class="px-2 py-0.5 rounded text-xs font-medium ${cls}">${statusLabel(status)}</span>`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return iso.slice(0, 10);
}

// ── grid ──────────────────────────────────────────────────────────────────────

function buildColDefs(root) {
  return [
    { field: 'email',        headerName: t('email'),       flex: 1 },
    { field: 'name',         headerName: t('name'),        width: 140 },
    { field: 'sales_code',   headerName: t('admin.users.column.user_prefix'), width: 80  },
    { field: 'role',         headerName: t('admin.users.column.role'), width: 110,
      cellRenderer: (p) => { const d = document.createElement('div'); d.innerHTML = roleBadge(p.value); return d; } },
    { field: 'status',       headerName: t('state'),       width: 100,
      cellRenderer: (p) => { const d = document.createElement('div'); d.innerHTML = statusBadge(p.value); return d; } },
    { field: 'invited_at',   headerName: t('users.column.invited_at'), width: 110,
      valueFormatter: ({ value }) => fmtDate(value) },
    { field: 'last_login_at', headerName: t('users.column.last_login'), width: 110,
      valueFormatter: ({ value }) => fmtDate(value) },
    { headerName: t('common.col.actions'), width: 260, cellRenderer: (p) => _buildActionsCell(p.data, root) },
  ];
}

function _buildActionsCell(user, root) {
  const wrap = document.createElement('div');
  wrap.className = 'flex gap-1 items-center h-full';

  const isDisabled = user.status === STATUS_DISABLED;
  const isAdmin    = user.role   === ROLE_ADMIN;

  // Promote / Demote — not shown for own account (edge case; keep simple)
  const promoteBtn = document.createElement('button');
  promoteBtn.textContent = isAdmin ? t('users.action.demote') : t('users.action.promote');
  promoteBtn.className   = `px-2 py-0.5 text-xs rounded ${isAdmin ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`;
  promoteBtn.onclick     = () => _onPromoteDemote(user, root);
  wrap.appendChild(promoteBtn);

  // Disable / Enable
  const disableBtn = document.createElement('button');
  disableBtn.textContent = isDisabled ? t('users.action.enable') : t('users.action.disable');
  disableBtn.className   = `px-2 py-0.5 text-xs rounded ${isDisabled ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`;
  disableBtn.onclick     = () => _onDisableEnable(user, root);
  wrap.appendChild(disableBtn);

  // Edit
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
  const g = new agGrid.Grid(container.querySelector('.ag-theme-quartz'), opts);
  _grid = g.gridOptions?.api || opts.api;
}

// ── filter ────────────────────────────────────────────────────────────────────

function applyFilters(users, search, roleF, statusF) {
  return users.filter((u) => {
    if (search && !`${u.email} ${u.name}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleF   && u.role   !== roleF)   return false;
    if (statusF && u.status !== statusF) return false;
    return true;
  });
}

// ── actions ───────────────────────────────────────────────────────────────────

async function _onPromoteDemote(user, root) {
  const repo     = getRepo();
  const driveApi = getDriveApi();
  if (!repo || !driveApi) { toast('error', t('users.error.repo_not_ready')); return; }

  try {
    if (user.role !== ROLE_ADMIN) {
      const wsRoot  = await driveApi.findWorkspaceRoot(activeWorkspaceName());
      const adminId = wsRoot ? (await driveApi.findFolder(wsRoot, 'admin'))?.id : null;
      if (!adminId) throw new Error('admin folder not found');
      await promoteToManager(user.id, driveApi, repo, adminId);
      toast('success', t('users.toast.promoted', { email: user.email }));
    } else {
      // Demote: just update role back to sales
      await repo.put(KIND_USER, user.id, { ...user, role: ROLE_SALES });
      toast('success', t('users.toast.demoted', { email: user.email }));
    }
    await _reload(root);
  } catch (err) {
    toast('error', t('users.error.promote_demote_failed', { msg: err.message }));
  }
}

async function _onDisableEnable(user, root) {
  const repo     = getRepo();
  const driveApi = getDriveApi();
  if (!repo || !driveApi) { toast('error', t('users.error.repo_not_ready')); return; }

  try {
    if (user.status !== STATUS_DISABLED) {
      await disableUser(user.id, driveApi, repo);
      toast('success', t('users.toast.disabled', { email: user.email }));
    } else {
      // Re-enable: restore permission + set active
      if (user.folder_id) {
        const perm = await driveApi.putPermission(user.folder_id, user.email, 'writer');
        await repo.put(KIND_USER, user.id, {
          ...user, status: STATUS_ACTIVE, disabled_at: null, permission_id: perm.id,
        });
      } else {
        await repo.put(KIND_USER, user.id, { ...user, status: STATUS_ACTIVE, disabled_at: null });
      }
      toast('success', t('users.toast.enabled', { email: user.email }));
    }
    await _reload(root);
  } catch (err) {
    toast('error', t('users.error.disable_enable_failed', { msg: err.message }));
  }
}

// ── modal deps ────────────────────────────────────────────────────────────────

function _modalDeps() {
  return { getRepo, getDriveApi, editProfile, inviteSales, activeWorkspaceName, toast, reload: _reload };
}

// ── load + reload ─────────────────────────────────────────────────────────────

async function _reload(root) {
  const repo = getRepo();
  _allUsers  = repo ? await repo.list(KIND_USER, null) : [];
  _applyAndMount(root);
}

function _applyAndMount(root) {
  const search  = root.querySelector('#usr-search')?.value  || '';
  const roleF   = root.querySelector('#usr-role')?.value    || '';
  const statusF = root.querySelector('#usr-status')?.value  || '';
  const rows    = applyFilters(_allUsers, search, roleF, statusF);
  mountGrid(root.querySelector('#usr-grid'), rows, root);
  const countEl = root.querySelector('#usr-count');
  if (countEl) countEl.textContent = `${rows.length} / ${_allUsers.length}`;
}

// ── entry point ───────────────────────────────────────────────────────────────

// #20: access on the workspace ROOT is access on admin/users.jsonl — the ACL itself — because
// Drive inherits permissions downward, so the holder can promote themselves. The app's own grants
// (resolve_grants in the Rust protection table) only ever reach users/{prefix} and _shared/*, so
// anything sitting on the root came from a manual folder share. #23 reverted the #22 attempt to
// exempt Manager/Auditor: that read a dead role-drive-acl.json row and hid exactly the account a
// self-promoting Editor would be holding.
async function _renderRootSharingWarning(root) {
  const driveApi = getDriveApi();
  const slot     = root.querySelector('#usr-root-sharing');
  if (!driveApi || !slot) return;
  try {
    const rootId = await driveApi.findWorkspaceRoot(activeWorkspaceName());
    const shared = await auditRootSharing(driveApi, rootId);
    if (shared.length === 0 || !slot.isConnected) return;
    const rows = shared
      .map((s) => `<li>${s.email} — <span class="font-medium">${s.role}</span></li>`)
      .join('');
    slot.innerHTML = `
      <div class="border border-amber-300 bg-amber-50 rounded-lg p-3 text-xs text-amber-900">
        <div class="font-semibold">⚠️ ${t('root_sharing.warn_title')}</div>
        <div class="mt-1">${t('root_sharing.warn_body')}</div>
        <ul class="mt-2 list-disc list-inside">${rows}</ul>
      </div>`;
  } catch (err) {
    console.warn('[users] root sharing audit skipped:', err.message); // DEV — never block the grid
  }
}

export async function render(root) {
  if (!hasRole(ROLE_MANAGER)) { navigate('/dashboard'); return; }

  root.innerHTML = `
    <div class="p-6 max-w-[1400px] mx-auto space-y-4">
      <div class="flex items-center justify-between">
        <div class="text-lg font-semibold text-slate-900">Người dùng</div>
        <button id="btn-invite"
                class="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700">
          + Mời Sales
        </button>
      </div>
      <div class="flex gap-3 flex-wrap">
        <input id="usr-search" placeholder="Tìm email / tên…"
               class="border rounded-lg px-3 py-1.5 text-xs w-56 text-slate-700" />
        <select id="usr-role" class="border rounded-lg px-3 py-1.5 text-xs text-slate-700">
          <option value="">Tất cả role</option>
          <option value="${ROLE_SALES}">${roleLabel(ROLE_SALES)}</option>
          <option value="${ROLE_ADMIN}">${roleLabel(ROLE_ADMIN)}</option>
        </select>
        <select id="usr-status" class="border rounded-lg px-3 py-1.5 text-xs text-slate-700">
          <option value="">Tất cả trạng thái</option>
          <option value="${STATUS_ACTIVE}">${statusLabel(STATUS_ACTIVE)}</option>
          <option value="${STATUS_DISABLED}">${statusLabel(STATUS_DISABLED)}</option>
          <option value="${STATUS_PENDING}">${statusLabel(STATUS_PENDING)}</option>
        </select>
        <span id="usr-count" class="text-xs text-slate-400 self-center"></span>
      </div>
      <div id="usr-root-sharing"></div>
      <div id="usr-grid"></div>
    </div>`;

  _renderRootSharingWarning(root);

  root.querySelector('#btn-invite').addEventListener('click', () => openInviteModal(root, _modalDeps()));

  root.querySelector('#usr-search').addEventListener('input',  () => _applyAndMount(root));
  root.querySelector('#usr-role').addEventListener('change',   () => _applyAndMount(root));
  root.querySelector('#usr-status').addEventListener('change', () => _applyAndMount(root));

  await _reload(root);
}
