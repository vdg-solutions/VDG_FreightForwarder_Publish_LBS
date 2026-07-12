// F-03-07 — document status dashboard

const DOC_COLS = ['hbl', 'si', 'vgm', 'do', 'an'];

// SI/VGM cutoff timestamps (matches CUTOFFS in mock-data)
const SI_CUTOFF  = '2026-06-18T14:00:00Z';
const VGM_CUTOFF = '2026-06-18T18:00:00Z';

function pillHtml(status) {
  if (!status) return '<span class="text-slate-300 text-xs">–</span>';
  const map = {
    issued:  ['bg-emerald-100 text-emerald-700', '✓ issued'],
    pending: ['bg-amber-100 text-amber-700',     '⏳ pending'],
    overdue: ['bg-red-100 text-red-700',         '✗ overdue'],
  };
  const [cls, label] = map[status] || ['bg-slate-100 text-slate-500', status];
  return `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${cls}">${label}</span>`;
}

function pillRenderer(params) {
  const div = document.createElement('div');
  div.className = 'flex items-center h-full';
  div.innerHTML  = pillHtml(params.value);
  return div;
}

function allIssuedRenderer(params) {
  const row  = params.data;
  const all  = DOC_COLS.every((c) => row[c] === 'issued');
  const any  = DOC_COLS.some((c)  => row[c] === 'overdue');
  const div  = document.createElement('div');
  div.className = 'flex items-center h-full';
  if (all) {
    div.innerHTML = '<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-600 text-white">✓ Complete</span>';
  } else if (any) {
    div.innerHTML = '<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700">✗ Overdue</span>';
  } else {
    div.innerHTML = '<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">In progress</span>';
  }
  return div;
}

function siCutoffRenderer() {
  const el = document.createElement('cutoff-timer');
  el.setAttribute('deadline', SI_CUTOFF);
  el.setAttribute('label', 'SI');
  return el;
}

function vgmCutoffRenderer() {
  const el = document.createElement('cutoff-timer');
  el.setAttribute('deadline', VGM_CUTOFF);
  el.setAttribute('label', 'VGM');
  return el;
}

export async function render(root) {
  root.innerHTML = `
    <div class="p-6 max-w-[1400px] mx-auto">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Document Processing</h1>
          <p class="text-slate-500 text-sm mt-1">Pending documentation & exceptions</p>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">Total Pending</div>
          <div class="text-3xl font-bold text-slate-800">0</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">Critical Priority</div>
          <div class="text-3xl font-bold text-red-600">0</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">Exceptions</div>
          <div class="text-3xl font-bold text-amber-500">0</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">Draft MBL Pending</div>
          <div class="text-3xl font-bold text-blue-600">0</div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
              <th class="py-3 px-4 font-semibold">Shipment Ref</th>
              <th class="py-3 px-4 font-semibold">Type</th>
              <th class="py-3 px-4 font-semibold">Status</th>
              <th class="py-3 px-4 font-semibold">Deadline</th>
              <th class="py-3 px-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody class="text-sm divide-y divide-slate-100">
            <tr>
              <td colspan="5" class="py-8 text-center text-slate-400">Chưa có dữ liệu chứng từ (Document tasks data not implemented yet)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}
