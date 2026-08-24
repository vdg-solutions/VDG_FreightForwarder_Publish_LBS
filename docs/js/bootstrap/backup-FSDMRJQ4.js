import {
  exportWorkspace
} from "./chunk-HNTJLHIX.js";
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

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/backup.js
function getRepo() {
  return window.__vdg_repo;
}
function getDriveApi() {
  return window.__vdg_drive_api;
}
function _html() {
  return `
    <div class="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">${t("backup.title")}</h1>
        <p class="text-sm text-slate-500 mt-1">${t("backup.subtitle")}</p>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div class="text-sm font-medium text-slate-700">${t("backup.export_workspace.heading")}</div>
        <p class="text-xs text-slate-500">${t("backup.export_workspace.desc")}</p>

        <div id="backup-progress" class="hidden space-y-2">
          <div class="flex items-center justify-between text-xs text-slate-600">
            <span id="backup-label">${t("backup.progress.preparing")}</span>
            <span id="backup-pct">0%</span>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-2">
            <div id="backup-bar" class="bg-blue-500 h-2 rounded-full transition-all" style="width:0%"></div>
          </div>
        </div>

        <div id="backup-result" class="hidden text-xs text-emerald-700 font-medium"></div>
        <div id="backup-error"  class="hidden text-xs text-red-600"></div>

        <button id="btn-export"
                class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 transition disabled:opacity-50">
          ${t("backup.export_workspace.button")}
        </button>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1">
        <div class="font-semibold">${t("backup.restore.title")}</div>
        <p>${t("backup.restore.body_1")} <strong>${t("backup.restore.drive_trash")}</strong> ${t("backup.restore.body_2")}
          <a href="https://drive.google.com/drive/trash" target="_blank" rel="noreferrer"
                   class="underline">drive.google.com/drive/trash</a> ${t("backup.restore.body_3")} <code>LBS</code> folder.
          ${t("backup.restore.body_4")} <code>docs/operations/disaster-recovery.md</code> ${t("backup.restore.body_5")}</p>
      </div>
    </div>`;
}
async function render(root) {
  if (!hasRole(ROLE_MANAGER)) {
    root.innerHTML = `<div class="p-8 text-sm text-slate-500">${t("nav.access.denied")}</div>`;
    return;
  }
  root.innerHTML = _html();
  const btnExport = root.querySelector("#btn-export");
  const progressEl = root.querySelector("#backup-progress");
  const barEl = root.querySelector("#backup-bar");
  const pctEl = root.querySelector("#backup-pct");
  const labelEl = root.querySelector("#backup-label");
  const resultEl = root.querySelector("#backup-result");
  const errorEl = root.querySelector("#backup-error");
  btnExport?.addEventListener("click", async () => {
    const repo = getRepo();
    const driveApi = getDriveApi();
    if (!repo || !driveApi) {
      errorEl.textContent = t("backup.error.drive_not_initialized");
      errorEl.classList.remove("hidden");
      return;
    }
    btnExport.disabled = true;
    progressEl.classList.remove("hidden");
    resultEl.classList.add("hidden");
    errorEl.classList.add("hidden");
    try {
      const filename = await exportWorkspace(repo, driveApi, (pct, label) => {
        barEl.style.width = `${pct}%`;
        pctEl.textContent = `${pct}%`;
        labelEl.textContent = label;
      });
      progressEl.classList.add("hidden");
      resultEl.textContent = t("backup.result.downloaded", { filename });
      resultEl.classList.remove("hidden");
    } catch (err) {
      progressEl.classList.add("hidden");
      errorEl.textContent = t("backup.error.export_failed", { msg: err?.message ?? err });
      errorEl.classList.remove("hidden");
    } finally {
      btnExport.disabled = false;
    }
  });
}
export {
  render
};
