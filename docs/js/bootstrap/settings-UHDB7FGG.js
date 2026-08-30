import {
  DEFAULT_HEADER_CURRENCY,
  LINE_CURRENCY_OPTIONS
} from "./chunk-F5IKEROO.js";
import "./chunk-OXNK6IJ2.js";
import "./chunk-QOACCM4N.js";
import {
  LOCK_REASON_PERIOD_CLOSED,
  canEditDefaultCurrency,
  periodOf
} from "./chunk-CHLQ7LZW.js";
import {
  getCurrentPeriodLock
} from "./chunk-QL3VBJTQ.js";
import "./chunk-53TPUVAF.js";
import {
  DEFAULT_CURRENCY_FIELD,
  loadWorkspaceSettings,
  saveWorkspaceSettings
} from "./chunk-IIUQ3SOM.js";
import {
  activeWorkspaceName
} from "./chunk-O35WEKMP.js";
import {
  listShipments
} from "./chunk-U4BJYZQA.js";
import {
  safeMasterLoad
} from "./chunk-2CUGKPB3.js";
import "./chunk-JAZY43GR.js";
import {
  t
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/accounting/settings.js
var TOAST_MS = 4e3;
function getApi() {
  return window.__vdg_drive_api;
}
function getRepo() {
  return window.__vdg_repo;
}
function toast(type, msg) {
  window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { type, message: msg, duration: TOAST_MS } }));
}
function selectableCurrencies() {
  const bridge = window.workspace_selectable_currencies;
  if (typeof bridge !== "function") return LINE_CURRENCY_OPTIONS;
  try {
    return JSON.parse(bridge());
  } catch {
    return LINE_CURRENCY_OPTIONS;
  }
}
function lockNoticeHtml(lock) {
  if (lock.editable) return "";
  const key = lock.reason === LOCK_REASON_PERIOD_CLOSED ? "settings.default_currency.locked_closed" : "settings.default_currency.locked_in_period";
  return `<span class="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
    ${t(key, { n: lock.jobCount })}</span>`;
}
function formHtml(settings, lock) {
  const curOpts = selectableCurrencies().map(
    (c) => `<option value="${c}"${c === settings[DEFAULT_CURRENCY_FIELD] ? " selected" : ""}>${c}</option>`
  ).join("");
  const frozen = lock.editable ? "" : " disabled";
  return `
    <form id="acct-settings-form" class="space-y-4 max-w-sm">
      <div class="flex flex-col gap-1">
        <label class="text-[11px] font-medium text-slate-500 uppercase tracking-wider" for="default-currency">
          ${t("settings.default_currency.label")}
        </label>
        <select id="default-currency" name="${DEFAULT_CURRENCY_FIELD}"${frozen}
          class="border border-slate-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100${frozen ? " bg-slate-50 text-slate-500" : " bg-white"}">
          ${curOpts}
        </select>
        <span class="text-[11px] text-slate-400">${t("settings.default_currency.hint")}</span>
        ${lockNoticeHtml(lock)}
      </div>
      <div class="flex gap-3 items-center">
        <button type="submit"${frozen}
          class="px-4 py-2 text-white text-sm rounded-lg ${frozen ? "bg-slate-300" : "bg-blue-600 hover:bg-blue-700"}">
          ${t("common.action.save")}
        </button>
        <span id="acct-settings-status" class="text-xs text-slate-400"></span>
      </div>
    </form>`;
}
async function render(root) {
  root.innerHTML = `<div class="p-6 max-w-2xl mx-auto"><div id="acct-settings-mount">${t("loading")}</div></div>`;
  const mount = root.querySelector("#acct-settings-mount");
  const api = getApi();
  const ws = activeWorkspaceName();
  const defaultSettings = { [DEFAULT_CURRENCY_FIELD]: DEFAULT_HEADER_CURRENCY };
  const settingsRes = await safeMasterLoad(() => loadWorkspaceSettings(api, ws), "acct-settings:load");
  let settings = window.__vdg_workspace_settings ?? (settingsRes.ok ? settingsRes.value : defaultSettings);
  window.__vdg_workspace_settings = settings;
  const period = periodOf(/* @__PURE__ */ new Date());
  const shipRes = await safeMasterLoad(() => listShipments(getRepo(), null), "acct-settings:ships");
  const periodLock = await getCurrentPeriodLock(getRepo(), period);
  const lock = canEditDefaultCurrency(shipRes.ok ? shipRes.value : [], period, periodLock.locked);
  mount.innerHTML = `
    <h2 class="text-lg font-semibold text-slate-800 mb-4">${t("nav.accounting.settings")}</h2>
    ${formHtml(settings, lock)}`;
  mount.querySelector("#acct-settings-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusEl = mount.querySelector("#acct-settings-status");
    statusEl.textContent = t("loading");
    try {
      const fresh = await safeMasterLoad(() => listShipments(getRepo(), null), "acct-settings:ships2");
      const thisMonth = periodOf(/* @__PURE__ */ new Date());
      const freshLock = await getCurrentPeriodLock(getRepo(), thisMonth);
      const now = canEditDefaultCurrency(fresh.ok ? fresh.value : [], thisMonth, freshLock.locked);
      if (!now.editable) {
        statusEl.textContent = t(now.reason === LOCK_REASON_PERIOD_CLOSED ? "settings.default_currency.locked_closed" : "settings.default_currency.locked_in_period", { n: now.jobCount });
        return;
      }
      const next = { ...settings, [DEFAULT_CURRENCY_FIELD]: new FormData(e.target).get(DEFAULT_CURRENCY_FIELD) };
      await saveWorkspaceSettings(api, ws, next);
      settings = next;
      toast("success", t("settings.toast.saved"));
      statusEl.textContent = "";
    } catch (err) {
      statusEl.textContent = err.message;
    }
  });
}
export {
  render
};
