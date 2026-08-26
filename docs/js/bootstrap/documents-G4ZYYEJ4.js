import {
  t
} from "./chunk-MGTH6QM4.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/documents.js
async function render(root) {
  root.innerHTML = `
    <div class="p-6 max-w-[1600px] mx-auto">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">${t("documents.title")}</h1>
          <p class="text-slate-500 text-sm mt-1">${t("documents.subtitle")}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">${t("documents.kpi.total_pending")}</div>
          <div class="text-3xl font-bold text-slate-800">0</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">${t("documents.kpi.critical_priority")}</div>
          <div class="text-3xl font-bold text-red-600">0</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">${t("documents.kpi.exceptions")}</div>
          <div class="text-3xl font-bold text-amber-500">0</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">${t("documents.kpi.draft_mbl_pending")}</div>
          <div class="text-3xl font-bold text-blue-600">0</div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
              <th class="py-3 px-4 font-semibold">${t("shipments.grid.ref")}</th>
              <th class="py-3 px-4 font-semibold">${t("documents.col.type")}</th>
              <th class="py-3 px-4 font-semibold">${t("state")}</th>
              <th class="py-3 px-4 font-semibold">${t("documents.col.deadline")}</th>
              <th class="py-3 px-4 font-semibold text-right">${t("common.col.actions")}</th>
            </tr>
          </thead>
          <tbody class="text-sm divide-y divide-slate-100">
            <tr>
              <td colspan="5" class="py-8 text-center text-slate-400">${t("documents.empty_row")}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}
export {
  render
};
