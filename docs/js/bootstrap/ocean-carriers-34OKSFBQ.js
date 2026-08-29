import {
  boundedList,
  renderMasterLoadRetryStatus
} from "./chunk-CVQ465MH.js";
import "./chunk-JAZY43GR.js";
import {
  canWriteMaster
} from "./chunk-T2XEYG3A.js";
import {
  currentRoles
} from "./chunk-NQTRREKJ.js";
import {
  showConfirm
} from "./chunk-FKMZGXJK.js";
import {
  t
} from "./chunk-NJFDQATX.js";

// output/web/js.tmp/implementations/kernel/core_abstractions/util/scac-validators.js
var SCAC_RE = /^[A-Z]{2,4}$/;
var ERR_SCAC = "2-4 uppercase letters, e.g. WHLC";
function validateScac(code) {
  return SCAC_RE.test(code) ? null : ERR_SCAC;
}
function checkScacUnique(items, scac, skipId = null) {
  const dup = items.find((i) => i.scac === scac && i.id !== skipId);
  return dup ? `SCAC ${scac} already exists` : null;
}

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/masters/ocean-carriers.js
var KIND = "ocean-carriers";
var KIND_PREFIX = "OCR";
function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function genId(scac) {
  return `${KIND_PREFIX}-${scac || Date.now()}`;
}
function buildModal(entity) {
  const e = entity || {};
  const aliases = (e.aliases || []).join(", ");
  return `
    <dialog id="master-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-md backdrop:bg-black/30">
      <form id="modal-form" method="dialog" class="p-6 space-y-4">
        <div class="text-base font-semibold text-slate-900 mb-1">${entity ? t("masters.ocean_carriers.edit_title") : t("masters.ocean_carriers.add_button")}</div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("masters.ocean_carriers.col_scac")} <span class="text-red-500">*</span></label>
          <input id="m-scac" type="text" maxlength="4" value="${escHtml(e.scac)}" required placeholder="e.g. WHLC"
                 class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <span id="m-err-scac" class="hidden text-xs text-red-600"></span>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("masters.ocean_carriers.col_name")} <span class="text-red-500">*</span></label>
          <input id="m-name" type="text" value="${escHtml(e.name)}" required
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <span id="m-err-name" class="hidden text-xs text-red-600"></span>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("common.field.aliases")}</label>
          <input id="m-aliases" type="text" value="${escHtml(aliases)}" placeholder="comma-separated, e.g. Wan Hai, WHL"
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div class="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">${t("common.action.save")}</button>
          <button type="button" id="btn-modal-cancel" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">${t("common.action.cancel")}</button>
        </div>
      </form>
    </dialog>`;
}
function openModal(root, entity, items, onSave) {
  root.querySelector("#master-modal")?.remove();
  root.insertAdjacentHTML("beforeend", buildModal(entity));
  const dialog = root.querySelector("#master-modal");
  dialog.showModal();
  dialog.querySelector("#btn-modal-cancel").addEventListener("click", () => dialog.close());
  dialog.querySelector("#modal-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const scac = dialog.querySelector("#m-scac").value.trim().toUpperCase();
    const name = dialog.querySelector("#m-name").value.trim();
    const aliases = dialog.querySelector("#m-aliases").value.split(",").map((a) => a.trim()).filter(Boolean);
    const setErr = (id, msg) => {
      const el = dialog.querySelector(id);
      if (!el) return;
      el.textContent = msg;
      el.classList.toggle("hidden", !msg);
    };
    setErr("#m-err-scac", "");
    setErr("#m-err-name", "");
    const scacErr = validateScac(scac);
    if (scacErr) {
      setErr("#m-err-scac", scacErr);
      return;
    }
    if (!name) {
      setErr("#m-err-name", t("masters.ocean_carriers.err_name_required"));
      return;
    }
    const dupErr = checkScacUnique(items, scac, entity?.id);
    if (dupErr) {
      setErr("#m-err-scac", dupErr);
      return;
    }
    const updated = { ...entity || {}, id: entity?.id || genId(scac), scac, name, aliases };
    await onSave(updated);
    dialog.close();
  });
}
function rowHtml(e, isM) {
  const aliases = (e.aliases || []).slice(0, 6).map((a) => `<span class="inline-block px-1.5 py-0.5 mr-1 mb-1 rounded bg-slate-100 text-slate-600 text-[10px]">${escHtml(a)}</span>`).join("");
  const actions = isM ? `
    <button class="btn-edit text-xs text-blue-600 hover:underline mr-2" data-id="${e.id}">${t("common.action.edit")}</button>
    <button class="btn-delete text-xs text-red-500 hover:underline" data-id="${e.id}">${t("common.action.delete")}</button>` : "";
  return `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs" data-id="${e.id}">
      <td class="px-3 py-2 font-mono">${escHtml(e.scac)}</td>
      <td class="px-3 py-2">${escHtml(e.name)}</td>
      <td class="px-3 py-2">${aliases}</td>
      ${isM ? `<td class="px-3 py-2">${actions}</td>` : ""}
    </tr>`;
}
async function render(root) {
  const isM = canWriteMaster(KIND, currentRoles());
  const repo = window.__vdg_repo;
  const actCol = isM ? `<th class="px-3 py-2 text-left w-28">${t("common.col.actions")}</th>` : "";
  root.innerHTML = `
    <div class="p-6 max-w-[1100px] mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div class="text-lg font-semibold text-slate-900">${t("masters.ocean_carriers.title")}</div>
        ${isM ? `<button id="btn-add" class="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700">+ ${t("masters.ocean_carriers.add_button")}</button>` : ""}
      </div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">${t("masters.ocean_carriers.col_scac")}</th>
              <th class="px-3 py-2 text-left">${t("masters.ocean_carriers.col_name")}</th>
              <th class="px-3 py-2 text-left">${t("masters.ocean_carriers.col_aliases")}</th>
              ${actCol}
            </tr>
          </thead>
          <tbody id="m-tbody"></tbody>
        </table>
        <div id="m-empty" class="hidden text-center text-xs text-slate-400 py-8">${t("masters.ocean_carriers.empty")}</div>
      </div>
      <div id="m-status" class="text-xs text-slate-400 mt-2">${t("common.load.loading")}</div>
    </div>`;
  let items = [];
  async function reload() {
    const tbody = root.querySelector("#m-tbody");
    const emptyEl = root.querySelector("#m-empty");
    const statusEl = root.querySelector("#m-status");
    if (!repo) {
      items = [];
      if (tbody) tbody.innerHTML = "";
      if (statusEl) statusEl.textContent = "";
      return;
    }
    const listRes = await boundedList(repo, KIND, "ocean-carriers:list");
    if (!listRes.ok) {
      if (tbody) tbody.innerHTML = "";
      emptyEl?.classList.add("hidden");
      renderMasterLoadRetryStatus(statusEl, t("masters.load_error"), t("retry"), reload);
      return;
    }
    items = listRes.value;
    if (tbody) tbody.innerHTML = items.map((e) => rowHtml(e, isM)).join("");
    if (emptyEl) emptyEl.classList.toggle("hidden", items.length > 0);
    if (statusEl) statusEl.textContent = "";
  }
  await reload();
  root.querySelector("#btn-add")?.addEventListener("click", () => {
    openModal(root, null, items, async (entity) => {
      await repo.put(KIND, entity.id, entity);
      await reload();
    });
  });
  root.querySelector("#m-tbody")?.addEventListener("click", async (ev) => {
    const editBtn = ev.target.closest(".btn-edit");
    if (editBtn) {
      const entity = items.find((i) => i.id === editBtn.dataset.id);
      if (entity) openModal(root, entity, items, async (u) => {
        await repo.put(KIND, u.id, u);
        await reload();
      });
    }
    const delBtn = ev.target.closest(".btn-delete");
    if (delBtn) {
      const ok = await showConfirm({
        title: t("masters.ocean_carriers.delete_confirm"),
        confirmLabel: t("common.action.delete"),
        cancelLabel: t("common.action.cancel"),
        destructive: true
      });
      if (!ok) return;
      items = items.filter((i) => i.id !== delBtn.dataset.id);
      root.querySelector(`tr[data-id="${delBtn.dataset.id}"]`)?.remove();
      await repo.delete(KIND, delBtn.dataset.id);
    }
  });
}
export {
  render
};
