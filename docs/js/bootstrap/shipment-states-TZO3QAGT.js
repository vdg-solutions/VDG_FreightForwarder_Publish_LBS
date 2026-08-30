import {
  migrateLegacyShipmentState
} from "./chunk-NM5PQAZF.js";
import {
  SHIPMENT_STATES_KIND
} from "./chunk-FJ72A4AS.js";
import {
  renderMasterLoadRetryRow,
  safeMasterLoad
} from "./chunk-2CUGKPB3.js";
import {
  canWriteMaster
} from "./chunk-T2XEYG3A.js";
import {
  currentRoles
} from "./chunk-NQTRREKJ.js";
import "./chunk-JAZY43GR.js";
import {
  showConfirm
} from "./chunk-HKNQBDY4.js";
import {
  t
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/masters/shipment-states-modal.js
function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function buildModal(entity) {
  const e = entity || {};
  const aliases = (e.aliases || []).join(", ");
  return `
    <dialog id="ss-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-lg backdrop:bg-black/30">
      <form id="ss-modal-form" method="dialog" class="p-6 space-y-4">
        <div class="text-base font-semibold text-slate-900 mb-1">${t("shipment_states.modal.title_edit")}</div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("shipment_states.modal.code_label")}</label>
          <input id="ss-code" type="text" value="${escHtml(e.code)}" readonly
                 class="w-full border rounded-lg px-3 py-2 text-sm font-mono bg-slate-50 text-slate-500" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("shipment_states.modal.label_vi_label")}</label>
            <input id="ss-label-vi" type="text" value="${escHtml(e.label_vi)}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("shipment_states.modal.label_en_label")}</label>
            <input id="ss-label-en" type="text" value="${escHtml(e.label_en)}"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <span id="ss-err-label-vi" class="hidden text-xs text-red-600"></span>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("shipment_states.modal.aliases_label")}</label>
          <input id="ss-aliases" type="text" value="${escHtml(aliases)}" placeholder="${t("shipment_states.modal.aliases_placeholder")}"
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div class="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">${t("shipment_states.modal.save")}</button>
          <button type="button" id="btn-ss-cancel" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">${t("shipment_states.modal.cancel")}</button>
        </div>
      </form>
    </dialog>`;
}
function openModal(root, entity, onSave) {
  root.querySelector("#ss-modal")?.remove();
  root.insertAdjacentHTML("beforeend", buildModal(entity));
  const dialog = root.querySelector("#ss-modal");
  dialog.showModal();
  dialog.querySelector("#btn-ss-cancel").addEventListener("click", () => dialog.close());
  dialog.querySelector("#ss-modal-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const labelVi = dialog.querySelector("#ss-label-vi").value.trim();
    const labelEn = dialog.querySelector("#ss-label-en").value.trim();
    const aliases = dialog.querySelector("#ss-aliases").value.split(",").map((a) => a.trim()).filter(Boolean);
    const errEl = dialog.querySelector("#ss-err-label-vi");
    if (!labelVi) {
      errEl.textContent = t("shipment_states.modal.err_label_vi_required");
      errEl.classList.remove("hidden");
      return;
    }
    errEl.classList.add("hidden");
    const updated = { ...entity || {}, code: entity.code, label_vi: labelVi, label_en: labelEn, aliases };
    await onSave(updated);
    dialog.close();
  });
}

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/masters/shipment-states.js
var KIND = SHIPMENT_STATES_KIND;
var BASE_COL_SPAN = 4;
function escHtml2(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function canWrite() {
  return canWriteMaster(KIND, currentRoles());
}
async function loadStates(repo) {
  return safeMasterLoad(async () => await repo.list(KIND, null).catch(() => []) || [], "shipment-states:load");
}
function rowHtml(s, isEditor) {
  const aliases = (s.aliases || []).map((a) => `<span class="inline-block px-1.5 py-0.5 mr-1 mb-1 rounded bg-slate-100 text-slate-600 text-[10px]">${escHtml2(a)}</span>`).join("");
  const actions = isEditor ? `<button class="btn-edit text-xs text-blue-600 hover:underline" data-code="${escHtml2(s.code)}">${t("shipment_states.action.edit")}</button>` : "";
  return `
    <tr class="border-b border-slate-100 hover:bg-slate-50" data-code="${escHtml2(s.code)}">
      <td class="py-2 px-3 text-xs font-medium text-slate-900">${escHtml2(s.label_vi)}</td>
      <td class="py-2 px-3 text-xs text-slate-500">${escHtml2(s.label_en)}</td>
      <td class="py-2 px-3 text-[10px] font-mono text-slate-400">${escHtml2(s.code)}</td>
      <td class="py-2 px-3">${aliases}</td>
      ${isEditor ? `<td class="py-2 px-3">${actions}</td>` : ""}
    </tr>`;
}
function migrationSectionHtml() {
  return `
    <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
      <p class="text-xs text-slate-500 max-w-md">${t("shipment_states.migration.subtitle")}</p>
      <button id="btn-ss-migrate" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg whitespace-nowrap">${t("shipment_states.migration.button")}</button>
    </div>`;
}
function toast(type, message) {
  window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { type, message } }));
}
async function render(root) {
  const repo = window.__vdg_repo;
  const isEditor = canWrite();
  const colSpan = BASE_COL_SPAN + (isEditor ? 1 : 0);
  const headers = [t("shipment_states.col.label_vi"), t("shipment_states.col.label_en"), t("shipment_states.col.code"), t("shipment_states.col.aliases")];
  if (isEditor) headers.push(t("shipment_states.col.actions"));
  root.innerHTML = `
    <div class="p-6">
      <div class="mb-4">
        <h1 class="text-lg font-semibold text-slate-900">${t("shipment_states.title")}</h1>
        <p class="text-xs text-slate-500">${t("shipment_states.subtitle")}</p>
      </div>
      <div class="rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-50">
            <tr>${headers.map((h) => `<th class="py-2 px-3 text-xs font-medium text-slate-600">${h}</th>`).join("")}</tr>
          </thead>
          <tbody id="ss-body"><tr><td colspan="${colSpan}" class="p-4 text-slate-400 text-center text-xs">${t("loading")}</td></tr></tbody>
        </table>
      </div>
      ${isEditor ? migrationSectionHtml() : ""}
    </div>`;
  const body = root.querySelector("#ss-body");
  if (!repo) {
    body.innerHTML = `<tr><td colspan="${colSpan}" class="p-4 text-red-500 text-center text-xs">${t("shipment_states.not_ready")}</td></tr>`;
    return;
  }
  let states = [];
  async function loadAndRender() {
    const loadRes = await loadStates(repo);
    if (!loadRes.ok) {
      renderMasterLoadRetryRow(body, colSpan, t("shipment_states.load_error"), t("shipment_states.load_retry"), loadAndRender);
      return;
    }
    states = loadRes.value;
    states.sort((a, b) => (a.code || "").localeCompare(b.code || ""));
    body.innerHTML = states.length ? states.map((s) => rowHtml(s, isEditor)).join("") : `<tr><td colspan="${colSpan}" class="p-4 text-slate-400 text-center text-xs">${t("shipment_states.empty")}</td></tr>`;
  }
  await loadAndRender();
  body.addEventListener("click", (ev) => {
    const editBtn = ev.target.closest(".btn-edit");
    if (!editBtn) return;
    const entity = states.find((s) => s.code === editBtn.dataset.code);
    if (entity) openModal(root, entity, async (u) => {
      await repo.put(KIND, u.code, u);
      await loadAndRender();
    });
  });
  root.querySelector("#btn-ss-migrate")?.addEventListener("click", async () => {
    const ok = await showConfirm({
      title: t("shipment_states.migration.confirm_title"),
      body: t("shipment_states.migration.confirm_body"),
      confirmLabel: t("shipment_states.migration.button"),
      cancelLabel: t("common.action.cancel")
    });
    if (!ok) return;
    try {
      const result = await migrateLegacyShipmentState(repo, states);
      toast("success", t("shipment_states.migration.result", { found: result.found, migrated: result.migrated, skipped: result.skippedUnresolved }));
    } catch (err) {
      console.error("[shipment-states] migration failed:", err);
      toast("error", err.message);
    }
  });
}
export {
  render
};
