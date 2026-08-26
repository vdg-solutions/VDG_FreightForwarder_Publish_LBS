import {
  bootstrapAclTargetFolders,
  findWorkspaceRoot,
  forkId,
  storageApi
} from "./chunk-VL7USYBE.js";
import {
  inviteSales
} from "./chunk-LLUXTOR5.js";
import {
  activeWorkspaceName
} from "./chunk-ORRSUUI4.js";
import {
  safeMasterLoad
} from "./chunk-CVQ465MH.js";
import "./chunk-JAZY43GR.js";
import {
  t
} from "./chunk-MGTH6QM4.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/onboarding-wizard.js
async function renderOnboardingWizard(container, onDone) {
  container.innerHTML = `
    <div id="onboarding-wizard" class="max-w-xl mx-auto p-6">
      <h2 class="text-lg font-semibold mb-4">Kh\u1EDFi t\u1EA1o Workspace</h2>
      <ol id="wizard-steps" class="space-y-2 mb-6 text-sm"></ol>
      <div id="wizard-invite" class="hidden border-t pt-4 mt-4">
        <h3 class="font-medium mb-2">M\u1EDDi Sales</h3>
        <div class="flex gap-2">
          <input type="email" id="invite-email" placeholder="email@domain.com"
                 class="flex-1 border rounded px-3 py-2 text-sm" />
          <button id="btn-invite"
                  class="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            M\u1EDDi Sales
          </button>
        </div>
        <ul id="invited-list" class="mt-3 space-y-1 text-sm text-slate-600"></ul>
      </div>
      <button id="btn-done"
              class="mt-4 px-4 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700">
        Ho\xE0n th\xE0nh
      </button>
    </div>`;
  const stepsEl = container.querySelector("#wizard-steps");
  const inviteDiv = container.querySelector("#wizard-invite");
  const inviteBtn = container.querySelector("#btn-invite");
  const doneBtn = container.querySelector("#btn-done");
  const driveApi = window.__vdg_drive_api || storageApi();
  let rootId;
  await _runStep(stepsEl, t("onboarding.create_structure"), async () => {
    const rootRes = await safeMasterLoad(() => findWorkspaceRoot(activeWorkspaceName()), "onboarding:root");
    if (!rootRes.ok) throw rootRes.error;
    rootId = rootRes.value;
    const bootstrapRes = await safeMasterLoad(() => bootstrapAclTargetFolders(driveApi, rootId), "onboarding:bootstrap");
    if (!bootstrapRes.ok) throw bootstrapRes.error;
  });
  inviteDiv.classList.remove("hidden");
  inviteBtn.addEventListener("click", async () => {
    const email = container.querySelector("#invite-email").value.trim();
    if (!email) return;
    inviteBtn.disabled = true;
    try {
      await _inviteSales(email, rootId, driveApi, container);
    } finally {
      inviteBtn.disabled = false;
      container.querySelector("#invite-email").value = "";
    }
  });
  doneBtn.addEventListener("click", () => onDone?.());
}
async function _inviteSales(email, wsRootId, driveApi, container) {
  const prefix = forkId(email);
  const repo = window.__vdg_repo || null;
  await inviteSales(email, prefix, driveApi, repo, wsRootId);
  const list = container.querySelector("#invited-list");
  const li = document.createElement("li");
  li.textContent = `\u2713 ${email} \u2192 users/${prefix}/ (editor)`;
  list.appendChild(li);
}
async function render(container) {
  await renderOnboardingWizard(container, () => {
    location.hash = "/dashboard";
  });
}
async function _runStep(stepsEl, label, fn) {
  const li = document.createElement("li");
  li.className = "flex items-center gap-2";
  li.innerHTML = `<span class="w-4 text-slate-400 animate-spin">\u27F3</span><span>${label}</span>`;
  stepsEl.appendChild(li);
  try {
    await fn();
    li.querySelector("span").textContent = "\u2713";
    li.querySelector("span").className = "w-4 text-emerald-500";
  } catch (err) {
    li.querySelector("span").textContent = "\u2717";
    li.querySelector("span").className = "w-4 text-red-500";
    const errSpan = document.createElement("span");
    errSpan.className = "text-red-500 text-xs";
    errSpan.textContent = err.message;
    li.appendChild(errSpan);
    throw err;
  }
}
export {
  render,
  renderOnboardingWizard
};
