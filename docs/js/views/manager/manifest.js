// Manifest view — ULD allocations grouped per flight (F-16-04, v1 mock)
// Route: /manager/manifest

import { t } from '../../i18n/index.js';

// Mock data — v1: no live JSONL I/O required (AC-08)
const MOCK_ALLOCATIONS = [
  {
    alloc_id:   'alloc-001',
    flight_ref: 'VN422',
    uld_code:   'AKE',
    uld_name:   'LD3 Lower Deck Container',
    awb_refs: [
      { awb_ref: '180-12345675', pieces: 5, weight_chargeable_kg: 450.0 },
      { awb_ref: '180-22222220', pieces: 3, weight_chargeable_kg: 310.0 },
      { awb_ref: '180-33333335', pieces: 8, weight_chargeable_kg: 680.0 },
    ],
  },
  {
    alloc_id:   'alloc-002',
    flight_ref: 'VN422',
    uld_code:   'PMC',
    uld_name:   'Main Deck Pallet',
    awb_refs: [
      { awb_ref: '180-44444440', pieces: 10, weight_chargeable_kg: 900.0 },
      { awb_ref: '180-55555550', pieces:  4, weight_chargeable_kg: 350.0 },
    ],
  },
  {
    alloc_id:   'alloc-003',
    flight_ref: 'VN430',
    uld_code:   'AKH',
    uld_name:   'LD3 Half-Width Container',
    awb_refs: [
      { awb_ref: '180-66666660', pieces: 2, weight_chargeable_kg: 180.0 },
    ],
  },
];

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function groupByFlight(allocs) {
  const groups = new Map();
  for (const a of allocs) {
    if (!groups.has(a.flight_ref)) groups.set(a.flight_ref, []);
    groups.get(a.flight_ref).push(a);
  }
  return groups;
}

function totalWeight(awb_refs) {
  return awb_refs.reduce((sum, r) => sum + r.weight_chargeable_kg, 0).toFixed(1);
}

function buildAwbRows(awb_refs) {
  return awb_refs.map((r) => `
    <tr class="bg-slate-50 text-xs text-slate-600">
      <td class="pl-10 pr-3 py-1 font-mono">${escHtml(r.awb_ref)}</td>
      <td class="px-3 py-1">${r.pieces} pcs</td>
      <td class="px-3 py-1 text-right">${r.weight_chargeable_kg} kg</td>
      <td></td>
    </tr>`).join('');
}

function buildUldRow(alloc, idx) {
  const total  = totalWeight(alloc.awb_refs);
  const rowId  = `uld-row-${idx}`;
  const bodyId = `uld-body-${idx}`;
  return `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs cursor-pointer uld-toggle" data-target="${bodyId}" id="${rowId}">
      <td class="px-3 py-2 font-mono font-semibold">${escHtml(alloc.uld_code)}</td>
      <td class="px-3 py-2">${escHtml(alloc.uld_name)}</td>
      <td class="px-3 py-2 text-center">${alloc.awb_refs.length}</td>
      <td class="px-3 py-2 text-right">${total} kg</td>
    </tr>
    <tr id="${bodyId}" class="hidden">
      <td colspan="4" class="p-0">
        <table class="w-full">
          <thead class="bg-slate-100 text-[10px] text-slate-500">
            <tr>
              <th class="pl-10 pr-3 py-1 text-left">AWB No.</th>
              <th class="px-3 py-1 text-left">Pieces</th>
              <th class="px-3 py-1 text-right">Chargeable kg</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${buildAwbRows(alloc.awb_refs)}</tbody>
        </table>
      </td>
    </tr>`;
}

function buildFlightSection(flightRef, allocs) {
  const ulds = allocs.map((a, i) => buildUldRow(a, `${flightRef}-${i}`)).join('');
  return `
    <div class="mb-6">
      <div class="text-sm font-semibold text-slate-700 mb-2 px-1">
        Flight: <span class="font-mono text-blue-700">${escHtml(flightRef)}</span>
        <span class="ml-2 text-xs text-slate-400">${allocs.length} ${allocs.length === 1 ? 'ULD' : 'ULDs'}</span>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">ULD Code</th>
              <th class="px-3 py-2 text-left">Type</th>
              <th class="px-3 py-2 text-center"># AWBs</th>
              <th class="px-3 py-2 text-right">Total Weight</th>
            </tr>
          </thead>
          <tbody>${ulds}</tbody>
        </table>
      </div>
    </div>`;
}

export async function render(root) {
  const groups = groupByFlight(MOCK_ALLOCATIONS);

  root.innerHTML = `
    <div class="p-6 max-w-[1100px] mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div class="text-lg font-semibold text-slate-900">${t('manifest.title')}</div>
        <span class="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Mock data — v1</span>
      </div>
      <div class="text-xs text-slate-500 mb-4">${t('manifest.uld_list')}</div>
      <div id="manifest-body"></div>
    </div>`;

  const body = root.querySelector('#manifest-body');
  if (!body) return;

  for (const [flightRef, allocs] of groups) {
    body.insertAdjacentHTML('beforeend', buildFlightSection(flightRef, allocs));
  }

  // Toggle AWB detail rows
  body.addEventListener('click', (ev) => {
    const row = ev.target.closest('.uld-toggle');
    if (!row) return;
    const target = document.getElementById(row.dataset.target);
    if (target) target.classList.toggle('hidden');
  });
}
