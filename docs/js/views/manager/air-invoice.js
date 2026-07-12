// Air Invoice CASS-format view (F-16-09, E-16)
// Route: /manager/air-invoice

import { t } from '../../i18n/index.js';

const CSV_HEADER = 'hawb_no,awb_no,mawb_no,flight_no,origin_iata,dest_iata,weight_chargeable_kg,freight,currency,cass_code,cass_eligible';

// Mock data — ≥3 invoices, ≥2 carriers (no live I/O required)
const MOCK_INVOICES = [
  {
    carrier_iata: 'VN',
    carrier_name: 'Vietnam Airlines',
    hawb_no: '180-12345675',
    awb_no: '180-12345675',
    mawb_no: '020-11111110',
    flight_no: 'VN422',
    origin_iata: 'SGN',
    dest_iata: 'HAN',
    weight_chargeable_kg: 450.0,
    freight: 1575.0,
    currency: 'USD',
    cass_code: 'VN-5675',
    cass_eligible: true,
  },
  {
    carrier_iata: 'VN',
    carrier_name: 'Vietnam Airlines',
    hawb_no: '180-22222220',
    awb_no: '180-22222220',
    mawb_no: '020-11111110',
    flight_no: 'VN422',
    origin_iata: 'SGN',
    dest_iata: 'PEK',
    weight_chargeable_kg: 310.0,
    freight: 1085.0,
    currency: 'USD',
    cass_code: 'VN-2220',
    cass_eligible: true,
  },
  {
    carrier_iata: 'VJ',
    carrier_name: 'VietJet Air',
    hawb_no: '130-33333335',
    awb_no: '130-33333335',
    mawb_no: '050-22222225',
    flight_no: 'VJ208',
    origin_iata: 'HAN',
    dest_iata: 'SGN',
    weight_chargeable_kg: 680.0,
    freight: 2040.0,
    currency: 'USD',
    cass_code: 'VJ-3335',
    cass_eligible: false,
  },
];

// AC-05: quote field iff it contains comma, double-quote, or newline (RFC 4180)
export function csvField(value) {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// AC-03/04/05/06: pure CSV builder — returns string, no DOM side effects
export function buildCassCSV(invoices) {
  const rows = invoices.map((inv) => [
    csvField(inv.hawb_no),
    csvField(inv.awb_no),
    csvField(inv.mawb_no),
    csvField(inv.flight_no),
    csvField(inv.origin_iata),
    csvField(inv.dest_iata),
    csvField(inv.weight_chargeable_kg),
    csvField(inv.freight),
    csvField(inv.currency),
    csvField(inv.cass_code),
    csvField(inv.cass_eligible),
  ].join(','));
  return [CSV_HEADER, ...rows].join('\n');
}

function groupByCarrier(invList) {
  const map = new Map();
  for (const inv of invList) {
    if (!map.has(inv.carrier_iata)) map.set(inv.carrier_iata, { name: inv.carrier_name, rows: [] });
    map.get(inv.carrier_iata).rows.push(inv);
  }
  return map;
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function eligibleBadge(inv, idx) {
  const on = inv.cass_eligible;
  const cls = on
    ? 'bg-green-100 text-green-700 border-green-300'
    : 'bg-slate-100 text-slate-500 border-slate-300';
  return `<button class="cass-toggle text-[10px] px-2 py-0.5 rounded border font-mono ${cls}" data-idx="${idx}">${on ? 'CASS' : '—'}</button>`;
}

function buildInvoiceRow(inv, idx) {
  return `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs" data-row="${idx}">
      <td class="px-3 py-2 font-mono">${escHtml(inv.hawb_no)}</td>
      <td class="px-3 py-2 font-mono">${escHtml(inv.flight_no)}</td>
      <td class="px-3 py-2">${escHtml(inv.origin_iata)} → ${escHtml(inv.dest_iata)}</td>
      <td class="px-3 py-2 text-right">${inv.weight_chargeable_kg} kg</td>
      <td class="px-3 py-2 text-right">${inv.freight} ${escHtml(inv.currency)}</td>
      <td class="px-3 py-2 font-mono text-blue-700">${escHtml(inv.cass_code)}</td>
      <td class="px-3 py-2 text-center">${eligibleBadge(inv, idx)}</td>
    </tr>`;
}

function buildCarrierSection(carrierIata, group, invList) {
  const rows = group.rows.map((inv) => {
    const idx = invList.indexOf(inv);
    return buildInvoiceRow(inv, idx);
  }).join('');
  return `
    <div class="mb-6">
      <div class="text-sm font-semibold text-slate-700 mb-2 px-1">
        ${escHtml(carrierIata)} — ${escHtml(group.name)}
        <span class="ml-2 text-xs text-slate-400">${group.rows.length} invoice(s)</span>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">${t('air_invoice.col.hawb')}</th>
              <th class="px-3 py-2 text-left">${t('air_invoice.col.flight')}</th>
              <th class="px-3 py-2 text-left">Route</th>
              <th class="px-3 py-2 text-right">${t('air_invoice.col.weight')}</th>
              <th class="px-3 py-2 text-right">${t('air_invoice.col.freight')}</th>
              <th class="px-3 py-2 text-left">${t('air_invoice.col.cass_code')}</th>
              <th class="px-3 py-2 text-center">CASS</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

export async function render(root) {
  // Local mutable copy — toggle mutates cass_eligible here
  const invoices = MOCK_INVOICES.map((inv) => ({ ...inv }));

  root.innerHTML = `
    <div class="p-6 max-w-[1100px] mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div class="text-lg font-semibold text-slate-900">${t('air_invoice.title')}</div>
        <button id="air-invoice-export"
          class="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium">
          ${t('air_invoice.export_csv')}
        </button>
      </div>
      <div id="air-invoice-body"></div>
    </div>`;

  const body = root.querySelector('#air-invoice-body');
  if (!body) return;

  const groups = groupByCarrier(invoices);
  for (const [iata, group] of groups) {
    body.insertAdjacentHTML('beforeend', buildCarrierSection(iata, group, invoices));
  }

  // Toggle cass_eligible in local state + update badge UI
  body.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.cass-toggle');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const inv = invoices[idx];
    if (!inv) return;
    inv.cass_eligible = !inv.cass_eligible;
    const on = inv.cass_eligible;
    btn.textContent = on ? 'CASS' : '—';
    btn.className = btn.className
      .replace(/bg-\S+ text-\S+ border-\S+/g, '')
      .trim()
      + (on ? ' bg-green-100 text-green-700 border-green-300' : ' bg-slate-100 text-slate-500 border-slate-300');
  });

  // CSV export via Blob + URL.createObjectURL
  const exportBtn = root.querySelector('#air-invoice-export');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const csv  = buildCassCSV(invoices);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'cass-invoice.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}
