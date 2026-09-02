import {
  createPricedGovernancePanel
} from "./chunk-5SXE3TKQ.js";
import {
  mountDateHints
} from "./chunk-OXNK6IJ2.js";
import {
  isViewSuperseded
} from "./chunk-2PLULDG2.js";
import {
  SECOND_EYES_FIELD,
  readSettings
} from "./chunk-IIUQ3SOM.js";
import {
  currentUserRole,
  currentUserRoles
} from "./chunk-M3ODLRBG.js";
import "./chunk-NGKBNKFN.js";
import {
  foldSyncFailure,
  renderMasterLoadRetryStatus,
  safeMasterLoad
} from "./chunk-V5A2B6CO.js";
import {
  canWriteMaster
} from "./chunk-T2XEYG3A.js";
import {
  deleteMaster,
  listMasters,
  saveMaster
} from "./chunk-XLNZASZM.js";
import "./chunk-JAZY43GR.js";
import {
  showConfirm
} from "./chunk-HKNQBDY4.js";
import {
  currentLocale,
  t
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/masters/air-rates.js
var KIND = "air-rates";
function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function breaksLabel(breaks) {
  if (!Array.isArray(breaks) || !breaks.length) return "\u2014";
  return breaks.map((b) => `${b.min_kg}kg@${b.rate_per_kg}`).join(" / ");
}
function buildModal(entity, primaryLabel) {
  const e = entity || {};
  const breaksJson = e.breaks ? JSON.stringify(e.breaks, null, 2) : '[\n  {"min_kg": 45, "rate_per_kg": 3.5}\n]';
  return `
    <dialog id="ar-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-lg backdrop:bg-black/30">
      <form id="ar-form" method="dialog" class="p-6 space-y-4">
        <div class="text-base font-semibold text-slate-900 mb-1">${entity ? t("air_rate.edit_title") : t("air_rate.add_button")}</div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("air_rate.field.route_origin")} <span class="text-red-500">*</span></label>
            <input id="ar-origin" type="text" maxlength="3" value="${escHtml(e.route_origin)}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("air_rate.field.route_dest")} <span class="text-red-500">*</span></label>
            <input id="ar-dest" type="text" maxlength="3" value="${escHtml(e.route_dest)}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("air_rate.field.carrier")} <span class="text-red-500">*</span></label>
            <input id="ar-carrier" type="text" maxlength="2" value="${escHtml(e.carrier_iata)}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("air_rate.field.currency")} <span class="text-red-500">*</span></label>
            <input id="ar-currency" type="text" maxlength="3" value="${escHtml(e.currency || "USD")}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("air_rate.field.valid_from")} <span class="text-red-500">*</span></label>
            <input id="ar-from" type="date" value="${escHtml(e.valid_from)}" lang="${currentLocale()}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("air_rate.field.valid_to")} <span class="text-red-500">*</span></label>
            <input id="ar-until" type="date" value="${escHtml(e.valid_to)}" lang="${currentLocale()}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("air_rate.field.break_tiers")} (JSON) <span class="text-red-500">*</span></label>
          <textarea id="ar-breaks" rows="5" required
                    class="w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400">${escHtml(breaksJson)}</textarea>
          <span id="ar-err-breaks" class="hidden text-xs text-red-600"></span>
        </div>
        <div class="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">${primaryLabel || t("common.action.save")}</button>
          <button type="button" id="ar-cancel" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">${t("common.action.cancel")}</button>
        </div>
      </form>
    </dialog>`;
}
function openModal(root, entity, onSave, primaryLabel) {
  root.querySelector("#ar-modal")?.remove();
  root.insertAdjacentHTML("beforeend", buildModal(entity, primaryLabel));
  const dialog = root.querySelector("#ar-modal");
  dialog.showModal();
  mountDateHints(dialog);
  dialog.querySelector("#ar-cancel").addEventListener("click", () => dialog.close());
  dialog.querySelector("#ar-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const origin = dialog.querySelector("#ar-origin").value.trim().toUpperCase();
    const dest = dialog.querySelector("#ar-dest").value.trim().toUpperCase();
    const carrier = dialog.querySelector("#ar-carrier").value.trim().toUpperCase();
    const currency = dialog.querySelector("#ar-currency").value.trim().toUpperCase();
    const validFrom = dialog.querySelector("#ar-from").value;
    const validUntil = dialog.querySelector("#ar-until").value;
    const breaksRaw = dialog.querySelector("#ar-breaks").value.trim();
    const setErr = (id2, msg) => {
      const el = dialog.querySelector(id2);
      if (!el) return;
      el.textContent = msg;
      el.classList.toggle("hidden", !msg);
    };
    setErr("#ar-err-breaks", "");
    let breaks;
    try {
      breaks = JSON.parse(breaksRaw);
    } catch {
      setErr("#ar-err-breaks", t("air_rate.err.invalid_json"));
      return;
    }
    if (!Array.isArray(breaks) || !breaks.length) {
      setErr("#ar-err-breaks", t("air_rate.err.break_required"));
      return;
    }
    const id = entity?.id || entity?.rate_id || `AR-${origin}-${dest}-${carrier}`;
    const updated = { ...entity || {}, id, rate_id: id, route_origin: origin, route_dest: dest, carrier_iata: carrier, breaks, valid_from: validFrom, valid_to: validUntil, currency, pricing_key: id };
    await onSave(updated);
    dialog.close();
  });
}
function rowHtml(e, isM) {
  const actions = isM ? `
    <button class="btn-edit text-xs text-blue-600 hover:underline mr-2" data-id="${e.id}">${t("common.action.edit")}</button>
    <button class="btn-delete text-xs text-red-500 hover:underline" data-id="${e.id}">${t("common.action.delete")}</button>` : "";
  return `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs" data-id="${e.id}">
      <td class="px-3 py-2 font-mono font-semibold">${escHtml(e.route_origin)}\u2192${escHtml(e.route_dest)}</td>
      <td class="px-3 py-2 font-mono">${escHtml(e.carrier_iata)}</td>
      <td class="px-3 py-2 text-[10px] text-slate-500 max-w-xs truncate">${escHtml(breaksLabel(e.breaks))}</td>
      <td class="px-3 py-2">${escHtml(e.valid_from)} \u2013 ${escHtml(e.valid_to)}</td>
      <td class="px-3 py-2 font-mono">${escHtml(e.currency)}</td>
      ${isM ? `<td class="px-3 py-2">${actions}</td>` : ""}
    </tr>`;
}
async function render(root) {
  const repo = window.__vdg_repo;
  const role = currentUserRole();
  const isM = canWriteMaster(KIND, currentUserRoles());
  const actCol = isM ? `<th class="px-3 py-2 text-left w-28">${t("common.col.actions")}</th>` : "";
  const settings = window.__vdg_workspace_settings ?? await readSettings(repo);
  const secondEyes = !!settings[SECOND_EYES_FIELD];
  const pricedRepo = window.__vdg_priced_repos?.[KIND];
  const panel = pricedRepo ? createPricedGovernancePanel({ pricedRepo, refName: KIND, role, secondEyes }) : null;
  if (isViewSuperseded(root)) return;
  root.innerHTML = `
    <div class="p-6 max-w-[1200px] mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div class="text-lg font-semibold text-slate-900">${t("air_rate.title")}</div>
        ${isM ? `<button id="btn-ar-add" class="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700">+ ${panel ? panel.primaryActionLabel() : t("air_rate.add_button")}</button>` : ""}
      </div>
      <div id="ar-pending" class="mb-4"></div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">${t("air_rate.field.route")}</th>
              <th class="px-3 py-2 text-left">${t("air_rate.field.carrier")}</th>
              <th class="px-3 py-2 text-left">${t("air_rate.field.break_tiers")}</th>
              <th class="px-3 py-2 text-left">${t("air_rate.col.validity")}</th>
              <th class="px-3 py-2 text-left">${t("air_rate.field.currency")}</th>
              ${actCol}
            </tr>
          </thead>
          <tbody id="ar-tbody"></tbody>
        </table>
        <div id="ar-empty" class="hidden text-center text-xs text-slate-400 py-8">${t("air_rate.empty")}</div>
      </div>
      <div id="ar-status" class="text-xs text-slate-400 mt-2">${t("common.load.loading")}</div>
    </div>`;
  let items = [];
  async function reload() {
    if (isViewSuperseded(root)) return;
    const tbody = root.querySelector("#ar-tbody");
    const emptyEl = root.querySelector("#ar-empty");
    const statusEl = root.querySelector("#ar-status");
    if (!repo) {
      items = [];
      if (tbody) tbody.innerHTML = "";
      if (statusEl) statusEl.textContent = "";
      return;
    }
    const listRes = foldSyncFailure(await safeMasterLoad(() => listMasters(KIND), "air-rates:list"), KIND, repo);
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
  const pendingEl = root.querySelector("#ar-pending");
  async function refreshPending() {
    await reload();
    if (isViewSuperseded(root)) return;
    if (panel && pendingEl) await safeMasterLoad(() => panel.renderPendingPanel(pendingEl, refreshPending), "air-rates:pending");
  }
  if (panel && pendingEl) await safeMasterLoad(() => panel.renderPendingPanel(pendingEl, refreshPending), "air-rates:pending");
  async function saveEntity(entity) {
    if (panel) await panel.commit(entity.id, entity);
    else await saveMaster(KIND, entity);
    await reload();
  }
  root.querySelector("#btn-ar-add")?.addEventListener("click", () => {
    openModal(root, null, saveEntity, panel?.primaryActionLabel());
  });
  root.querySelector("#ar-tbody")?.addEventListener("click", async (ev) => {
    const editBtn = ev.target.closest(".btn-edit");
    if (editBtn) {
      const entity = items.find((i) => i.id === editBtn.dataset.id);
      if (entity) openModal(root, entity, saveEntity, panel?.primaryActionLabel());
    }
    const delBtn = ev.target.closest(".btn-delete");
    if (delBtn) {
      const ok = await showConfirm({
        title: t("air_rate.delete_confirm"),
        confirmLabel: t("common.action.delete"),
        cancelLabel: t("common.action.cancel"),
        destructive: true
      });
      if (!ok) return;
      items = items.filter((i) => i.id !== delBtn.dataset.id);
      root.querySelector(`tr[data-id="${delBtn.dataset.id}"]`)?.remove();
      try {
        await deleteMaster(KIND, delBtn.dataset.id);
      } catch (err) {
        await showConfirm({ title: t("masters.delete_failed"), confirmLabel: t("common.action.ok"), cancelLabel: "" });
        console.warn("delete refused", err);
        return;
      }
    }
  });
}
export {
  render
};
