import {
  currentUserEmail,
  currentUserRole,
  homeRouteForRole,
  normalizeRole
} from "./chunk-U7A2KJSA.js";
import {
  ROLE_READ_ONLY
} from "./chunk-CTHPHM7D.js";
import {
  navigate
} from "./chunk-H2H4WJDI.js";
import {
  clearRoleCache
} from "./chunk-ZT36KEIN.js";
import {
  t
} from "./chunk-NJFDQATX.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/pending-access.js
var ROLE_POLL_MS = 3e3;
function render(root) {
  root.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="text-3xl">\u23F3</div>
      <div id="pending-title" class="text-xl font-semibold text-slate-700">${t("pending_access.title")}</div>
      <div id="pending-body" class="text-sm text-slate-500 max-w-md">${t("pending_access.body")}</div>
      <div class="text-xs text-slate-400">${currentUserEmail()}</div>
      <div class="flex gap-2 mt-2">
        <button id="pending-retry" class="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">${t("retry")}</button>
        <button id="pending-signout" class="px-4 py-2 bg-slate-200 text-slate-700 rounded text-sm hover:bg-slate-300">${t("sign_out")}</button>
      </div>
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
}
export {
  render
};
