import {
  clearRateCache
} from "./chunk-HO7NUC3X.js";
import {
  isViewSuperseded
} from "./chunk-2PLULDG2.js";
import {
  currentUserRole
} from "./chunk-Z5J2LHCQ.js";
import {
  fxRateRepo
} from "./chunk-ZRBZYMV7.js";
import {
  readSettings
} from "./chunk-IIUQ3SOM.js";
import {
  renderMasterLoadRetryStatus,
  safeMasterLoad
} from "./chunk-J2L475OW.js";
import "./chunk-JAZY43GR.js";
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

// output/web/js.tmp/implementations/kernel/core_abstractions/util/validate-rate.js
var VALID_RATE_MIN = 0;
var VALID_RATE_MAX = 1e5;
var FX_PAIR_DEFAULT = "USD/VND";
function validateRate(rawValue) {
  const n = Number(rawValue);
  if (!rawValue || isNaN(n) || n <= VALID_RATE_MIN || n >= VALID_RATE_MAX) {
    return "fx.validation.bad_rate";
  }
  return null;
}
async function addRateEntry(repo, validFrom, validTo, pair, rate, source, role, deleteFirst) {
  if (validFrom > validTo) return "fx.validation.bad_range";
  if (deleteFirst) {
    try {
      await repo.deleteEntry(deleteFirst.valid_from, deleteFirst.valid_to, deleteFirst.pair || pair);
    } catch {
    }
  }
  await repo.appendRate(
    JSON.stringify({ valid_from: validFrom, valid_to: validTo, pair, rate: Number(rate), source }),
    role
  );
  return null;
}

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/fx-rates.js
var SOURCE_OPTIONS = ["Vietcombank", "SBV", "Manual"];
var TOAST_MS = 4e3;
var LOAD_TAG = "fx-rates:list";
var SOURCE_TAG = "fx-rates:source";
var VIEW_DATA_LOAD_BUDGET_MS = 6e3;
function toast(type, msg) {
  window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { type, message: msg, duration: TOAST_MS } }));
}
async function loadDefaultSource() {
  return (await readSettings(window.__vdg_repo)).fx_source;
}
function sourceLabel(src) {
  const map = { SBV: "fx.source.sbv", Vietcombank: "fx.source.vcb", Manual: "fx.source.manual" };
  return t(map[src] || "fx.source.manual");
}
function renderGrid(container, entries, onEdit, onDelete) {
  if (!entries.length) {
    container.innerHTML = `<p class="text-sm text-slate-400 py-4">${t("no_data")}</p>`;
    return;
  }
  const rows = entries.map((e, i) => `
    <tr class="border-t border-slate-100 hover:bg-slate-50">
      <td class="px-3 py-2 text-sm">${e.valid_from || "\u2014"}</td>
      <td class="px-3 py-2 text-sm">${e.valid_to || "\u2014"}</td>
      <td class="px-3 py-2 text-sm">${e.pair || FX_PAIR_DEFAULT}</td>
      <td class="px-3 py-2 text-sm font-mono text-right">${e.rate != null ? Number(e.rate).toLocaleString("vi-VN") : "\u2014"}</td>
      <td class="px-3 py-2 text-sm">${sourceLabel(e.source)}</td>
      <td class="px-3 py-2 text-xs flex gap-2">
        <button data-edit="${i}" class="text-blue-600 hover:underline">${t("fx.admin.edit")}</button>
        <button data-delete="${i}" class="text-red-500 hover:underline">${t("fx.admin.delete")}</button>
      </td>
    </tr>`).join("");
  container.innerHTML = `
    <div class="overflow-x-auto rounded-lg border border-slate-200">
      <table class="w-full text-left" id="fx-grid">
        <thead class="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <th class="px-3 py-2">${t("fx.admin.col_valid_from")}</th>
            <th class="px-3 py-2">${t("fx.admin.col_valid_to")}</th>
            <th class="px-3 py-2">${t("fx.admin.col_pair")}</th>
            <th class="px-3 py-2 text-right">${t("fx.admin.col_rate")}</th>
            <th class="px-3 py-2">${t("fx.admin.col_source")}</th>
            <th class="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  container.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => onEdit(entries[Number(btn.dataset.edit)]));
  });
  container.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => onDelete(entries[Number(btn.dataset.delete)]));
  });
}
function addFormHtml(defaultSource, prefill = {}) {
  const srcOpts = SOURCE_OPTIONS.map(
    (s) => `<option value="${s}"${s === (prefill.source || defaultSource) ? " selected" : ""}>${sourceLabel(s)}</option>`
  ).join("");
  return `
    <form id="fx-add-form" class="flex flex-wrap gap-3 items-end mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div class="flex flex-col gap-1">
        <label class="text-[11px] font-medium text-slate-500 uppercase">${t("fx.admin.col_valid_from")}</label>
        <input name="valid_from" type="date" value="${prefill.valid_from || ""}" required
          class="border border-slate-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-[11px] font-medium text-slate-500 uppercase">${t("fx.admin.col_valid_to")}</label>
        <input name="valid_to" type="date" value="${prefill.valid_to || ""}" required
          class="border border-slate-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-[11px] font-medium text-slate-500 uppercase">${t("fx.admin.col_rate")} (${FX_PAIR_DEFAULT})</label>
        <input name="rate" type="number" value="${prefill.rate || ""}" required placeholder="26460"
          class="border border-slate-200 rounded px-2.5 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-100" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-[11px] font-medium text-slate-500 uppercase">${t("fx.admin.col_source")}</label>
        <select name="source"
          class="border border-slate-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
          ${srcOpts}
        </select>
      </div>
      <button type="submit"
        class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
        ${t("fx.admin.add")}
      </button>
      <span id="fx-form-err" class="text-xs text-red-500 self-center"></span>
    </form>`;
}
async function render(root) {
  if (!hasRole(ROLE_MANAGER)) {
    navigate("/dashboard");
    return;
  }
  let entries = [], defSrc = "Manual";
  root.innerHTML = `
    <div class="p-6 space-y-4 max-w-4xl mx-auto">
      <h2 class="text-lg font-semibold text-slate-800">${t("fx.admin.title")}</h2>
      <div id="fx-grid-wrap"></div>
      <div id="fx-form-wrap"></div>
      <div id="fx-status" class="text-xs text-slate-400"></div>
    </div>`;
  const gridWrap = root.querySelector("#fx-grid-wrap");
  const formWrap = root.querySelector("#fx-form-wrap");
  const statusEl = root.querySelector("#fx-status");
  async function reload(prefill = {}) {
    if (isViewSuperseded(root)) return;
    const [listRes, srcRes] = await Promise.all([
      safeMasterLoad(() => fxRateRepo.listAll(), LOAD_TAG, VIEW_DATA_LOAD_BUDGET_MS),
      safeMasterLoad(loadDefaultSource, SOURCE_TAG, VIEW_DATA_LOAD_BUDGET_MS)
    ]);
    if (isViewSuperseded(root)) return;
    defSrc = srcRes.ok ? srcRes.value : "Manual";
    if (!listRes.ok) {
      gridWrap.innerHTML = "";
      renderMasterLoadRetryStatus(statusEl, t("masters.load_error"), t("retry"), () => reload());
      return;
    }
    entries = listRes.value;
    statusEl.textContent = "";
    renderGrid(gridWrap, entries, onEdit, onDelete);
    formWrap.innerHTML = addFormHtml(defSrc, prefill);
    wireForm(prefill._deleteFirst ?? null);
  }
  function onEdit(entry) {
    formWrap.innerHTML = addFormHtml(defSrc, {
      valid_from: entry.valid_from,
      valid_to: entry.valid_to,
      rate: entry.rate,
      source: entry.source,
      _deleteFirst: entry
    });
    wireForm(entry);
  }
  async function onDelete(entry) {
    try {
      await fxRateRepo.deleteEntry(entry.valid_from, entry.valid_to, entry.pair || FX_PAIR_DEFAULT);
      clearRateCache();
      toast("success", `${t("fx.admin.delete")}: ${entry.valid_from}`);
    } catch (err) {
      toast("error", err.message);
    }
    await reload();
  }
  function wireForm(deleteFirst) {
    const form = root.querySelector("#fx-add-form");
    const errEl = root.querySelector("#fx-form-err");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errEl.textContent = "";
      const fd = new FormData(form);
      const validFrom = fd.get("valid_from") || "";
      const validTo = fd.get("valid_to") || "";
      const rate = fd.get("rate") || "";
      const source = fd.get("source") || "Manual";
      const validErr = validateRate(rate);
      if (validErr) {
        errEl.textContent = t(validErr);
        return;
      }
      try {
        const entryErr = await addRateEntry(
          fxRateRepo,
          validFrom,
          validTo,
          FX_PAIR_DEFAULT,
          rate,
          source,
          currentUserRole(),
          deleteFirst
        );
        if (entryErr) {
          errEl.textContent = t(entryErr);
          return;
        }
        clearRateCache();
        toast("success", t("fx.admin.add"));
        await reload();
      } catch (err) {
        errEl.textContent = err.message;
      }
    });
  }
  await reload();
}
export {
  render
};
