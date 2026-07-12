export async function render(root) {
  root.innerHTML = `
    <div class="p-6 max-w-[1400px] mx-auto">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Credit Control</h1>
          <p class="text-slate-500 text-sm mt-1">Manager view • Outstanding balances & limits</p>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">Total AR Exposure</div>
          <div class="text-3xl font-bold text-slate-800">$0</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">Overdue > 30 Days</div>
          <div class="text-3xl font-bold text-red-600">$0</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">Customers Over Limit</div>
          <div class="text-3xl font-bold text-amber-500">0</div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
              <th class="py-3 px-4 font-semibold">Customer</th>
              <th class="py-3 px-4 font-semibold text-right">Credit Limit</th>
              <th class="py-3 px-4 font-semibold text-right">Balance</th>
              <th class="py-3 px-4 font-semibold text-right">Utilization</th>
              <th class="py-3 px-4 font-semibold">Status</th>
              <th class="py-3 px-4 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody class="text-sm divide-y divide-slate-100">
            <tr>
              <td colspan="6" class="py-8 text-center text-slate-400">Chưa có dữ liệu tín dụng thực tế (Credit data not implemented yet)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}
