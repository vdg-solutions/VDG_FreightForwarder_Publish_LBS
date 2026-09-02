import {
  bulkPut
} from "./chunk-U4F5HOXH.js";
import {
  commissionRuleEditorInputs,
  deleteCommissionRule,
  saveCommissionRule
} from "./chunk-T5ZHX2YX.js";
import {
  mountAgGrid
} from "./chunk-4WAHI6XV.js";
import "./chunk-7DW526V3.js";
import {
  showConfirm
} from "./chunk-HKNQBDY4.js";
import {
  t
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/commission-rules-modal.js
function buildAddModal() {
  return `
    <dialog id="cr-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-sm backdrop:bg-black/30">
      <form id="cr-form" method="dialog" class="p-6 space-y-4">
        <div class="text-base font-semibold text-slate-900 mb-1">${t("commission_rules.add_button")}</div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("commission_rules.field.sales_id")} <span class="text-red-500">*</span></label>
          <input id="cr-sales-id" type="text" required
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <span id="cr-err-sales-id" class="hidden text-xs text-red-600"></span>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("commission_rules.col.sales_pct")} <span class="text-red-500">*</span></label>
          <input id="cr-sales-pct" type="number" min="0" max="100" step="1" required
                 class="w-full border rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <span id="cr-err-pct" class="hidden text-xs text-red-600"></span>
        </div>
        <div class="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">${t("common.action.save")}</button>
          <button type="button" id="cr-modal-cancel" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">${t("common.action.cancel")}</button>
        </div>
      </form>
    </dialog>`;
}
function openAddModal(root, onSave) {
  root.querySelector("#cr-modal")?.remove();
  root.insertAdjacentHTML("beforeend", buildAddModal());
  const dialog = root.querySelector("#cr-modal");
  dialog.showModal();
  const setErr = (id, msg) => {
    const el = dialog.querySelector(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle("hidden", !msg);
  };
  dialog.querySelector("#cr-modal-cancel").addEventListener("click", () => dialog.close());
  dialog.querySelector("#cr-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const salesId = dialog.querySelector("#cr-sales-id").value.trim();
    const pctRaw = dialog.querySelector("#cr-sales-pct").value;
    setErr("#cr-err-sales-id", "");
    setErr("#cr-err-pct", "");
    if (!salesId) {
      setErr("#cr-err-sales-id", t("commission_rules.err_sales_id_required"));
      return;
    }
    let split;
    try {
      split = window.__vdg_wasm.commission_rule_split(pctRaw === "" ? null : Number(pctRaw));
    } catch {
      setErr("#cr-err-pct", t("commission_rules.err_invalid_pct"));
      return;
    }
    await onSave({ id: salesId, sales_id: salesId, sales_pct: split.sales_pct, updated_at: (/* @__PURE__ */ new Date()).toISOString() });
    dialog.close();
  });
}

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/commission-rules.js
var KIND_COMMISSION_RULES = "commission_rules";
var _users = [];
var _rules = /* @__PURE__ */ new Map();
var _entrySalesIds = [];
var _gridApi = null;
function getRepo() {
  return window.__vdg_repo;
}
function wasm() {
  return window.__vdg_wasm;
}
async function loadData() {
  const { users, rules, entryAuthors } = await commissionRuleEditorInputs();
  _users = users;
  _rules.clear();
  for (const r of rules) {
    const key = r.sales_id || r.salesId || r.id;
    if (key) _rules.set(key, r);
  }
  _entrySalesIds = entryAuthors;
}
function buildRowData() {
  const seen = /* @__PURE__ */ new Set();
  const rows = _users.map((u) => {
    const key = u.email || u.id;
    const existing = _rules.get(key);
    seen.add(key);
    return {
      id: key,
      email: u.email || key,
      name: u.display_name || u.name || "",
      role: u.role || (Array.isArray(u.roles) ? u.roles[0] : u.roles) || "",
      salesPct: existing?.sales_pct ?? null,
      hasOverride: existing != null,
      dirty: false
    };
  });
  for (const [key, r] of _rules) {
    if (seen.has(key)) continue;
    rows.push({
      id: key,
      email: key,
      name: "",
      role: "",
      salesPct: r.sales_pct ?? null,
      hasOverride: true,
      dirty: false
    });
  }
  return rows;
}
function buildGridCols(onDelete) {
  return [
    { field: "email", headerName: t("commission_rules.col.email"), flex: 1, minWidth: 200 },
    { field: "name", headerName: t("commission_rules.col.name"), flex: 1, minWidth: 140 },
    { field: "role", headerName: t("commission_rules.col.role"), width: 110 },
    {
      headerName: t("commission_rules.col.sales_pct"),
      field: "salesPct",
      width: 170,
      cellRenderer: (p) => {
        const wrap = document.createElement("div");
        wrap.className = "flex items-center gap-2 h-full";
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.max = "100";
        input.step = "1";
        input.value = p.value ?? "";
        input.className = "w-24 border border-slate-300 rounded px-2 py-1 text-xs text-right focus:ring focus:ring-blue-200 outline-none";
        const lbsLabel = document.createElement("span");
        lbsLabel.className = "text-xs text-slate-400 whitespace-nowrap";
        const paintSplit = (pct) => {
          try {
            const split = wasm().commission_rule_split(pct);
            input.placeholder = t("commission_rules.default_suffix", { n: split.sales_pct });
            lbsLabel.textContent = t("commission_rules.lbs_share", { n: split.company_pct });
            input.classList.remove("border-red-400");
            return true;
          } catch {
            lbsLabel.textContent = t("commission_rules.err_invalid_pct");
            input.classList.add("border-red-400");
            return false;
          }
        };
        paintSplit(p.value != null ? Number(p.value) : null);
        input.addEventListener("input", (e) => {
          const raw = e.target.value;
          const pct = raw === "" ? null : Number(raw);
          if (!paintSplit(pct)) return;
          p.data.salesPct = pct;
          p.data.dirty = true;
          const btn = document.getElementById("btn-save-rules");
          if (btn) btn.disabled = false;
        });
        wrap.appendChild(input);
        wrap.appendChild(lbsLabel);
        return wrap;
      }
    },
    {
      headerName: t("common.col.actions"),
      field: "actions",
      width: 100,
      cellRenderer: (p) => {
        if (!p.data.hasOverride) return "";
        const btn = document.createElement("button");
        btn.className = "text-xs text-red-500 hover:underline";
        btn.textContent = t("common.action.delete");
        btn.addEventListener("click", () => onDelete(p.data));
        return btn;
      }
    }
  ];
}
function renderGrid(container, onDelete) {
  if (_gridApi) {
    try {
      _gridApi.destroy();
    } catch {
    }
    _gridApi = null;
  }
  container.innerHTML = '<div class="ag-theme-quartz" style="height: 480px;"></div>';
  if (!window.agGrid) {
    container.innerHTML = `<div class="p-4 text-xs text-slate-400">${t("commission_rules.ag_grid_unavailable")}</div>`;
    return;
  }
  const gridOptions = {
    columnDefs: buildGridCols(onDelete),
    rowData: buildRowData(),
    defaultColDef: { sortable: true, resizable: true },
    rowHeight: 48,
    suppressMovableColumns: true,
    onGridReady: (params) => {
      _gridApi = params.api;
    }
  };
  _gridApi = mountAgGrid(container.querySelector(".ag-theme-quartz"), gridOptions);
}
async function render(root) {
  await loadData();
  const defaultSplit = wasm().commission_rule_split(null);
  root.innerHTML = `
    <div class="p-6 space-y-5 max-w-[900px] mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-slate-900">${t("commission_rules.title")}</h1>
          <p class="text-sm text-slate-500 mt-1">
            ${t("commission_rules.subtitle")}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button id="btn-add-rule"
            class="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors">
            + ${t("commission_rules.add_button")}
          </button>
          <button id="btn-save-rules" disabled
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 text-sm font-medium transition-colors">
            ${t("commission_rules.save")}
          </button>
        </div>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
        <div class="font-semibold">${t("commission_rules.waterfall.title")}</div>
        <div>${t("commission_rules.waterfall.line1")}</div>
        <div>${t("commission_rules.waterfall.line2")}</div>
        <div>${t("commission_rules.waterfall.line3")}</div>
        <div class="pt-1 text-blue-600">${t("commission_rules.waterfall.default_note", { sales: defaultSplit.sales_pct, lbs: defaultSplit.company_pct })}</div>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div id="rules-grid"></div>
      </div>

      <div id="save-status" class="text-xs text-slate-500 text-right"></div>
    </div>
  `;
  async function refreshGrid() {
    renderGrid(root.querySelector("#rules-grid"), onDeleteRule);
  }
  async function onDeleteRule(row) {
    const ok = await showConfirm({
      title: t("commission_rules.delete_confirm", { email: row.email }),
      confirmLabel: t("common.action.delete"),
      cancelLabel: t("common.action.cancel"),
      destructive: true
    });
    if (!ok) return;
    const blockReason = wasm().commission_rule_block_reason(row.id, JSON.stringify(_entrySalesIds));
    if (blockReason) {
      window.dispatchEvent(new CustomEvent("vdg:toast", {
        detail: { type: "error", message: t("commission_rules.delete_blocked") }
      }));
      return;
    }
    await deleteCommissionRule(row.id);
    window.dispatchEvent(new CustomEvent("vdg:toast", {
      detail: { type: "success", message: t("commission_rules.deleted") }
    }));
    await loadData();
    await refreshGrid();
  }
  await refreshGrid();
  root.querySelector("#btn-add-rule").addEventListener("click", () => {
    openAddModal(root, async (entity) => {
      await saveCommissionRule(entity.id, entity);
      await loadData();
      await refreshGrid();
    });
  });
  root.querySelector("#btn-save-rules").addEventListener("click", async () => {
    const repo = getRepo();
    if (!repo) return;
    const rows = [];
    if (_gridApi) {
      if (typeof _gridApi.forEachNode === "function") {
        _gridApi.forEachNode((node) => rows.push(node.data));
      } else if (typeof _gridApi.getDisplayedRowCount === "function") {
        const count = _gridApi.getDisplayedRowCount();
        for (let i = 0; i < count; i++) {
          const row = _gridApi.getDisplayedRowAtIndex(i);
          if (row) rows.push(row.data);
        }
      }
    }
    const dirtyRows = rows.filter((r) => r.dirty);
    if (!dirtyRows.length) return;
    const btn = document.getElementById("btn-save-rules");
    const status = root.querySelector("#save-status");
    if (btn) btn.disabled = true;
    if (status) status.textContent = t("commission_rules.saving");
    const entities = dirtyRows.map((r) => ({
      id: r.id,
      sales_id: r.id,
      sales_pct: r.salesPct != null ? Number(r.salesPct) : null,
      // null = use default
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }));
    try {
      await bulkPut(repo, KIND_COMMISSION_RULES, entities);
      window.dispatchEvent(new CustomEvent("vdg:toast", {
        detail: { type: "success", message: t("commission_rules.saved", { n: entities.length }) }
      }));
      if (status) status.textContent = t("commission_rules.saved_at", { time: (/* @__PURE__ */ new Date()).toLocaleTimeString("vi-VN") });
      dirtyRows.forEach((r) => {
        r.dirty = false;
      });
      await loadData();
      await refreshGrid();
    } catch (e) {
      window.dispatchEvent(new CustomEvent("vdg:toast", {
        detail: { type: "error", message: t("commission_rules.save_error", { msg: e.message }) }
      }));
      if (btn) btn.disabled = false;
    }
  });
}
export {
  render
};
