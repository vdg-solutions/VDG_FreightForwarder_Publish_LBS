import {
  isAlreadyProvisionedLocally,
  isServerBackend,
  runFirstRunProvision
} from "./chunk-AZPH7NAL.js";
import {
  currentUserRole,
  homeRouteForRole,
  normalizeRole
} from "./chunk-Z5J2LHCQ.js";
import {
  clearRoleCache
} from "./chunk-ZT36KEIN.js";
import {
  activeWorkspaceName
} from "./chunk-ORRSUUI4.js";
import {
  navigate
} from "./chunk-H2H4WJDI.js";
import "./chunk-EQL6UFHA.js";
import {
  ROLE_READ_ONLY
} from "./chunk-KXTXGKNK.js";
import {
  t
} from "./chunk-MGTH6QM4.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/pending-access.js
var ROLE_POLL_MS = 3e3;
function render(root) {
  root.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="text-3xl">\u23F3</div>
      <div id="pending-title" class="text-xl font-semibold text-slate-700">${t("pending_access.title")}</div>
      <div id="pending-body" class="text-sm text-slate-500 max-w-md">${t("pending_access.body")}</div>
      <div class="text-xs text-slate-400">${window.__vdg_current_user?.email || ""}</div>
      <div class="flex gap-2 mt-2">
        <button id="pending-retry" class="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">${t("retry")}</button>
        <button id="pending-signout" class="px-4 py-2 bg-slate-200 text-slate-700 rounded text-sm hover:bg-slate-300">${t("sign_out")}</button>
      </div>
      <div id="pending-create-slot" class="mt-2"></div>
      <div id="pending-error" class="text-xs text-red-600"></div>
    </div>`;
  const exitIfGranted = () => {
    const role = normalizeRole(currentUserRole());
    if (role === ROLE_READ_ONLY) return false;
    navigate(homeRouteForRole(role));
    return true;
  };
  const timer = setInterval(() => {
    if (!root.isConnected || exitIfGranted()) clearInterval(timer);
  }, ROLE_POLL_MS);
  root.querySelector("#pending-retry").addEventListener("click", async () => {
    if (exitIfGranted()) return;
    await clearRoleCache();
    location.reload();
  });
  root.querySelector("#pending-signout").addEventListener("click", () => {
    window.__vdg_auth?.signOut?.();
    location.reload();
  });
  _offerCreateIfGreenfield(root);
}
async function _offerCreateIfGreenfield(root) {
  if (isServerBackend()) return;
  const driveApi = window.__vdg_drive_api;
  if (!driveApi) return;
  if (await isAlreadyProvisionedLocally()) return;
  let existingRoot;
  try {
    existingRoot = await driveApi.findWorkspaceRoot(activeWorkspaceName());
  } catch (err) {
    console.warn("[pending-access] workspace probe failed:", err.message);
    return;
  }
  if (existingRoot || !root.isConnected) return;
  root.querySelector("#pending-title").textContent = t("pending_access.no_workspace_title");
  root.querySelector("#pending-body").textContent = t("pending_access.no_workspace_body");
  const slot = root.querySelector("#pending-create-slot");
  slot.innerHTML = `<button id="pending-create"
    class="px-4 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700">${t("pending_access.create_workspace")}</button>`;
  slot.querySelector("#pending-create").addEventListener("click", async (ev) => {
    const btn = ev.currentTarget;
    btn.disabled = true;
    btn.textContent = t("pending_access.creating");
    try {
      await runFirstRunProvision(driveApi, activeWorkspaceName());
      await clearRoleCache();
      location.reload();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = t("pending_access.create_workspace");
      root.querySelector("#pending-error").textContent = `${t("pending_access.create_failed")}: ${err.message}`;
    }
  });
}
export {
  render
};
