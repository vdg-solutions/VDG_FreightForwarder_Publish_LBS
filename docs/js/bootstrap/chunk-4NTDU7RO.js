import {
  diffFields
} from "./chunk-AK6DJLS5.js";
import {
  t
} from "./chunk-MGTH6QM4.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/merge-modal.js
var ENTITY_SUFFIX_LEN = 1;
function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function openMergeModal(root, masterKind, items, onDone) {
  root.querySelector("#merge-modal")?.remove();
  const entityLabel = masterKind.slice(0, -ENTITY_SUFFIX_LEN);
  const opts = items.map((e) => `<option value="${escHtml(e.id)}">${escHtml(e.name)} (${escHtml(e.id)})</option>`).join("");
  root.insertAdjacentHTML("beforeend", `
    <dialog id="merge-modal" class="rounded-xl border border-slate-200 shadow-xl p-6 w-full max-w-lg backdrop:bg-black/30">
      <div class="text-base font-semibold text-slate-900 mb-4">${escHtml(t("master_merge.title", { kind: masterKind }))}</div>
      <div class="space-y-3 mb-4 text-xs">
        <div>
          <label class="block font-medium text-slate-700 mb-1">${t("master_merge.target")}</label>
          <select id="mg-target" class="w-full border rounded-lg px-3 py-2 text-sm">${opts}</select>
        </div>
        <div>
          <label class="block font-medium text-slate-700 mb-1">${t("master_merge.source")}</label>
          <select id="mg-source" class="w-full border rounded-lg px-3 py-2 text-sm">${opts}</select>
        </div>
      </div>
      <div id="mg-diff" class="mb-4 text-xs space-y-1"></div>
      <div class="flex gap-3">
        <button id="btn-merge-confirm" class="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg">${t("master_merge.confirm")}</button>
        <button id="btn-merge-cancel" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">${t("master_merge.cancel")}</button>
      </div>
    </dialog>`);
  const dialog = root.querySelector("#merge-modal");
  const selTarget = dialog.querySelector("#mg-target");
  const selSource = dialog.querySelector("#mg-source");
  const diffEl = dialog.querySelector("#mg-diff");
  if (items.length >= 2) selSource.selectedIndex = 1;
  function renderDiff() {
    const tId = selTarget.value;
    const sId = selSource.value;
    if (tId === sId) {
      diffEl.innerHTML = `<div class="text-red-600">${t2("master_merge.must_differ")}</div>`;
      return;
    }
    const t2 = items.find((i) => i.id === tId);
    const s = items.find((i) => i.id === sId);
    if (!t2 || !s) return;
    const diffs = diffFields(t2, s);
    if (!diffs.length) {
      diffEl.innerHTML = `<div class="text-slate-400">${t2("master_merge.no_diff")}</div>`;
      return;
    }
    diffEl.innerHTML = `<div class="font-medium text-slate-700 mb-1">${t2("master_merge.diff_header")}</div>` + diffs.map(
      (d) => `<div class="grid grid-cols-3 gap-1 bg-slate-50 rounded px-2 py-1">
          <span class="font-mono text-slate-500">${escHtml(d.field)}</span>
          <span class="text-emerald-700">${escHtml(String(d.targetVal ?? "\u2014"))}</span>
          <span class="text-red-500 line-through">${escHtml(String(d.sourceVal ?? "\u2014"))}</span>
        </div>`
    ).join("");
  }
  dialog.showModal();
  renderDiff();
  selTarget.addEventListener("change", renderDiff);
  selSource.addEventListener("change", renderDiff);
  dialog.querySelector("#btn-merge-cancel").addEventListener("click", () => dialog.close());
  dialog.querySelector("#btn-merge-confirm").addEventListener("click", async () => {
    const tId = selTarget.value;
    const sId = selSource.value;
    if (tId === sId) return;
    const target = items.find((i) => i.id === tId);
    const source = items.find((i) => i.id === sId);
    if (!target || !source) return;
    dialog.close();
    await onDone(target, source, entityLabel);
  });
}

export {
  openMergeModal
};
