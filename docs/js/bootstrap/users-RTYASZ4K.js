import {
  mountOverlay
} from "./chunk-AX6BHX2J.js";
import {
  editProfile
} from "./chunk-RIGQBLAR.js";
import {
  navigate
} from "./chunk-H2H4WJDI.js";
import {
  salesProfiles
} from "./chunk-T5ZHX2YX.js";
import {
  mountAgGrid
} from "./chunk-4WAHI6XV.js";
import "./chunk-7DW526V3.js";
import {
  t
} from "./chunk-5L442NSS.js";

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

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/users.js
var TOAST_MS = 4e3;
var _grid = null;
var _allUsers = [];
function getRepo() {
  return window.__vdg_repo;
}
function toast(type, message) {
  window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { type, message, duration: TOAST_MS } }));
}
function fmtDate(iso) {
  if (!iso) return "\u2014";
  return iso.slice(0, 10);
}
function buildColDefs(root) {
  return [
    { field: "email", headerName: t("email"), flex: 1 },
    { field: "name", headerName: t("name"), width: 160 },
    { field: "sales_code", headerName: t("admin.users.column.sales_code"), width: 100 },
    { field: "commission_pct_override", headerName: t("users.edit.field.commission_override"), width: 140 },
    {
      field: "last_login_at",
      headerName: t("users.column.last_login"),
      width: 130,
      valueFormatter: ({ value }) => fmtDate(value)
    },
    { headerName: t("common.col.actions"), width: 120, cellRenderer: (p) => _buildActionsCell(p.data, root) }
  ];
}
function _buildActionsCell(user, root) {
  const wrap = document.createElement("div");
  wrap.className = "flex gap-1 items-center h-full";
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
  _grid = mountAgGrid(container.querySelector(".ag-theme-quartz"), opts);
}
function applyFilters(users, search) {
  return users.filter((u) => {
    if (search && !`${u.email} ${u.name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
}
function _modalDeps() {
  return { getRepo, editProfile, toast, reload: _reload };
}
async function _reload(root) {
  _allUsers = await salesProfiles();
  _applyAndMount(root);
}
function _applyAndMount(root) {
  const search = root.querySelector("#usr-search")?.value || "";
  const rows = applyFilters(_allUsers, search);
  mountGrid(root.querySelector("#usr-grid"), rows, root);
  const countEl = root.querySelector("#usr-count");
  if (countEl) countEl.textContent = `${rows.length} / ${_allUsers.length}`;
}
async function render(root) {
  root.innerHTML = `
    <div class="p-6 max-w-[1600px] mx-auto space-y-4">
      <div class="flex items-center justify-between">
        <div class="text-lg font-semibold text-slate-900">H\u1ED3 s\u01A1 Sales</div>
      </div>
      <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600 flex items-center justify-between gap-3">
        <span>${t("manager.users.profile_only_notice")}</span>
        <button id="btn-goto-user-mgmt" class="shrink-0 text-blue-600 hover:underline">${t("manager.users.manage_link")}</button>
      </div>
      <div class="flex gap-3 flex-wrap">
        <input id="usr-search" placeholder="T\xECm email / t\xEAn\u2026"
               class="border rounded-lg px-3 py-1.5 text-xs w-56 text-slate-700" />
        <span id="usr-count" class="text-xs text-slate-400 self-center"></span>
      </div>
      <div id="usr-grid"></div>
    </div>`;
  root.querySelector("#usr-search").addEventListener("input", () => _applyAndMount(root));
  root.querySelector("#btn-goto-user-mgmt").addEventListener("click", () => navigate("/admin/users"));
  await _reload(root);
}
export {
  render
};
