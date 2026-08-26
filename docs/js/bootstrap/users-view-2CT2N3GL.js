import {
  mountOverlay
} from "./chunk-AX6BHX2J.js";
import {
  createUser,
  listUsers,
  patchUser
} from "./chunk-XVWG4BTC.js";
import {
  ROLE_LABEL_KEYS,
  ROLE_VALUES,
  filterUsers,
  isValidEmail,
  roleCheckboxesHtml,
  rolesFromForm,
  sortUsersByEmail
} from "./chunk-ABASRVXI.js";
import {
  navigate
} from "./chunk-H2H4WJDI.js";
import {
  showConfirm
} from "./chunk-OJHTNKBX.js";
import "./chunk-EQL6UFHA.js";
import {
  ROLE_MANAGER
} from "./chunk-KXTXGKNK.js";
import {
  hasRole
} from "./chunk-B24LWBUG.js";
import {
  t
} from "./chunk-MGTH6QM4.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/admin/users-list.js
var SKELETON_ROWS = 4;
function roleLabel(role) {
  return t(ROLE_LABEL_KEYS[role] || role);
}
function roleCell(user) {
  const [primary, ...rest] = (Array.isArray(user.roles) ? user.roles : []).filter(Boolean);
  if (!primary) return "\u2014";
  return roleLabel(primary) + rest.map((r) => `<span class="ml-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px]">${roleLabel(r)}</span>`).join("");
}
function filterBarHtml(filter) {
  const roleOptions = ROLE_VALUES.map((r) => `<option value="${r}" ${filter.role === r ? "selected" : ""}>${roleLabel(r)}</option>`).join("");
  return `
    <div class="flex gap-3 flex-wrap">
      <input id="usr-search" placeholder="${t("admin.users.filter.search_placeholder")}" value="${filter.search}"
             class="border rounded-lg px-3 py-1.5 text-xs w-56 text-slate-700" />
      <select id="usr-role" class="border rounded-lg px-3 py-1.5 text-xs text-slate-700">
        <option value="">${t("admin.users.filter.role_all")}</option>
        ${roleOptions}
      </select>
      <span id="usr-count" class="text-xs text-slate-400 self-center"></span>
    </div>`;
}
function renderUsersSkeleton(container) {
  if (!container) return;
  container.innerHTML = `
    <div aria-busy="true" aria-live="polite" aria-label="${t("admin.users.loading")}">
      <div class="h-10 bg-slate-200 animate-pulse rounded-t-lg"></div>
      ${Array.from({ length: SKELETON_ROWS }, () => '<div class="h-9 mt-px bg-slate-100 animate-pulse"></div>').join("")}
      <div class="h-9 mt-px bg-slate-100 animate-pulse rounded-b-lg"></div>
    </div>`;
}
function renderUsersTable(container, users) {
  if (!users.length) {
    container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400 border border-slate-200 rounded-lg">\u2014</div>`;
    return;
  }
  const rows = users.map((u) => `
    <tr class="border-t border-slate-100 text-xs" data-user-email="${u.email}">
      <td class="px-3 py-2">${u.email}</td>
      <td class="px-3 py-2">${u.display_name || ""}</td>
      <td class="px-3 py-2">${roleCell(u)}</td>
      <td class="px-3 py-2">
        <div class="flex gap-1">
          <button data-act="edit" class="px-2 py-0.5 text-[11px] rounded bg-slate-50 text-slate-700 hover:bg-slate-100">${t("admin.users.action.edit")}</button>
          <button data-act="deactivate" class="px-2 py-0.5 text-[11px] rounded bg-red-50 text-red-700 hover:bg-red-100">${t("admin.users.action.deactivate")}</button>
        </div>
      </td>
    </tr>`).join("");
  container.innerHTML = `
    <table class="w-full border border-slate-200 rounded-lg overflow-hidden">
      <thead class="bg-slate-50 text-[11px] text-slate-500 uppercase">
        <tr>
          <th class="px-3 py-2 text-left">${t("admin.users.column.email")}</th>
          <th class="px-3 py-2 text-left">${t("admin.users.column.display_name")}</th>
          <th class="px-3 py-2 text-left">${t("admin.users.column.role")}</th>
          <th class="px-3 py-2 text-left">${t("admin.users.column.actions")}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}
function bindRowActions(container, users, handlers) {
  container.querySelectorAll("tr[data-user-email]").forEach((tr) => {
    const user = users.find((u) => u.email === tr.dataset.userEmail);
    if (!user) return;
    tr.querySelector('[data-act="edit"]')?.addEventListener("click", () => handlers.onEdit(user));
    tr.querySelector('[data-act="deactivate"]')?.addEventListener("click", () => handlers.onDeactivate(user));
  });
}

// output/web/js.tmp/implementations/ui/bootstrap/views/admin/user-add-modal.js
function showError(overlay, message) {
  const err = overlay.querySelector("#add-err");
  err.textContent = message;
  err.classList.remove("hidden");
}
function openAddUserModal({ onAdded } = {}) {
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 z-50 bg-black/40 flex items-center justify-center";
  overlay.innerHTML = `
    <div class="bg-white rounded-xl shadow-xl p-6 w-96 space-y-4">
      <div class="text-sm font-semibold text-slate-800">${t("admin.users.modal.add_title")}</div>
      <div class="space-y-3">
        <label class="block text-xs text-slate-600">${t("admin.users.column.email")}
          <input id="add-email" type="email" placeholder="user@company.com"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" /></label>
        <label class="block text-xs text-slate-600">${t("admin.users.column.display_name")}
          <input id="add-name" class="mt-1 w-full border rounded px-3 py-1.5 text-xs" /></label>
        <div class="space-y-1">
          <div class="text-xs font-medium text-slate-700">${t("admin.users.column.role")}</div>
          <div class="text-[11px] text-slate-400">${t("admin.users.roles.hint")}</div>
          ${roleCheckboxesHtml([], (r) => t(ROLE_LABEL_KEYS[r] || r))}
        </div>
      </div>
      <div id="add-err" class="text-xs text-red-600 hidden"></div>
      <div class="flex gap-2 justify-end">
        <button id="add-cancel" class="px-3 py-1.5 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200">${t("admin.users.action.cancel")}</button>
        <button id="add-submit" class="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">${t("admin.users.action.save")}</button>
      </div>
    </div>`;
  mountOverlay(overlay);
  overlay.querySelector("#add-cancel").addEventListener("click", () => overlay.remove());
  overlay.querySelector("#add-submit").addEventListener("click", () => _onSubmit(overlay, onAdded));
}
async function _onSubmit(overlay, onAdded) {
  const email = overlay.querySelector("#add-email").value.trim();
  const name = overlay.querySelector("#add-name").value.trim();
  const roles = rolesFromForm(overlay);
  if (!email) return showError(overlay, t("admin.users.error.email_required"));
  if (!isValidEmail(email)) return showError(overlay, t("admin.users.error.email_invalid"));
  if (!name) return showError(overlay, t("admin.users.error.name_required"));
  if (!roles.length) return showError(overlay, t("admin.users.error.role_required"));
  const submitBtn = overlay.querySelector("#add-submit");
  submitBtn.disabled = true;
  try {
    await createUser({ email, display_name: name, roles });
    overlay.remove();
    window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { type: "success", message: t("admin.users.toast.added").replace("{email}", email) } }));
    await onAdded?.();
  } catch (err) {
    showError(overlay, err.message);
    submitBtn.disabled = false;
  }
}

// output/web/js.tmp/implementations/ui/bootstrap/views/admin/user-edit-modal.js
function showError2(overlay, message) {
  const err = overlay.querySelector("#edit-err");
  err.textContent = message;
  err.classList.remove("hidden");
}
function openEditUserModal(user, { onSaved } = {}) {
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 z-50 bg-black/40 flex items-center justify-center";
  overlay.innerHTML = `
    <div class="bg-white rounded-xl shadow-xl p-6 w-96 space-y-4">
      <div class="text-sm font-semibold text-slate-800">${t("admin.users.modal.edit_title")} \u2014 ${user.email}</div>
      <div class="space-y-3">
        <label class="block text-xs text-slate-600">${t("admin.users.column.display_name")}
          <input id="edit-name" value="${user.display_name || ""}"
                 class="mt-1 w-full border rounded px-3 py-1.5 text-xs" /></label>
        <div class="space-y-1">
          <div class="text-xs font-medium text-slate-700">${t("admin.users.column.role")}</div>
          <div class="text-[11px] text-slate-400">${t("admin.users.roles.hint")}</div>
          ${roleCheckboxesHtml(user.roles || [], (r) => t(ROLE_LABEL_KEYS[r] || r))}
        </div>
      </div>
      <div id="edit-err" class="text-xs text-red-600 hidden"></div>
      <div class="flex gap-2 justify-end">
        <button id="edit-cancel" class="px-3 py-1.5 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200">${t("admin.users.action.cancel")}</button>
        <button id="edit-submit" class="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">${t("admin.users.action.save")}</button>
      </div>
    </div>`;
  mountOverlay(overlay);
  overlay.querySelector("#edit-cancel").addEventListener("click", () => overlay.remove());
  overlay.querySelector("#edit-submit").addEventListener("click", () => _onSubmit2(overlay, user, onSaved));
}
async function _onSubmit2(overlay, user, onSaved) {
  const newName = overlay.querySelector("#edit-name").value.trim();
  const newRoles = rolesFromForm(overlay);
  if (!newName) return showError2(overlay, t("admin.users.error.name_required"));
  if (!newRoles.length) return showError2(overlay, t("admin.users.error.role_required"));
  const body = {};
  if (newName !== (user.display_name || "")) body.display_name = newName;
  if (newRoles.join(",") !== (user.roles || []).join(",")) body.roles = newRoles;
  const submitBtn = overlay.querySelector("#edit-submit");
  submitBtn.disabled = true;
  try {
    if (Object.keys(body).length) await patchUser(user.email, body);
    overlay.remove();
    window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { type: "success", message: t("admin.users.toast.updated").replace("{email}", user.email) } }));
    await onSaved?.();
  } catch (err) {
    showError2(overlay, err.message);
    submitBtn.disabled = false;
  }
}

// output/web/js.tmp/implementations/ui/bootstrap/views/admin/users-view.js
var TOAST_MS = 4e3;
var DEFAULT_ACTIVE_FILTER = "";
var _allUsers = [];
var _filter = { search: "", role: "", activeFilter: DEFAULT_ACTIVE_FILTER };
function toast(type, message) {
  window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { type, message, duration: TOAST_MS } }));
}
function shellHtml() {
  return `
    <div class="p-6 max-w-[1600px] mx-auto space-y-4">
      <div class="flex items-center justify-between">
        <div class="text-lg font-semibold text-slate-900">${t("admin.users.title")}</div>
        <div class="flex gap-2">
          <button id="btn-view-audit-log" class="px-4 py-2 text-xs rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">
            ${t("admin.users.audit_log.link_text")}
          </button>
          <button id="btn-add-user" class="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            ${t("admin.users.add_button")}
          </button>
        </div>
      </div>
      <div id="usr-filter-bar"></div>
      <div id="usr-table-wrap"></div>
    </div>`;
}
function _applyAndRender(root) {
  const rows = filterUsers(_allUsers, _filter);
  const wrap = root.querySelector("#usr-table-wrap");
  renderUsersTable(wrap, rows);
  bindRowActions(wrap, rows, {
    onEdit: (user) => openEditUserModal(user, { onSaved: () => _reload(root) }),
    onDeactivate: (user) => _onDeactivate(root, user)
  });
  const countEl = root.querySelector("#usr-count");
  if (countEl) countEl.textContent = `${rows.length} / ${_allUsers.length}`;
}
async function _reload(root) {
  renderUsersSkeleton(root.querySelector("#usr-table-wrap"));
  try {
    const { users } = await listUsers();
    _allUsers = sortUsersByEmail(users || []);
  } catch (err) {
    toast("error", err.message);
    _allUsers = [];
  }
  _applyAndRender(root);
}
async function _onDeactivate(root, user) {
  const ok = await showConfirm({
    title: t("admin.users.confirm.deactivate_title").replace("{email}", user.email),
    body: t("admin.users.confirm.deactivate_body"),
    confirmLabel: t("admin.users.action.deactivate"),
    cancelLabel: t("admin.users.action.cancel"),
    destructive: true
  });
  if (!ok) return;
  try {
    await patchUser(user.email, { active: false });
    toast("success", t("admin.users.toast.deactivated").replace("{email}", user.email));
    await _reload(root);
  } catch (err) {
    toast("error", err.message);
  }
}
function bindFilterBar(root) {
  root.querySelector("#usr-search")?.addEventListener("input", (e) => {
    _filter.search = e.target.value;
    _applyAndRender(root);
  });
  root.querySelector("#usr-role")?.addEventListener("change", (e) => {
    _filter.role = e.target.value;
    _applyAndRender(root);
  });
}
async function render(root) {
  if (!hasRole(ROLE_MANAGER)) {
    navigate("/dashboard");
    return;
  }
  _filter = { search: "", role: "", activeFilter: DEFAULT_ACTIVE_FILTER };
  root.innerHTML = shellHtml();
  root.querySelector("#usr-filter-bar").innerHTML = filterBarHtml(_filter);
  bindFilterBar(root);
  root.querySelector("#btn-add-user").addEventListener("click", () => {
    openAddUserModal({ onAdded: () => _reload(root) });
  });
  root.querySelector("#btn-view-audit-log").addEventListener("click", () => navigate("/admin/users/audit-log"));
  await _reload(root);
}
export {
  render
};
