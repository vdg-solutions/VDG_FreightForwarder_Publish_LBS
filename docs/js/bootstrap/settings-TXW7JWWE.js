import {
  SECOND_EYES_FIELD,
  loadWorkspaceSettings,
  saveWorkspaceSettings
} from "./chunk-IIUQ3SOM.js";
import {
  activeWorkspaceName
} from "./chunk-JDLBDPFG.js";
import {
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

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/settings.js
var DEFAULT_FX_SOURCE = "Manual";
var FX_SOURCE_OPTIONS = ["Vietcombank", "SBV", "Manual"];
var TOAST_MS = 4e3;
function getApi() {
  return window.__vdg_drive_api;
}
function toast(type, msg) {
  window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { type, message: msg, duration: TOAST_MS } }));
}
function sourceLabel(src) {
  const map = { SBV: "fx.source.sbv", Vietcombank: "fx.source.vcb", Manual: "fx.source.manual" };
  return t(map[src] || "fx.source.manual");
}
function settingsFormHtml(settings) {
  const srcOpts = FX_SOURCE_OPTIONS.map(
    (s) => `<option value="${s}"${s === settings.fx_source ? " selected" : ""}>${sourceLabel(s)}</option>`
  ).join("");
  return `
    <form id="settings-form" class="space-y-4 max-w-sm">
      <div class="flex flex-col gap-1">
        <label class="text-[11px] font-medium text-slate-500 uppercase tracking-wider" for="fx-source">
          ${t("fx.admin.col_source")} (${t("fx.admin.col_rate")})
        </label>
        <select id="fx-source" name="fx_source"
          class="border border-slate-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white">
          ${srcOpts}
        </select>
      </div>
      <div class="flex items-center gap-2">
        <input id="second-eyes" name="${SECOND_EYES_FIELD}" type="checkbox" ${settings[SECOND_EYES_FIELD] ? "checked" : ""}
          class="rounded border-slate-300 focus:ring-2 focus:ring-blue-100" />
        <label class="text-xs text-slate-600" for="second-eyes">${t("settings.second_eyes.label")}</label>
      </div>
      <div class="flex gap-3 items-center">
        <button type="submit"
          class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          ${t("common.action.save")}
        </button>
        <span id="settings-status" class="text-xs text-slate-400"></span>
      </div>
    </form>`;
}
async function render(root) {
  if (!hasRole(ROLE_MANAGER)) {
    navigate("/dashboard");
    return;
  }
  root.innerHTML = `<div class="p-6 max-w-2xl mx-auto"><div id="settings-mount">${t("loading")}</div></div>`;
  const mount = root.querySelector("#settings-mount");
  const api = getApi();
  const ws = activeWorkspaceName();
  const defaultSettings = { fx_source: DEFAULT_FX_SOURCE, [SECOND_EYES_FIELD]: false };
  const settingsRes = api ? await safeMasterLoad(() => loadWorkspaceSettings(api, ws), "settings:load") : { ok: true, value: defaultSettings };
  let settings = window.__vdg_workspace_settings ?? (settingsRes.ok ? settingsRes.value : defaultSettings);
  window.__vdg_workspace_settings = settings;
  mount.innerHTML = `
    <h2 class="text-lg font-semibold text-slate-800 mb-4">${t("step_settings")}</h2>
    ${settingsFormHtml(settings)}`;
  mount.querySelector("#settings-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusEl = mount.querySelector("#settings-status");
    statusEl.textContent = t("loading");
    try {
      const fd = new FormData(e.target);
      const next = { ...settings, fx_source: fd.get("fx_source"), [SECOND_EYES_FIELD]: fd.get(SECOND_EYES_FIELD) === "on" };
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
