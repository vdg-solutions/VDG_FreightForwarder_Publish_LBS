import {
  createPricedGovernancePanel
} from "./chunk-HTOAYADZ.js";
import {
  SECOND_EYES_FIELD,
  readSettings
} from "./chunk-IIUQ3SOM.js";
import {
  currentUserRole,
  currentUserRoles
} from "./chunk-U7A2KJSA.js";
import "./chunk-CTHPHM7D.js";
import {
  renderMasterLoadRetryRow,
  safeMasterLoad
} from "./chunk-CVQ465MH.js";
import "./chunk-JAZY43GR.js";
import {
  canWriteMaster
} from "./chunk-T2XEYG3A.js";
import {
  showConfirm
} from "./chunk-FKMZGXJK.js";
import {
  currentLocale,
  t
} from "./chunk-NJFDQATX.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/masters/local-charges-modal.js
function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function uomLabel(u) {
  return currentLocale() === "en" ? u?.label_en || u?.label_vi || u?.code : u?.label_vi || u?.code;
}
function statusLabels() {
  return {
    free: t("local_charges.status.free"),
    not_applicable: t("local_charges.status.not_applicable"),
    on_request: t("local_charges.status.on_request")
  };
}
function dirLabels() {
  return { export: t("local_charges.dir.export"), import: t("local_charges.dir.import") };
}
function chargeKindLabels() {
  return {
    standard: t("local_charges.kind.standard"),
    demurrage: t("local_charges.kind.demurrage"),
    detention: t("local_charges.kind.detention")
  };
}
function genId(scac, chargeCode) {
  return `${(scac || "X").toUpperCase()}-${(chargeCode || "CHG").toUpperCase()}-${Date.now()}`;
}
function optionsHtml(map, selected) {
  return Object.entries(map).map(([v, l]) => `<option value="${v}" ${selected === v ? "selected" : ""}>${l}</option>`).join("");
}
function buildModal(entity, carriers, units, primaryLabel) {
  const e = entity || {};
  const aliases = (e.charge_aliases || []).join(", ");
  const mode = e.amount_status ? "status" : "priced";
  const carrierOpts = carriers.map((c) => `<option value="${escHtml(c.scac)}" ${e.line_scac === c.scac ? "selected" : ""}>${escHtml(c.name)}</option>`).join("");
  const unitOpts = units.map((u) => `<option value="${escHtml(u.code)}" ${e.unit_code === u.code ? "selected" : ""}>${escHtml(uomLabel(u))}</option>`).join("");
  return `
    <dialog id="lc-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-lg backdrop:bg-black/30">
      <form id="lc-modal-form" method="dialog" class="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <div class="text-base font-semibold text-slate-900 mb-1">${entity ? t("local_charges.modal.title_edit") : t("local_charges.modal.title_add")}</div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("local_charges.col.carrier")} <span class="text-red-500">*</span></label>
            <select id="m-line-scac" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="">${t("common.select.placeholder")}</option>${carrierOpts}</select>
            <span id="m-err-line" class="hidden text-xs text-red-600"></span>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("local_charges.modal.direction")}</label>
            <select id="m-direction" class="w-full border rounded-lg px-3 py-2 text-sm">${optionsHtml(dirLabels(), e.direction || "export")}</select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("local_charges.modal.charge_name")} <span class="text-red-500">*</span></label>
            <input id="m-charge-name" type="text" value="${escHtml(e.charge_name)}" class="w-full border rounded-lg px-3 py-2 text-sm" />
            <span id="m-err-charge-name" class="hidden text-xs text-red-600"></span>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("local_charges.modal.charge_code")} <span class="text-red-500">*</span></label>
            <input id="m-charge-code" type="text" value="${escHtml(e.charge_code)}" class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" />
            <span id="m-err-charge-code" class="hidden text-xs text-red-600"></span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("local_charges.modal.unit_label")} <span class="text-red-500">*</span></label>
            <select id="m-unit-code" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="">${t("common.select.placeholder")}</option>${unitOpts}</select>
            <span id="m-err-unit" class="hidden text-xs text-red-600"></span>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("local_charges.modal.charge_kind")}</label>
            <select id="m-charge-kind" class="w-full border rounded-lg px-3 py-2 text-sm">${optionsHtml(chargeKindLabels(), e.charge_kind || "standard")}</select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("local_charges.modal.free_days")}</label>
          <input id="m-free-days" type="number" min="0" value="${e.free_days ?? ""}" class="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("local_charges.modal.amount_mode")}</label>
          <select id="m-amount-mode" class="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="priced" ${mode === "priced" ? "selected" : ""}>${t("local_charges.modal.mode_priced")}</option>
            <option value="status" ${mode === "status" ? "selected" : ""}>${t("local_charges.modal.mode_status")}</option>
          </select>
        </div>
        <div id="m-priced-fields" class="grid grid-cols-2 gap-3 ${mode === "status" ? "hidden" : ""}">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("local_charges.modal.amt_excl")}</label>
            <input id="m-amt-ex" type="number" min="0" value="${e.amount_exclude_vat ?? ""}" class="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("local_charges.modal.amt_incl")}</label>
            <input id="m-amt-inc" type="number" min="0" value="${e.amount_include_vat ?? ""}" class="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div id="m-status-fields" class="${mode === "priced" ? "hidden" : ""}">
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("local_charges.modal.amount_status")}</label>
          <select id="m-amount-status" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="">${t("common.select.placeholder")}</option>${optionsHtml(statusLabels(), e.amount_status)}</select>
        </div>
        <span id="m-err-amount" class="hidden text-xs text-red-600"></span>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("common.field.aliases")}</label>
          <input id="m-aliases" type="text" value="${escHtml(aliases)}" placeholder="comma-separated" class="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div class="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">${primaryLabel || t("common.action.save")}</button>
          <button type="button" id="btn-lc-cancel" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">${t("common.action.cancel")}</button>
        </div>
      </form>
    </dialog>`;
}
function openModal(root, entity, carriers, units, onSave, primaryLabel) {
  root.querySelector("#lc-modal")?.remove();
  root.insertAdjacentHTML("beforeend", buildModal(entity, carriers, units, primaryLabel));
  const dialog = root.querySelector("#lc-modal");
  dialog.showModal();
  dialog.querySelector("#btn-lc-cancel").addEventListener("click", () => dialog.close());
  dialog.querySelector("#m-amount-mode").addEventListener("change", (ev) => {
    const isStatus = ev.target.value === "status";
    dialog.querySelector("#m-priced-fields").classList.toggle("hidden", isStatus);
    dialog.querySelector("#m-status-fields").classList.toggle("hidden", !isStatus);
  });
  dialog.querySelector("#lc-modal-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const setErr = (id, msg) => {
      const el = dialog.querySelector(id);
      if (!el) return;
      el.textContent = msg;
      el.classList.toggle("hidden", !msg);
    };
    ["#m-err-line", "#m-err-charge-name", "#m-err-charge-code", "#m-err-unit", "#m-err-amount"].forEach((id) => setErr(id, ""));
    const lineScac = dialog.querySelector("#m-line-scac").value;
    const chargeName = dialog.querySelector("#m-charge-name").value.trim();
    const chargeCode = dialog.querySelector("#m-charge-code").value.trim().toUpperCase();
    const unitCode = dialog.querySelector("#m-unit-code").value;
    const direction = dialog.querySelector("#m-direction").value;
    const chargeKind = dialog.querySelector("#m-charge-kind").value;
    const freeDaysRaw = dialog.querySelector("#m-free-days").value;
    const amountMode = dialog.querySelector("#m-amount-mode").value;
    const aliases = dialog.querySelector("#m-aliases").value.split(",").map((a) => a.trim()).filter(Boolean);
    if (!lineScac) {
      setErr("#m-err-line", t("local_charges.modal.err_carrier_required"));
      return;
    }
    if (!chargeName) {
      setErr("#m-err-charge-name", t("local_charges.modal.err_charge_name_required"));
      return;
    }
    if (!chargeCode) {
      setErr("#m-err-charge-code", t("local_charges.modal.err_charge_code_required"));
      return;
    }
    if (!unitCode) {
      setErr("#m-err-unit", t("local_charges.modal.err_unit_required"));
      return;
    }
    let amountFields;
    if (amountMode === "status") {
      const status = dialog.querySelector("#m-amount-status").value;
      if (!status) {
        setErr("#m-err-amount", t("local_charges.modal.err_status_required"));
        return;
      }
      amountFields = { amount_status: status };
    } else {
      const exVat = Number(dialog.querySelector("#m-amt-ex").value);
      const incVat = Number(dialog.querySelector("#m-amt-inc").value);
      if (!Number.isFinite(exVat) || exVat < 0 || !Number.isFinite(incVat) || incVat < 0) {
        setErr("#m-err-amount", t("local_charges.modal.err_amount_invalid"));
        return;
      }
      amountFields = { amount_exclude_vat: exVat, amount_include_vat: incVat };
    }
    const carrier = carriers.find((c) => c.scac === lineScac);
    const freeDays = chargeKind === "standard" || freeDaysRaw === "" ? null : Number(freeDaysRaw);
    const base = { ...entity || {} };
    delete base.amount_status;
    delete base.amount_exclude_vat;
    delete base.amount_include_vat;
    delete base.free_days;
    const updated = {
      ...base,
      id: entity?.id || genId(lineScac, chargeCode),
      line_scac: lineScac,
      line_name: carrier?.name || entity?.line_name || lineScac,
      charge_name: chargeName,
      charge_code: chargeCode,
      unit_code: unitCode,
      direction,
      charge_kind: chargeKind,
      charge_aliases: aliases,
      ...amountFields
    };
    if (freeDays !== null) updated.free_days = freeDays;
    else delete updated.free_days;
    await onSave(updated);
    dialog.close();
  });
}

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/masters/local-charges.js
var LOAD_COL_SPAN = 6;
var KIND = "local-charges";
var UNIT_KIND = "units-of-measure";
var CARRIER_KIND = "ocean-carriers";
function escHtml2(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function norm(s) {
  return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function fmtVnd(n) {
  return n || n === 0 ? Number(n).toLocaleString("vi-VN") : "\u2014";
}
var ISO_LENGTH_BY_CODE = { "2": "20'", "4": "40'", "L": "45'" };
function containerLabel(iso) {
  if (!iso) return "\u2014";
  const len = ISO_LENGTH_BY_CODE[iso[0]];
  return len && iso.length === 4 ? `${len} (${iso})` : iso;
}
function uomLabel2(u) {
  return currentLocale() === "en" ? u?.label_en || u?.label_vi || u?.code : u?.label_vi || u?.code;
}
function canWrite(roles) {
  return canWriteMaster(KIND, roles);
}
function rowHtml(c, unitLabel, carrierLabel, isEditor) {
  const amt = c.amount_status ? `<span class="text-slate-400 italic">${statusLabels()[c.amount_status] || c.amount_status}</span>` : `${fmtVnd(c.amount_exclude_vat)} <span class="text-slate-300">/</span> <span class="text-slate-900 font-medium">${fmtVnd(c.amount_include_vat)}</span>`;
  const kindBadge = c.charge_kind !== "standard" ? `<span class="ml-1 px-1 py-0.5 rounded text-[9px] bg-amber-100 text-amber-700">${c.charge_kind === "demurrage" ? t("local_charges.badge.dem") : t("local_charges.badge.det")}</span>` : "";
  const searchStr = norm([c.line_name, c.charge_name, c.charge_code, unitLabel, ...c.line_aliases || [], ...c.charge_aliases || []].join(" "));
  const actions = isEditor ? `
    <button class="btn-edit text-xs text-blue-600 hover:underline mr-2" data-id="${escHtml2(c.id)}">${t("common.action.edit")}</button>
    <button class="btn-delete text-xs text-red-500 hover:underline" data-id="${escHtml2(c.id)}">${t("common.action.delete")}</button>` : "";
  return `
    <tr class="border-b border-slate-100 hover:bg-slate-50" data-id="${escHtml2(c.id)}" data-line="${escHtml2(c.line_scac)}" data-dir="${escHtml2(c.direction)}" data-search="${escHtml2(searchStr)}">
      <td class="py-2 px-3 text-xs text-slate-600">${escHtml2(carrierLabel)}</td>
      <td class="py-2 px-3 text-xs font-medium text-slate-900">${escHtml2(c.charge_name)}${kindBadge}
        <div class="text-[10px] text-slate-400 font-normal">${escHtml2(c.charge_description || "")}</div></td>
      <td class="py-2 px-3 text-xs text-slate-600 whitespace-nowrap">${escHtml2(containerLabel(c.container_iso6346))}</td>
      <td class="py-2 px-3 text-xs text-slate-600">${escHtml2(unitLabel)}</td>
      <td class="py-2 px-3 text-xs text-right whitespace-nowrap">${amt}</td>
      <td class="py-2 px-3 text-[10px] text-slate-400">${c.route_via_unlocode ? t("local_charges.route_via_cai_mep") : ""} ${c.free_days != null ? `FreeDay ${c.free_days}` : ""}</td>
      ${isEditor ? `<td class="py-2 px-3">${actions}</td>` : ""}
    </tr>`;
}
async function render(root) {
  const repo = window.__vdg_repo;
  const role = currentUserRole();
  const isEditor = canWrite(currentUserRoles());
  const pricedRepo = window.__vdg_priced_repos?.[KIND];
  const settings = window.__vdg_workspace_settings ?? await readSettings(repo);
  const secondEyes = !!settings[SECOND_EYES_FIELD];
  const panel = pricedRepo ? createPricedGovernancePanel({ pricedRepo, refName: KIND, role, secondEyes, liveRepo: repo }) : null;
  const colSpan = LOAD_COL_SPAN + (isEditor ? 1 : 0);
  const headers = [t("local_charges.col.carrier"), t("local_charges.col.charge"), t("local_charges.col.container"), t("local_charges.col.unit"), t("local_charges.col.amount_vat"), ""];
  if (isEditor) headers.push(t("common.col.actions"));
  root.innerHTML = `
    <div class="p-6">
      <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 class="text-lg font-semibold text-slate-900">${t("local_charges.title")}</h1>
          <p class="text-xs text-slate-500">${t("local_charges.subtitle")}</p>
        </div>
        <div class="flex gap-2 items-center">
          <select id="lc-line" class="border border-slate-200 rounded-lg px-2 py-2 text-sm"></select>
          <select id="lc-dir" class="border border-slate-200 rounded-lg px-2 py-2 text-sm">
            <option value="">${t("local_charges.dir.all")}</option><option value="export">${t("local_charges.dir.export")}</option><option value="import">${t("local_charges.dir.import")}</option>
          </select>
          <input id="lc-search" type="search" placeholder="${t("local_charges.search_placeholder")}" class="w-48 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          ${isEditor ? `<button id="btn-lc-add" class="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 whitespace-nowrap">${panel ? panel.primaryActionLabel() : t("common.action.add")}</button>` : ""}
        </div>
      </div>
      <div id="lc-pending" class="mb-4"></div>
      <div class="rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-50"><tr>${headers.map((h) => `<th class="py-2 px-3 text-xs font-medium text-slate-600">${h}</th>`).join("")}</tr></thead>
          <tbody id="lc-body"><tr><td colspan="${colSpan}" class="p-4 text-slate-400 text-center text-xs">${t("common.load.loading")}</td></tr></tbody>
        </table>
      </div>
    </div>`;
  const body = root.querySelector("#lc-body");
  if (!repo) {
    body.innerHTML = `<tr><td colspan="${colSpan}" class="p-4 text-red-500 text-center text-xs">${t("common.load.not_ready")}</td></tr>`;
    return;
  }
  let charges = [];
  let units = [];
  let carriers = [];
  async function loadAndRender() {
    const loadRes = await safeMasterLoad(() => Promise.all([
      repo.list(KIND, null).catch(() => []),
      repo.list(UNIT_KIND, null).catch(() => []),
      repo.list(CARRIER_KIND, null).catch(() => [])
    ]), "local-charges:load");
    if (!loadRes.ok) {
      renderMasterLoadRetryRow(body, colSpan, t("common.load.error"), t("common.load.retry"), loadAndRender);
      return;
    }
    [charges, units, carriers] = loadRes.value;
    const unitLabel = new Map(units.map((u) => [u.code, uomLabel2(u)]));
    const carrierName = new Map(carriers.map((oc) => [oc.scac, oc.name]));
    const lines = [...new Map(charges.map((c) => [c.line_scac, c.line_name])).entries()];
    root.querySelector("#lc-line").innerHTML = `<option value="">${t("local_charges.filter.all_carriers")}</option>` + lines.map(([scac, name]) => `<option value="${escHtml2(scac)}">${escHtml2(name)}</option>`).join("");
    charges.sort((a, b) => (a.line_name || "").localeCompare(b.line_name || "") || (a.direction || "").localeCompare(b.direction || "") || (a.charge_code || "").localeCompare(b.charge_code || ""));
    body.innerHTML = charges.length ? charges.map((c) => rowHtml(c, unitLabel.get(c.unit_code) || c.unit_code, carrierName.get(c.line_scac) || c.line_name, isEditor)).join("") : `<tr><td colspan="${colSpan}" class="p-4 text-slate-400 text-center text-xs">${t("local_charges.empty")}</td></tr>`;
  }
  await loadAndRender();
  const apply = () => {
    const line = root.querySelector("#lc-line").value;
    const dir = root.querySelector("#lc-dir").value;
    const q = norm(root.querySelector("#lc-search").value);
    body.querySelectorAll("tr[data-search]").forEach((tr) => {
      const ok = (!line || tr.dataset.line === line) && (!dir || tr.dataset.dir === dir) && (!q || tr.dataset.search.includes(q));
      tr.style.display = ok ? "" : "none";
    });
  };
  root.querySelector("#lc-line").addEventListener("change", apply);
  root.querySelector("#lc-dir").addEventListener("change", apply);
  root.querySelector("#lc-search").addEventListener("input", apply);
  const pendingEl = root.querySelector("#lc-pending");
  async function refreshPending() {
    await loadAndRender();
    apply();
    if (panel && pendingEl) await panel.renderPendingPanel(pendingEl, refreshPending);
  }
  if (panel && pendingEl) await panel.renderPendingPanel(pendingEl, refreshPending);
  async function saveEntity(entity) {
    if (panel) await panel.commit(entity.id, entity);
    else await repo.put(KIND, entity.id, entity);
    await loadAndRender();
    apply();
  }
  root.querySelector("#btn-lc-add")?.addEventListener("click", () => {
    openModal(root, null, carriers, units, saveEntity, panel?.primaryActionLabel());
  });
  body.addEventListener("click", async (ev) => {
    const editBtn = ev.target.closest(".btn-edit");
    if (editBtn) {
      const entity = charges.find((i) => i.id === editBtn.dataset.id);
      if (entity) openModal(root, entity, carriers, units, saveEntity, panel?.primaryActionLabel());
    }
    const delBtn = ev.target.closest(".btn-delete");
    if (delBtn) {
      const ok = await showConfirm({
        title: t("local_charges.confirm_delete"),
        confirmLabel: t("common.action.delete"),
        cancelLabel: t("common.action.cancel"),
        destructive: true
      });
      if (!ok) return;
      charges = charges.filter((i) => i.id !== delBtn.dataset.id);
      body.querySelector(`tr[data-id="${delBtn.dataset.id}"]`)?.remove();
      await repo.delete(KIND, delBtn.dataset.id);
    }
  });
}
export {
  render
};
