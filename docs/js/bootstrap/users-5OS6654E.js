import {
  mountOverlay
} from "./chunk-AX6BHX2J.js";
import {
  disableUser,
  editProfile,
  inviteSales,
  promoteToManager
} from "./chunk-LLUXTOR5.js";
import {
  activeWorkspaceName
} from "./chunk-JDLBDPFG.js";
import {
  navigate
} from "./chunk-H2H4WJDI.js";
import "./chunk-EQL6UFHA.js";
import {
  ROLE_MANAGER
} from "./chunk-KXTXGKNK.js";
import {
  hasRole
} from "./chunk-B24LWBUG.js";
import {
  t
} from "./chunk-NPO6NGQC.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/users-modals.js
function openEditModal(user, root, deps) {
  const { getRepo: getRepo2, editProfile: editProfile2, toast: toast2, reload } = deps;
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 z-50 bg-black/40 flex items-center justify-center";
  overlay.innerHTML = `
    <div class="bg-white rounded-xl shadow-xl p-6 w-96 space-y-4">
      <div class="text-sm font-semibold text-slate-800">${t("users.edit.title", { email: user.email })}</div>
      <div class="space-y-3">
        <label class="block text-xs text-slate-600">${t("name")}
          <input id="ep-name" value="${user.name || ""}"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" />
        </label>
        <label class="block text-xs text-slate-600">${t("users.edit.field.sales_code")}
          <input id="ep-code" value="${user.sales_code || ""}"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" />
        </label>
        <label class="block text-xs text-slate-600">${t("users.edit.field.commission_override")}
          <input id="ep-comm" type="number" step="0.1" value="${user.commission_pct_override ?? ""}"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" />
        </label>
      </div>
      <div id="ep-err" class="text-xs text-red-600 hidden"></div>
      <div class="flex gap-2 justify-end">
        <button id="ep-cancel" class="px-3 py-1.5 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200">${t("common.action.cancel")}</button>
        <button id="ep-save"   class="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">${t("common.action.save")}</button>
      </div>
    </div>`;
  mountOverlay(overlay);
  overlay.querySelector("#ep-cancel").onclick = () => overlay.remove();
  overlay.querySelector("#ep-save").onclick = async () => {
    const repo = getRepo2();
    const fields = {
      name: overlay.querySelector("#ep-name").value.trim(),
      sales_code: overlay.querySelector("#ep-code").value.trim(),
      commission_pct_override: overlay.querySelector("#ep-comm").value !== "" ? Number(overlay.querySelector("#ep-comm").value) : void 0
    };
    Object.keys(fields).forEach((k) => fields[k] === void 0 && delete fields[k]);
    try {
      await editProfile2(user.id, fields, repo);
      overlay.remove();
      toast2("success", t("users.toast.profile_updated"));
      await reload(root);
    } catch (err) {
      overlay.querySelector("#ep-err").textContent = err.message;
      overlay.querySelector("#ep-err").classList.remove("hidden");
    }
  };
}
function openInviteModal(root, deps) {
  const { getRepo: getRepo2, getDriveApi: getDriveApi2, inviteSales: inviteSales2, activeWorkspaceName: activeWorkspaceName2, toast: toast2, reload } = deps;
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 z-50 bg-black/40 flex items-center justify-center";
  overlay.innerHTML = `
    <div class="bg-white rounded-xl shadow-xl p-6 w-96 space-y-4">
      <div class="text-sm font-semibold text-slate-800">${t("users.invite.modal_title")}</div>
      <div class="space-y-3">
        <label class="block text-xs text-slate-600">${t("email")}
          <input id="inv-email" type="email" placeholder="sales@company.com"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" />
        </label>
        <label class="block text-xs text-slate-600">${t("admin.users.column.display_name")}
          <input id="inv-name" placeholder="Nguy\u1EC5n V\u0103n A"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" />
        </label>
      </div>
      <div id="inv-err" class="text-xs text-red-600 hidden"></div>
      <div class="flex gap-2 justify-end">
        <button id="inv-cancel" class="px-3 py-1.5 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200">${t("common.action.cancel")}</button>
        <button id="inv-send"   class="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">${t("users.action.invite")}</button>
      </div>
    </div>`;
  mountOverlay(overlay);
  overlay.querySelector("#inv-cancel").onclick = () => overlay.remove();
  overlay.querySelector("#inv-send").onclick = async () => {
    const email = overlay.querySelector("#inv-email").value.trim();
    const name = overlay.querySelector("#inv-name").value.trim();
    if (!email) {
      overlay.querySelector("#inv-err").textContent = t("admin.users.error.email_required");
      overlay.querySelector("#inv-err").classList.remove("hidden");
      return;
    }
    const repo = getRepo2();
    const driveApi = getDriveApi2();
    const wsRoot = driveApi ? await driveApi.findWorkspaceRoot(activeWorkspaceName2()) : null;
    if (!repo || !driveApi || !wsRoot) {
      overlay.querySelector("#inv-err").textContent = t("users.error.workspace_not_ready");
      overlay.querySelector("#inv-err").classList.remove("hidden");
      return;
    }
    overlay.querySelector("#inv-send").disabled = true;
    try {
      await inviteSales2(email, name, driveApi, repo, wsRoot);
      overlay.remove();
      toast2("success", t("users.toast.invited", { email }));
      await reload(root);
    } catch (err) {
      overlay.querySelector("#inv-err").textContent = err.message;
      overlay.querySelector("#inv-err").classList.remove("hidden");
      overlay.querySelector("#inv-send").disabled = false;
    }
  };
}

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/users.js
var KIND_USER = "user";
var ROLE_ADMIN = "admin";
var ROLE_SALES = "sales";
var STATUS_ACTIVE = "active";
var STATUS_DISABLED = "disabled";
var STATUS_PENDING = "pending";
var TOAST_MS = 4e3;
var _grid = null;
var _allUsers = [];
function getRepo() {
  return window.__vdg_repo;
}
function getDriveApi() {
  return window.__vdg_drive_api;
}
function toast(type, message) {
  window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { type, message, duration: TOAST_MS } }));
}
var ROLE_LABEL_KEYS = {
  [ROLE_ADMIN]: "topbar.role.manager",
  [ROLE_SALES]: "topbar.role.sales"
};
var STATUS_LABEL_KEYS = {
  [STATUS_ACTIVE]: "users.status.active",
  [STATUS_DISABLED]: "users.status.disabled",
  [STATUS_PENDING]: "users.status.pending"
};
function roleLabel(role) {
  return t(ROLE_LABEL_KEYS[role] || role);
}
function statusLabel(status) {
  return t(STATUS_LABEL_KEYS[status] || status);
}
function roleBadge(role) {
  const cls = role === ROLE_ADMIN ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700";
  return `<span class="px-2 py-0.5 rounded text-xs font-medium ${cls}">${roleLabel(role)}</span>`;
}
function statusBadge(status) {
  const map = {
    [STATUS_ACTIVE]: "bg-emerald-100 text-emerald-700",
    [STATUS_DISABLED]: "bg-red-100 text-red-700",
    [STATUS_PENDING]: "bg-amber-100 text-amber-700"
  };
  const cls = map[status] || "bg-slate-100 text-slate-600";
  return `<span class="px-2 py-0.5 rounded text-xs font-medium ${cls}">${statusLabel(status)}</span>`;
}
function fmtDate(iso) {
  if (!iso) return "\u2014";
  return iso.slice(0, 10);
}
function buildColDefs(root) {
  return [
    { field: "email", headerName: t("email"), flex: 1 },
    { field: "name", headerName: t("name"), width: 140 },
    { field: "sales_code", headerName: t("admin.users.column.fork"), width: 80 },
    {
      field: "role",
      headerName: t("admin.users.column.role"),
      width: 110,
      cellRenderer: (p) => {
        const d = document.createElement("div");
        d.innerHTML = roleBadge(p.value);
        return d;
      }
    },
    {
      field: "status",
      headerName: t("state"),
      width: 100,
      cellRenderer: (p) => {
        const d = document.createElement("div");
        d.innerHTML = statusBadge(p.value);
        return d;
      }
    },
    {
      field: "invited_at",
      headerName: t("users.column.invited_at"),
      width: 110,
      valueFormatter: ({ value }) => fmtDate(value)
    },
    {
      field: "last_login_at",
      headerName: t("users.column.last_login"),
      width: 110,
      valueFormatter: ({ value }) => fmtDate(value)
    },
    { headerName: t("common.col.actions"), width: 260, cellRenderer: (p) => _buildActionsCell(p.data, root) }
  ];
}
function _buildActionsCell(user, root) {
  const wrap = document.createElement("div");
  wrap.className = "flex gap-1 items-center h-full";
  const isDisabled = user.status === STATUS_DISABLED;
  const isAdmin = user.role === ROLE_ADMIN;
  const promoteBtn = document.createElement("button");
  promoteBtn.textContent = isAdmin ? t("users.action.demote") : t("users.action.promote");
  promoteBtn.className = `px-2 py-0.5 text-xs rounded ${isAdmin ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-purple-50 text-purple-700 hover:bg-purple-100"}`;
  promoteBtn.onclick = () => _onPromoteDemote(user, root);
  wrap.appendChild(promoteBtn);
  const disableBtn = document.createElement("button");
  disableBtn.textContent = isDisabled ? t("users.action.enable") : t("users.action.disable");
  disableBtn.className = `px-2 py-0.5 text-xs rounded ${isDisabled ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-red-50 text-red-700 hover:bg-red-100"}`;
  disableBtn.onclick = () => _onDisableEnable(user, root);
  wrap.appendChild(disableBtn);
  const editBtn = document.createElement("button");
  editBtn.textContent = t("common.action.edit");
  editBtn.className = "px-2 py-0.5 text-xs rounded bg-slate-50 text-slate-700 hover:bg-slate-100";
  editBtn.onclick = () => openEditModal(user, root, _modalDeps());
  wrap.appendChild(editBtn);
  return wrap;
}
function mountGrid(container, rows, root) {
  if (_grid) {
    try {
      _grid.destroy();
    } catch {
    }
    _grid = null;
  }
  container.innerHTML = '<div class="ag-theme-quartz" style="height:420px"></div>';
  if (!window.agGrid) return;
  const opts = {
    columnDefs: buildColDefs(root),
    rowData: rows,
    defaultColDef: { sortable: true, resizable: true, filter: true }
  };
  const g = new agGrid.Grid(container.querySelector(".ag-theme-quartz"), opts);
  _grid = g.gridOptions?.api || opts.api;
}
function applyFilters(users, search, roleF, statusF) {
  return users.filter((u) => {
    if (search && !`${u.email} ${u.name}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleF && u.role !== roleF) return false;
    if (statusF && u.status !== statusF) return false;
    return true;
  });
}
async function _onPromoteDemote(user, root) {
  const repo = getRepo();
  const driveApi = getDriveApi();
  if (!repo || !driveApi) {
    toast("error", t("users.error.repo_not_ready"));
    return;
  }
  try {
    if (user.role !== ROLE_ADMIN) {
      const wsRoot = await driveApi.findWorkspaceRoot(activeWorkspaceName());
      const adminId = wsRoot ? (await driveApi.findFolder(wsRoot, "admin"))?.id : null;
      if (!adminId) throw new Error("admin folder not found");
      await promoteToManager(user.id, driveApi, repo, adminId);
      toast("success", t("users.toast.promoted", { email: user.email }));
    } else {
      await repo.put(KIND_USER, user.id, { ...user, role: ROLE_SALES });
      toast("success", t("users.toast.demoted", { email: user.email }));
    }
    await _reload(root);
  } catch (err) {
    toast("error", t("users.error.promote_demote_failed", { msg: err.message }));
  }
}
async function _onDisableEnable(user, root) {
  const repo = getRepo();
  const driveApi = getDriveApi();
  if (!repo || !driveApi) {
    toast("error", t("users.error.repo_not_ready"));
    return;
  }
  try {
    if (user.status !== STATUS_DISABLED) {
      await disableUser(user.id, driveApi, repo);
      toast("success", t("users.toast.disabled", { email: user.email }));
    } else {
      if (user.folder_id) {
        const perm = await driveApi.putPermission(user.folder_id, user.email, "writer");
        await repo.put(KIND_USER, user.id, {
          ...user,
          status: STATUS_ACTIVE,
          disabled_at: null,
          permission_id: perm.id
        });
      } else {
        await repo.put(KIND_USER, user.id, { ...user, status: STATUS_ACTIVE, disabled_at: null });
      }
      toast("success", t("users.toast.enabled", { email: user.email }));
    }
    await _reload(root);
  } catch (err) {
    toast("error", t("users.error.disable_enable_failed", { msg: err.message }));
  }
}
function _modalDeps() {
  return { getRepo, getDriveApi, editProfile, inviteSales, activeWorkspaceName, toast, reload: _reload };
}
async function _reload(root) {
  const repo = getRepo();
  _allUsers = repo ? await repo.list(KIND_USER, null) : [];
  _applyAndMount(root);
}
function _applyAndMount(root) {
  const search = root.querySelector("#usr-search")?.value || "";
  const roleF = root.querySelector("#usr-role")?.value || "";
  const statusF = root.querySelector("#usr-status")?.value || "";
  const rows = applyFilters(_allUsers, search, roleF, statusF);
  mountGrid(root.querySelector("#usr-grid"), rows, root);
  const countEl = root.querySelector("#usr-count");
  if (countEl) countEl.textContent = `${rows.length} / ${_allUsers.length}`;
}
async function render(root) {
  if (!hasRole(ROLE_MANAGER)) {
    navigate("/dashboard");
    return;
  }
  root.innerHTML = `
    <div class="p-6 max-w-[1400px] mx-auto space-y-4">
      <div class="flex items-center justify-between">
        <div class="text-lg font-semibold text-slate-900">Ng\u01B0\u1EDDi d\xF9ng</div>
        <button id="btn-invite"
                class="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700">
          + M\u1EDDi Sales
        </button>
      </div>
      <div class="flex gap-3 flex-wrap">
        <input id="usr-search" placeholder="T\xECm email / t\xEAn\u2026"
               class="border rounded-lg px-3 py-1.5 text-xs w-56 text-slate-700" />
        <select id="usr-role" class="border rounded-lg px-3 py-1.5 text-xs text-slate-700">
          <option value="">T\u1EA5t c\u1EA3 role</option>
          <option value="${ROLE_SALES}">${roleLabel(ROLE_SALES)}</option>
          <option value="${ROLE_ADMIN}">${roleLabel(ROLE_ADMIN)}</option>
        </select>
        <select id="usr-status" class="border rounded-lg px-3 py-1.5 text-xs text-slate-700">
          <option value="">T\u1EA5t c\u1EA3 tr\u1EA1ng th\xE1i</option>
          <option value="${STATUS_ACTIVE}">${statusLabel(STATUS_ACTIVE)}</option>
          <option value="${STATUS_DISABLED}">${statusLabel(STATUS_DISABLED)}</option>
          <option value="${STATUS_PENDING}">${statusLabel(STATUS_PENDING)}</option>
        </select>
        <span id="usr-count" class="text-xs text-slate-400 self-center"></span>
      </div>
      <div id="usr-grid"></div>
    </div>`;
  root.querySelector("#btn-invite").addEventListener("click", () => openInviteModal(root, _modalDeps()));
  root.querySelector("#usr-search").addEventListener("input", () => _applyAndMount(root));
  root.querySelector("#usr-role").addEventListener("change", () => _applyAndMount(root));
  root.querySelector("#usr-status").addEventListener("change", () => _applyAndMount(root));
  await _reload(root);
}
export {
  render
};
