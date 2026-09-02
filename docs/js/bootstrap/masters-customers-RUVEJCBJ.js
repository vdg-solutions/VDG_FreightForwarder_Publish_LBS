import {
  isMountedRoute
} from "./chunk-EN6RKDYW.js";
import {
  getActiveSalesReps
} from "./chunk-YFN2XPGT.js";
import {
  foldSyncFailure,
  renderMasterLoadRetryStatus,
  safeMasterLoad
} from "./chunk-V5A2B6CO.js";
import {
  mountAgGrid
} from "./chunk-4WAHI6XV.js";
import {
  wireGridFilterEmptyState
} from "./chunk-ZJJVGVDQ.js";
import {
  canWriteMaster
} from "./chunk-T2XEYG3A.js";
import {
  deleteMaster,
  listMasters,
  saveMaster
} from "./chunk-XLNZASZM.js";
import {
  currentRoles
} from "./chunk-NQTRREKJ.js";
import "./chunk-7DW526V3.js";
import "./chunk-JAZY43GR.js";
import {
  showConfirm
} from "./chunk-HKNQBDY4.js";
import {
  t
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/masters-customers-modal.js
var KIND_PREFIX = "CUST";
function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function genId() {
  return `${KIND_PREFIX}-${Date.now()}`;
}
function repOptions(reps, selected) {
  const known = (reps || []).some((r) => r.prefix === selected);
  const legacy = selected && !known ? `<option value="${escHtml(selected)}" selected>${escHtml(selected)}</option>` : "";
  return `<option value="">${t("masters_customers.field.sales_rep_none")}</option>${legacy}` + (reps || []).map((r) => `<option value="${escHtml(r.prefix)}"${r.prefix === selected ? " selected" : ""}>${escHtml(r.name)}${r.handle ? ` (${escHtml(r.handle)})` : ""}</option>`).join("");
}
function buildModal(entity, reps) {
  const isEdit = !!entity;
  const e = entity || {};
  return `
    <dialog id="master-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-md backdrop:bg-black/30">
      <form id="modal-form" method="dialog" class="p-6 space-y-4">
        <div class="text-base font-semibold text-slate-900 mb-1">${isEdit ? t("masters_customers.modal.edit") : t("masters_customers.modal.new")}</div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("masters_customers.field.name")} <span class="text-red-500">*</span></label>
          <input id="m-name" type="text" value="${escHtml(e.name)}" required
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <span id="m-err-name" class="hidden text-xs text-red-600"></span>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("masters_customers.field.short_code")}</label>
          <input id="m-short_code" type="text" value="${escHtml(e.short_code)}"
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("masters_customers.field.contact_person")}</label>
          <input id="m-contact_person" type="text" value="${escHtml(e.contact_person)}"
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("masters_customers.field.tel")}</label>
            <input id="m-tel" type="text" value="${escHtml(e.tel)}"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("masters_customers.field.email")}</label>
            <input id="m-email" type="email" value="${escHtml(e.email)}"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("masters_customers.field.address")}</label>
          <input id="m-address" type="text" value="${escHtml(e.address)}"
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("masters_customers.field.sales_rep")}</label>
          <select id="m-sales_rep"
                  class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            ${repOptions(reps, e.sales_rep_id)}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("masters_customers.field.commercial_terms")}</label>
          <select id="m-commercial_terms"
                  class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">\u2014 None \u2014</option>
            <option value="NET-30" ${e.commercial_terms === "NET-30" ? "selected" : ""}>NET-30</option>
            <option value="NET-45" ${e.commercial_terms === "NET-45" ? "selected" : ""}>NET-45</option>
            <option value="NET-60" ${e.commercial_terms === "NET-60" ? "selected" : ""}>NET-60</option>
            <option value="COD"    ${e.commercial_terms === "COD" ? "selected" : ""}>${t("masters_customers.field.cod")}</option>
          </select>
        </div>
        <div class="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit"
                  class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">${t("common.action.save")}</button>
          <button type="button" id="btn-modal-cancel"
                  class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">${t("common.action.cancel")}</button>
        </div>
      </form>
    </dialog>`;
}
function openModal(root, entity, onSave, reps = []) {
  root.querySelector("#master-modal")?.remove();
  root.insertAdjacentHTML("beforeend", buildModal(entity, reps));
  const dialog = root.querySelector("#master-modal");
  dialog.showModal();
  dialog.querySelector("#btn-modal-cancel").addEventListener("click", () => dialog.close());
  dialog.querySelector("#modal-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = dialog.querySelector("#m-name").value.trim();
    const errEl = dialog.querySelector("#m-err-name");
    if (!name) {
      errEl.textContent = t("masters.val.name_required");
      errEl.classList.remove("hidden");
      return;
    }
    errEl.classList.add("hidden");
    const updated = {
      ...entity || {},
      id: entity?.id || genId(),
      name,
      short_code: dialog.querySelector("#m-short_code").value.trim() || null,
      contact_person: dialog.querySelector("#m-contact_person").value.trim() || null,
      tel: dialog.querySelector("#m-tel").value.trim() || null,
      email: dialog.querySelector("#m-email").value.trim() || null,
      address: dialog.querySelector("#m-address").value.trim() || null,
      sales_rep_id: dialog.querySelector("#m-sales_rep").value || null,
      commercial_terms: dialog.querySelector("#m-commercial_terms").value || null
    };
    await onSave(updated);
    dialog.close();
  });
}

