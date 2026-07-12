// F-15-15 — Sales user management (/manager/users)

import { isManager }     from '../../auth/auth-gate.js';
import { navigate }      from '../../router.js';
import {
  inviteSales, promoteToManager, disableUser, editProfile,
} from '../../operators/user-provisioning.js';
import { activeWorkspaceName } from '../../operators/workspace-registry.js';

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

function roleBadge(role) {
  const cls = role === ROLE_ADMIN
    ? 'bg-purple-100 text-purple-700'
    : 'bg-blue-100 text-blue-700';
  return `<span class="px-2 py-0.5 rounded text-xs font-medium ${cls}">${role}</span>`;
}

function statusBadge(status) {
  const map = {
    [STATUS_ACTIVE]:   'bg-emerald-100 text-emerald-700',
    [STATUS_DISABLED]: 'bg-red-100 text-red-700',
    [STATUS_PENDING]:  'bg-amber-100 text-amber-700',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-600';
  return `<span class="px-2 py-0.5 rounded text-xs font-medium ${cls}">${status}</span>`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return iso.slice(0, 10);
}

// ── grid ──────────────────────────────────────────────────────────────────────

function buildColDefs(root) {
  return [
    { field: 'email',        headerName: 'Email',       flex: 1 },
    { field: 'name',         headerName: 'Name',        width: 140 },
    { field: 'sales_code',   headerName: 'Code',        width: 80  },
    { field: 'role',         headerName: 'Role',        width: 110,
      cellRenderer: (p) => { const d = document.createElement('div'); d.innerHTML = roleBadge(p.value); return d; } },
    { field: 'status',       headerName: 'Status',      width: 100,
      cellRenderer: (p) => { const d = document.createElement('div'); d.innerHTML = statusBadge(p.value); return d; } },
    { field: 'invited_at',   headerName: 'Invited',     width: 110,
      valueFormatter: ({ value }) => fmtDate(value) },
    { field: 'last_login_at', headerName: 'Last Login', width: 110,
      valueFormatter: ({ value }) => fmtDate(value) },
    { headerName: 'Actions', width: 260, cellRenderer: (p) => _buildActionsCell(p.data, root) },
  ];
}

function _buildActionsCell(user, root) {
  const wrap = document.createElement('div');
  wrap.className = 'flex gap-1 items-center h-full';

  const isDisabled = user.status === STATUS_DISABLED;
  const isAdmin    = user.role   === ROLE_ADMIN;

  // Promote / Demote — not shown for own account (edge case; keep simple)
  const promoteBtn = document.createElement('button');
  promoteBtn.textContent = isAdmin ? 'Demote' : 'Promote';
  promoteBtn.className   = `px-2 py-0.5 text-xs rounded ${isAdmin ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`;
  promoteBtn.onclick     = () => _onPromoteDemote(user, root);
  wrap.appendChild(promoteBtn);

  // Disable / Enable
  const disableBtn = document.createElement('button');
  disableBtn.textContent = isDisabled ? 'Enable' : 'Disable';
  disableBtn.className   = `px-2 py-0.5 text-xs rounded ${isDisabled ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`;
  disableBtn.onclick     = () => _onDisableEnable(user, root);
  wrap.appendChild(disableBtn);

  // Edit
  const editBtn = document.createElement('button');
  editBtn.textContent = 'Edit';
  editBtn.className   = 'px-2 py-0.5 text-xs rounded bg-slate-50 text-slate-700 hover:bg-slate-100';
  editBtn.onclick     = () => _openEditModal(user, root);
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
  if (!repo || !driveApi) { toast('error', 'Repo / DriveApi not ready'); return; }

  try {
    if (user.role !== ROLE_ADMIN) {
      const wsRoot  = await driveApi.findWorkspaceRoot(activeWorkspaceName());
      const adminId = wsRoot ? (await driveApi.findFolder(wsRoot, 'admin'))?.id : null;
      if (!adminId) throw new Error('admin folder not found');
      await promoteToManager(user.id, driveApi, repo, adminId);
      toast('success', `${user.email} promoted to manager`);
    } else {
      // Demote: just update role back to sales
      await repo.put(KIND_USER, user.id, { ...user, role: ROLE_SALES });
      toast('success', `${user.email} demoted to sales`);
    }
    await _reload(root);
  } catch (err) {
    toast('error', `Promote/Demote failed: ${err.message}`);
  }
}

async function _onDisableEnable(user, root) {
  const repo     = getRepo();
  const driveApi = getDriveApi();
  if (!repo || !driveApi) { toast('error', 'Repo / DriveApi not ready'); return; }

  try {
    if (user.status !== STATUS_DISABLED) {
      await disableUser(user.id, driveApi, repo);
      toast('success', `${user.email} disabled`);
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
      toast('success', `${user.email} re-enabled`);
    }
    await _reload(root);
  } catch (err) {
    toast('error', `Disable/Enable failed: ${err.message}`);
  }
}

function _openEditModal(user, root) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 bg-black/40 flex items-center justify-center';
  overlay.innerHTML = `
    <div class="bg-white rounded-xl shadow-xl p-6 w-96 space-y-4">
      <div class="text-sm font-semibold text-slate-800">Edit profile — ${user.email}</div>
      <div class="space-y-3">
        <label class="block text-xs text-slate-600">Name
          <input id="ep-name" value="${user.name || ''}"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" />
        </label>
        <label class="block text-xs text-slate-600">Sales code
          <input id="ep-code" value="${user.sales_code || ''}"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" />
        </label>
        <label class="block text-xs text-slate-600">Commission % override (leave blank = default)
          <input id="ep-comm" type="number" step="0.1" value="${user.commission_pct_override ?? ''}"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" />
        </label>
        <label class="block text-xs text-slate-600">Dunning threshold days override
          <input id="ep-dun" type="number" value="${user.dunning_threshold_days_override ?? ''}"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" />
        </label>
      </div>
      <div id="ep-err" class="text-xs text-red-600 hidden"></div>
      <div class="flex gap-2 justify-end">
        <button id="ep-cancel" class="px-3 py-1.5 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200">Cancel</button>
        <button id="ep-save"   class="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
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
      toast('success', 'Profile updated');
      await _reload(root);
    } catch (err) {
      overlay.querySelector('#ep-err').textContent = err.message;
      overlay.querySelector('#ep-err').classList.remove('hidden');
    }
  };
}

// ── invite modal ──────────────────────────────────────────────────────────────

function _openInviteModal(root) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 bg-black/40 flex items-center justify-center';
  overlay.innerHTML = `
    <div class="bg-white rounded-xl shadow-xl p-6 w-96 space-y-4">
      <div class="text-sm font-semibold text-slate-800">Invite Sales</div>
      <div class="space-y-3">
        <label class="block text-xs text-slate-600">Email
          <input id="inv-email" type="email" placeholder="sales@company.com"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" />
        </label>
        <label class="block text-xs text-slate-600">Display name
          <input id="inv-name" placeholder="Nguyễn Văn A"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" />
        </label>
      </div>
      <div id="inv-err" class="text-xs text-red-600 hidden"></div>
      <div class="flex gap-2 justify-end">
        <button id="inv-cancel" class="px-3 py-1.5 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200">Cancel</button>
        <button id="inv-send"   class="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">Invite</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  overlay.querySelector('#inv-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#inv-send').onclick   = async () => {
    const email = overlay.querySelector('#inv-email').value.trim();
    const name  = overlay.querySelector('#inv-name').value.trim();
    if (!email) { overlay.querySelector('#inv-err').textContent = 'Email required'; overlay.querySelector('#inv-err').classList.remove('hidden'); return; }

    const repo     = getRepo();
    const driveApi = getDriveApi();
    const wsRoot   = driveApi ? await driveApi.findWorkspaceRoot(activeWorkspaceName()) : null;
    if (!repo || !driveApi || !wsRoot) {
      overlay.querySelector('#inv-err').textContent = 'Workspace not ready';
      overlay.querySelector('#inv-err').classList.remove('hidden');
      return;
    }

    overlay.querySelector('#inv-send').disabled = true;
    try {
      await inviteSales(email, name, driveApi, repo, wsRoot);
      overlay.remove();
      toast('success', `${email} invited`);
      await _reload(root);
    } catch (err) {
      overlay.querySelector('#inv-err').textContent = err.message;
      overlay.querySelector('#inv-err').classList.remove('hidden');
      overlay.querySelector('#inv-send').disabled = false;
    }
  };
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

export async function render(root) {
  if (!isManager()) { navigate('/dashboard'); return; }

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
          <option value="${ROLE_SALES}">Sales</option>
          <option value="${ROLE_ADMIN}">Admin</option>
        </select>
        <select id="usr-status" class="border rounded-lg px-3 py-1.5 text-xs text-slate-700">
          <option value="">Tất cả trạng thái</option>
          <option value="${STATUS_ACTIVE}">Active</option>
          <option value="${STATUS_DISABLED}">Disabled</option>
          <option value="${STATUS_PENDING}">Pending</option>
        </select>
        <span id="usr-count" class="text-xs text-slate-400 self-center"></span>
      </div>
      <div id="usr-grid"></div>
    </div>`;

  root.querySelector('#btn-invite').addEventListener('click', () => _openInviteModal(root));

  root.querySelector('#usr-search').addEventListener('input',  () => _applyAndMount(root));
  root.querySelector('#usr-role').addEventListener('change',   () => _applyAndMount(root));
  root.querySelector('#usr-status').addEventListener('change', () => _applyAndMount(root));

  await _reload(root);
}
