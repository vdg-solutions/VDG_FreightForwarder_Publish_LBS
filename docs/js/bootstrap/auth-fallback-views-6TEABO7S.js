import {
  t
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/auth/auth-fallback-views.js
function renderLoadingBanner(mount) {
  if (!mount) return;
  mount.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="text-xl font-semibold text-slate-700">${t("auth_loading_banner_title")}</div>
      <div class="text-sm text-slate-500">${t("auth_loading_banner_body")}</div>
      <button id="auth-fallback-reauth"
              class="mt-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
        ${t("auth_loading_banner_action")}
      </button>
    </div>`;
  mount.querySelector("#auth-fallback-reauth")?.addEventListener("click", () => {
    try {
      localStorage.removeItem("vdg.role-cache");
      sessionStorage.removeItem("vdg.session-token");
      localStorage.removeItem("vdg.auth.user");
    } catch {
    }
    window.__vdg_auth?.signOut?.();
    location.reload();
  });
}
function renderNotProvisioned(mount, user) {
  if (!mount) return;
  mount.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="text-xl font-semibold text-slate-700">${t("auth_not_provisioned_title")}</div>
      <div class="text-sm text-slate-500">${t("auth_not_provisioned_body")}</div>
      <div class="text-xs text-slate-400">${user?.email || ""}</div>
      <button id="btn-signout"
              class="mt-2 px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700">
        ${t("sign_out")}
      </button>
    </div>`;
  mount.querySelector("#btn-signout")?.addEventListener("click", () => {
    window.__vdg_auth?.signOut?.();
    location.reload();
  });
}
export {
  renderLoadingBanner,
  renderNotProvisioned
};
