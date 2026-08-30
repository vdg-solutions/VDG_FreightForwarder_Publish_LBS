import {
  t
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/ui/bootstrap/components/vdg-confirm-dialog.js
var BTN_BASE_CLASS = "px-4 py-2 text-xs rounded-lg";
var BTN_CANCEL_CLASS = `btn-cancel ${BTN_BASE_CLASS} bg-slate-100 text-slate-700 hover:bg-slate-200`;
var BTN_PRIMARY_CLASS = `btn-primary ${BTN_BASE_CLASS} bg-blue-600 text-white hover:bg-blue-700`;
var BTN_DANGER_CLASS = `btn-danger ${BTN_BASE_CLASS} bg-red-600 text-white hover:bg-red-700`;
var ESCAPE_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}
function buildConfirmDialogHtml({ title, body, confirmLabel, cancelLabel, destructive = false, reasonField = false, reasonLabel = "" }) {
  const confirmClass = destructive ? BTN_DANGER_CLASS : BTN_PRIMARY_CLASS;
  const reasonHtml = reasonField ? `
      <div class="space-y-1">
        <label class="text-xs text-slate-600" for="vdg-confirm-reason">${escapeHtml(reasonLabel)}</label>
        <textarea id="vdg-confirm-reason" rows="2" class="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs"></textarea>
      </div>` : "";
  return `
    <div class="bg-white rounded-xl shadow-xl p-6 w-96 space-y-4" role="alertdialog" aria-modal="true">
      <div class="text-sm font-semibold text-slate-800">${escapeHtml(title)}</div>
      <div class="text-xs text-slate-600 whitespace-pre-line">${escapeHtml(body)}</div>
      ${reasonHtml}
      <div class="flex gap-2 justify-end">
        <button id="vdg-confirm-cancel" class="${BTN_CANCEL_CLASS}">${escapeHtml(cancelLabel)}</button>
        <button id="vdg-confirm-ok" class="${confirmClass}">${escapeHtml(confirmLabel)}</button>
      </div>
    </div>`;
}
function mountConfirmDialog(options, onResolve, doc = document) {
  const overlay = doc.createElement("div");
  overlay.className = "vdg-confirm-dialog fixed inset-0 z-[60] bg-black/40 flex items-center justify-center";
  overlay.innerHTML = buildConfirmDialogHtml(options);
  const close = (confirmed) => {
    const reasonEl = options.reasonField ? overlay.querySelector("#vdg-confirm-reason") : null;
    const result = options.reasonField ? { confirmed, reason: confirmed ? reasonEl?.value ?? "" : "" } : confirmed;
    overlay.remove();
    doc.removeEventListener("keydown", onKeydown);
    onResolve(result);
  };
  function onKeydown(e) {
    if (e.key === "Escape") close(false);
  }
  overlay.querySelector("#vdg-confirm-cancel").addEventListener("click", () => close(false));
  overlay.querySelector("#vdg-confirm-ok").addEventListener("click", () => close(true));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close(false);
  });
  doc.addEventListener("keydown", onKeydown);
  doc.body.appendChild(overlay);
  overlay.querySelector("#vdg-confirm-ok").focus?.();
  return overlay;
}

// output/web/js.tmp/implementations/ui/bootstrap/helpers/show-confirm.js
var DEFAULT_CONFIRM_KEY = "common.dialog.confirm.default_ok";
var DEFAULT_CANCEL_KEY = "common.dialog.confirm.default_cancel";
async function showConfirm({ title, body, confirmLabel, cancelLabel, destructive = false, reasonField = false, reasonLabel } = {}) {
  return new Promise((resolve) => {
    mountConfirmDialog({
      title,
      body,
      confirmLabel: confirmLabel ?? t(DEFAULT_CONFIRM_KEY),
      cancelLabel: cancelLabel ?? t(DEFAULT_CANCEL_KEY),
      destructive,
      reasonField,
      reasonLabel: reasonLabel ?? title
    }, resolve);
  });
}

export {
  showConfirm
};
