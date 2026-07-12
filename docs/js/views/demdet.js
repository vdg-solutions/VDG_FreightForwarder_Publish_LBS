// F-06-07 — DEM/DET Alert Dashboard

export async function render(root) {
  root.innerHTML = `
    <div class="p-6 max-w-[1400px] mx-auto">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">DEM/DET Monitor</h1>
          <p class="text-slate-500 text-sm mt-1">Live tracking of demurrage & detention exposure</p>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">Active Containers</div>
          <div class="text-3xl font-bold text-slate-800">0</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">Over Free Time</div>
          <div class="text-3xl font-bold text-red-600">0</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">Expiring < 48h</div>
          <div class="text-3xl font-bold text-amber-500">0</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">Total Exposure</div>
          <div class="text-3xl font-bold text-slate-800">$0</div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
              <th class="py-3 px-4 font-semibold">Container No.</th>
              <th class="py-3 px-4 font-semibold">Shipment</th>
              <th class="py-3 px-4 font-semibold">Type</th>
              <th class="py-3 px-4 font-semibold">Free Time Ends</th>
              <th class="py-3 px-4 font-semibold">Status</th>
              <th class="py-3 px-4 font-semibold text-right">Exposure</th>
            </tr>
          </thead>
          <tbody class="text-sm divide-y divide-slate-100">
            <tr>
              <td colspan="6" class="py-8 text-center text-slate-400">Chưa có dữ liệu DEM/DET thực tế (DEM/DET data not implemented yet)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}
