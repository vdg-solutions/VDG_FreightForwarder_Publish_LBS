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
  listMasters,
  saveMaster
} from "./chunk-NRZYXZMH.js";
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

// output/web/js.tmp/implementations/ui/bootstrap/views/masters-carriers.js
var KIND = "carriers";
var KIND_PREFIX = "CARR";
function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function genId() {
  return `${KIND_PREFIX}-${Date.now()}`;
}
function buildModal(entity) {
  const e = entity || {};
  return `
    <dialog id="master-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-md backdrop:bg-black/30">
      <form id="modal-form" method="dialog" class="p-6 space-y-4">
        <div class="text-base font-semibold text-slate-900 mb-1">${entity ? t("masters_carriers.modal.edit") : t("masters_carriers.modal.new")}</div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("masters_carriers.field.name")} <span class="text-red-500">*</span></label>
          <input id="m-name" type="text" value="${escHtml(e.name)}" required
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <span id="m-err-name" class="hidden text-xs text-red-600"></span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("masters_carriers.field.short_code")}</label>
            <input id="m-short_code" type="text" value="${escHtml(e.short_code)}"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("masters_carriers.field.scac")}</label>
            <input id="m-scac" type="text" value="${escHtml(e.scac)}"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("masters_carriers.field.contact_person")}</label>
          <input id="m-contact_person" type="text" value="${escHtml(e.contact_person)}"
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("masters_carriers.field.tel")}</label>
            <input id="m-tel" type="text" value="${escHtml(e.tel)}"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("masters_carriers.field.email")}</label>
            <input id="m-email" type="email" value="${escHtml(e.email)}"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
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
function openModal(root, entity, onSave) {
  root.querySelector("#master-modal")?.remove();
  root.insertAdjacentHTML("beforeend", buildModal(entity));
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
      scac: dialog.querySelector("#m-scac").value.trim() || null,
      contact_person: dialog.querySelector("#m-contact_person").value.trim() || null,
      tel: dialog.querySelector("#m-tel").value.trim() || null,
      email: dialog.querySelector("#m-email").value.trim() || null
    };
    await onSave(updated);
    dialog.close();
  });
}
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
async function render(root) {
  const isM = canWriteMaster(KIND, currentRoles());
  const repo = window.__vdg_repo;
  let items = [];
  let api = null;
  let loadFailed = false;
  root.innerHTML = `
    <div class="p-6 max-w-[1600px] mx-auto">
      <div id="grid-header"></div>
      <div id="carr-grid" class="ag-theme-quartz rounded-xl overflow-hidden border border-slate-200" style="height:520px;"></div>
      <div id="m-status" class="text-xs text-slate-400 mt-2">Loading\u2026</div>
    </div>`;
  function renderToolbar(total) {
    const addBtn = isM ? `<button id="btn-add" class="text-xs px-3 py-1.5 bg-slate-900 text-white rounded-md hover:bg-slate-800">${t("masters_carriers.action.add")}</button>` : "";
    return `
      <div class="flex items-center justify-between mb-4">
        <div class="text-lg font-semibold text-slate-900">${t("masters_carriers.title")} <span class="text-sm font-normal text-slate-400">(${total})</span></div>
        <div class="flex items-center gap-2">
          <div class="relative">
            <svg class="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input id="grid-search" placeholder="${t("masters_carriers.toolbar.search_placeholder")}" class="text-sm pl-8 pr-3 py-1.5 border border-slate-200 rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
          </div>
          <button id="export-csv" class="text-xs px-3 py-1.5 border border-slate-200 rounded-md text-slate-700 bg-white hover:bg-slate-50">${t("masters_carriers.toolbar.export_csv")}</button>
          ${addBtn}
        </div>
      </div>`;
  }
  async function onEdit(entity) {
    openModal(root, entity, async (u) => {
      await saveMaster(KIND, u);
      items = items.map((i) => i.id === u.id ? u : i);
      api?.setGridOption("rowData", items);
    });
  }
  async function onDelete(entity) {
    const ok = await showConfirm({
      title: t("masters_carriers.confirm_delete"),
      confirmLabel: t("common.action.delete"),
      cancelLabel: t("common.action.cancel"),
      destructive: true
    });
    if (!ok) return;
    await repo.delete(KIND, entity.id);
    items = items.filter((i) => i.id !== entity.id);
    api?.setGridOption("rowData", items);
  }
  function buildColumnDefs() {
    const cols = [];
    cols.push(
      { headerName: t("masters_carriers.col.name"), field: "name", flex: 2, minWidth: 160 },
      { headerName: t("masters_carriers.col.scac"), field: "scac", width: 120, cellClass: "font-mono text-xs", valueGetter: (p) => p.data.scac ?? "\u2014" },
      { headerName: t("masters_carriers.col.contact"), field: "contact_person", flex: 1, minWidth: 120, valueGetter: (p) => p.data.contact_person ?? "\u2014" },
      { headerName: t("masters_carriers.col.tel"), field: "tel", width: 140, valueGetter: (p) => p.data.tel ?? "\u2014" }
    );
    if (isM) {
      cols.push({ headerName: "", field: "actions", width: 110, sortable: false, filter: false, cellRenderer: makeActionsRenderer(onEdit, onDelete) });
    }
    return cols;
  }
  async function reload() {
    const statusEl = root.querySelector("#m-status");
    const listRes = foldSyncFailure(await safeMasterLoad(() => listMasters(KIND), `${KIND}:list`), KIND, repo);
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
  function handleAdd() {
    openModal(root, null, async (entity) => {
      await saveMaster(KIND, entity);
      items = [...items, entity];
      api?.setGridOption("rowData", items);
      const hdr = root.querySelector("#grid-header");
      if (hdr) hdr.innerHTML = renderToolbar(items.length);
      wireToolbar();
    });
  }
  function wireToolbar() {
    wireGridFilterEmptyState({
      root,
      getApi: () => api,
      searchSelector: "#grid-search",
      getTotal: () => items.length,
      entity: t("masters_carriers.empty.entity"),
      // CTA relies on the generic empty_state.filtered.create / first_run.create templates —
      // "Thêm hãng vận chuyển mới" / "Tạo hãng vận chuyển đầu tiên" match this view's own
      // "+ Thêm mới" toolbar verb, so no per-view override is needed here.
      onCreate: isM ? handleAdd : void 0,
      // F-?? outage/first-run collapse: a known sync failure (foldSyncFailure above) must render
      // the LOAD_FAILED card, never the "create your first carrier" onboarding copy.
      getLoadOutcome: () => ({ failed: loadFailed, skipped: 0 }),
      onRetry: reload
    });
    root.querySelector("#export-csv")?.addEventListener("click", () => {
      api?.exportDataAsCsv({ fileName: "vdg_carriers.csv" });
    });
    root.querySelector("#btn-add")?.addEventListener("click", handleAdd);
  }
  const headerDiv = root.querySelector("#grid-header");
  if (headerDiv) headerDiv.innerHTML = renderToolbar(0);
  const gridDiv = root.querySelector("#carr-grid");
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
