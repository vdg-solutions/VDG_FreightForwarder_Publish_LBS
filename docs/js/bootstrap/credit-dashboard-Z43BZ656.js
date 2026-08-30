import {
  t
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/credit-dashboard.js
async function render(root) {
  root.innerHTML = `
    <div class="p-6 max-w-[1600px] mx-auto">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">${t("credit_dash.title")}</h1>
          <p class="text-slate-500 text-sm mt-1">${t("credit_dash.subtitle")}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">${t("credit_dash.kpi.total_exposure")}</div>
          <div class="text-3xl font-bold text-slate-800">0</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">${t("credit_dash.kpi.overdue_30")}</div>
          <div class="text-3xl font-bold text-red-600">0</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">${t("credit_dash.kpi.over_limit")}</div>
          <div class="text-3xl font-bold text-amber-500">0</div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
              <th class="py-3 px-4 font-semibold">${t("credit_dash.col.customer")}</th>
              <th class="py-3 px-4 font-semibold text-right">${t("credit_dash.col.credit_limit")}</th>
              <th class="py-3 px-4 font-semibold text-right">${t("credit_dash.col.balance")}</th>
              <th class="py-3 px-4 font-semibold text-right">${t("credit_dash.col.utilization")}</th>
              <th class="py-3 px-4 font-semibold">${t("credit_dash.col.status")}</th>
              <th class="py-3 px-4 font-semibold">${t("credit_dash.col.action")}</th>
            </tr>
          </thead>
          <tbody class="text-sm divide-y divide-slate-100">
            <tr>
              <td colspan="6" class="py-8 text-center text-slate-400">${t("credit_dash.empty")}</td>
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