// output/web/js.tmp/implementations/ui/bootstrap/views/masters-customers.js
var KIND = "customers";
function makeActionsRenderer(onEdit, onDelete) {
  return function actionsRenderer(params) {
    const wrap = document.createElement("div");
    wrap.className = "flex items-center gap-2 h-full";
    const editBtn = document.createElement("button");
    editBtn.className = "text-xs text-blue-600 hover:underline";
    editBtn.textContent = t("common.action.edit");
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onEdit(params.data);
    });
    const delBtn = document.createElement("button");
    delBtn.className = "text-xs text-red-500 hover:underline";
    delBtn.textContent = t("common.action.delete");
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onDelete(params.data);
    });
    wrap.appendChild(editBtn);
    wrap.appendChild(delBtn);
    return wrap;
  };
}
var OWN_ROUTE = "/masters/customers";
var _onLocale = null;
async function render(root) {
  if (_onLocale) window.removeEventListener("vdg:locale-changed", _onLocale);
  _onLocale = () => {
    if (!isMountedRoute(OWN_ROUTE)) return;
    const liveRoot = document.getElementById("view-root");
    if (liveRoot) render(liveRoot);
  };
  window.addEventListener("vdg:locale-changed", _onLocale);
  const canEdit = canWriteMaster(KIND, currentRoles());
  const repo = window.__vdg_repo;
  let items = [];
  let api = null;
  let loadFailed = false;
  const loadReps = async () => repo ? await getActiveSalesReps(repo).catch(() => []) : [];
  root.innerHTML = `
    <div class="p-6 max-w-[1600px] mx-auto">
      <div id="grid-header"></div>
      <div id="cust-grid" class="ag-theme-quartz rounded-xl overflow-hidden border border-slate-200" style="height:520px;"></div>
      <div id="m-status" class="text-xs text-slate-400 mt-2">Loading\u2026</div>
    </div>`;
  function renderToolbar(total) {
    const addBtn = canEdit ? `<button id="btn-add" class="text-xs px-3 py-1.5 bg-slate-900 text-white rounded-md hover:bg-slate-800">${t("masters_customers.action.add")}</button>` : "";
    return `
      <div class="flex items-center justify-between mb-4">
        <div class="text-lg font-semibold text-slate-900">${t("masters_customers.title")} <span class="text-sm font-normal text-slate-400">(${total})</span></div>
        <div class="flex items-center gap-2">
          <div class="relative">
            <svg class="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input id="grid-search" placeholder="${t("masters_customers.toolbar.search_placeholder")}" class="text-sm pl-8 pr-3 py-1.5 border border-slate-200 rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
          </div>
          <button id="export-csv" class="text-xs px-3 py-1.5 border border-slate-200 rounded-md text-slate-700 bg-white hover:bg-slate-50">${t("masters_customers.toolbar.export_csv")}</button>
          ${addBtn}
        </div>
      </div>`;
  }
  async function onEdit(entity) {
    openModal(root, entity, async (updated) => {
      await saveMaster(KIND, updated);
      items = items.map((i) => i.id === updated.id ? updated : i);
      api?.setGridOption("rowData", items);
    }, await loadReps());
  }
  async function onDelete(entity) {
    const ok = await showConfirm({
      title: t("masters_customers.confirm_delete"),
      confirmLabel: t("common.action.delete"),
      cancelLabel: t("common.action.cancel"),
      destructive: true
    });
    if (!ok) return;
    await deleteMaster(KIND, entity.id);
    items = items.filter((i) => i.id !== entity.id);
    api?.setGridOption("rowData", items);
  }
  function buildColumnDefs() {
    const cols = [];
    cols.push(
      { headerName: t("masters_customers.col.name"), field: "name", flex: 2, minWidth: 160 },
      { headerName: t("masters_customers.col.short_code"), field: "short_code", width: 110, cellClass: "font-mono text-xs", valueGetter: (p) => p.data.short_code ?? "\u2014" },
      { headerName: t("masters_customers.col.contact"), field: "contact_person", flex: 1, minWidth: 120, valueGetter: (p) => p.data.contact_person ?? "\u2014" },
      { headerName: t("masters_customers.col.tel"), field: "tel", width: 130, valueGetter: (p) => p.data.tel ?? "\u2014" },
      { headerName: t("masters_customers.col.sales_rep"), field: "sales_rep_id", width: 100, cellClass: "font-mono text-xs", valueGetter: (p) => p.data.sales_rep_id ?? "\u2014" }
    );
    if (canEdit) {
      cols.push({ headerName: "", field: "actions", width: 110, sortable: false, filter: false, cellRenderer: makeActionsRenderer(onEdit, onDelete) });
    }
    return cols;
  }
  async function reload() {
    const statusEl = root.querySelector("#m-status");
    if (!repo) {
      items = [];
      loadFailed = false;
      api?.setGridOption("rowData", items);
      if (statusEl) statusEl.textContent = "";
      return;
    }
    const listRes = foldSyncFailure(await safeMasterLoad(() => listMasters(KIND), "customers:list"), KIND, repo);
    loadFailed = !listRes.ok;
    items = loadFailed ? [] : listRes.value;
    api?.setGridOption("rowData", items);
    if (loadFailed) {
      renderMasterLoadRetryStatus(statusEl, t("masters.load_error"), t("common.load.retry"), reload);
    } else if (statusEl) {
      statusEl.textContent = "";
    }
    const hdr = root.querySelector("#grid-header");
    if (hdr) hdr.innerHTML = renderToolbar(items.length);
    wireToolbar();
  }
  async function handleAdd() {
    openModal(root, null, async (entity) => {
      await saveMaster(KIND, entity);
      items = [...items, entity];
      api?.setGridOption("rowData", items);
      const hdr = root.querySelector("#grid-header");
      if (hdr) hdr.innerHTML = renderToolbar(items.length);
      wireToolbar();
    }, await loadReps());
  }
  function wireToolbar() {
    wireGridFilterEmptyState({
      root,
      getApi: () => api,
      searchSelector: "#grid-search",
      getTotal: () => items.length,
      entity: t("masters_customers.empty.entity"),
      // CTA relies on the generic empty_state.filtered.create / first_run.create templates —
      // matches this view's own "+ Thêm mới" toolbar verb, so no per-view override is needed.
      onCreate: canEdit ? handleAdd : void 0,
      // F-?? outage/first-run collapse: a known sync failure (foldSyncFailure above) must render
      // the LOAD_FAILED card, never the "create your first customer" onboarding copy.
      getLoadOutcome: () => ({ failed: loadFailed, skipped: 0 }),
      onRetry: reload
    });
    root.querySelector("#export-csv")?.addEventListener("click", () => {
      api?.exportDataAsCsv({ fileName: "vdg_customers.csv" });
    });
    root.querySelector("#btn-add")?.addEventListener("click", handleAdd);
  }
  const headerDiv = root.querySelector("#grid-header");
  if (headerDiv) headerDiv.innerHTML = renderToolbar(0);
  const gridDiv = root.querySelector("#cust-grid");
  if (window.agGrid && gridDiv) {
    api = mountAgGrid(gridDiv, {
      columnDefs: buildColumnDefs(),
      rowData: [],
      defaultColDef: { sortable: true, resizable: true, filter: true },
      rowHeight: 38,
      headerHeight: 36
    });
  }
  wireToolbar();
  await reload();
}
export {
  render
};
