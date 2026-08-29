import {
  t
} from "./chunk-NJFDQATX.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/demdet.js
async function render(root) {
  root.innerHTML = `
    <div class="p-6 max-w-[1600px] mx-auto">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">${t("demdet.title")}</h1>
          <p class="text-slate-500 text-sm mt-1">${t("demdet.subtitle")}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">${t("demdet.card.active_containers")}</div>
          <div class="text-3xl font-bold text-slate-800">0</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">${t("demdet.card.over_free_time")}</div>
          <div class="text-3xl font-bold text-red-600">0</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">${t("demdet.card.expiring_48h")}</div>
          <div class="text-3xl font-bold text-amber-500">0</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">${t("demdet.card.total_exposure")}</div>
          <div class="text-3xl font-bold text-slate-800">0</div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
              <th class="py-3 px-4 font-semibold">${t("demdet.col.container_no")}</th>
              <th class="py-3 px-4 font-semibold">${t("demdet.col.shipment")}</th>
              <th class="py-3 px-4 font-semibold">${t("demdet.col.type")}</th>
              <th class="py-3 px-4 font-semibold">${t("demdet.col.free_time_ends")}</th>
              <th class="py-3 px-4 font-semibold">${t("demdet.col.status")}</th>
              <th class="py-3 px-4 font-semibold text-right">${t("demdet.col.exposure")}</th>
            </tr>
          </thead>
          <tbody class="text-sm divide-y divide-slate-100">
            <tr>
              <td colspan="6" class="py-8 text-center text-slate-400">${t("demdet.empty")}</td>
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
