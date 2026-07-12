// F-12-08 — NI-style "PROFIT-LOSS BUDGET" per-shipment print form
import '../components/print-button.js';

const COMPANY_NAME    = 'VDG FREIGHT SERVICES CO., LTD';
const COMPANY_ADDRESS = '123 Nguyen Hue, District 1, Ho Chi Minh City, Vietnam';
const COMPANY_TEL     = '+84 28 3822 0000';

// ── data loading ──────────────────────────────────────────────────────────────

async function loadShipment(ref) {
  const repo = window.__vdg_repo;
  if (!repo) return null;
  return repo.get('shipment', ref);
}

async function loadLines(ref) {
  const repo = window.__vdg_repo;
  if (!repo) return [];
  try {
    return await repo.list('pnl_line', (l) => l.shipment_ref === ref);
  } catch { return []; }
}

// ── formatters ────────────────────────────────────────────────────────────────

function fmt(v) { return v != null && v !== '' ? String(v) : '—'; }

function fmtNum(v) {
  const n = Number(v);
  return isNaN(n) || !n ? '—' : n.toLocaleString('vi-VN');
}

// ── header block ──────────────────────────────────────────────────────────────

function headerBlock(s) {
  const row = (label, value) => `
    <tr>
      <td class="pr-3 py-0.5 text-[11px] font-semibold text-slate-500 whitespace-nowrap w-36">${label}</td>
      <td class="py-0.5 text-[11px] text-slate-900 font-medium">${value}</td>
    </tr>`;

  const today = new Date().toISOString().slice(0, 10);
  return `
    <div class="grid grid-cols-2 gap-x-8 mb-6">
      <table>
        <tbody>
          ${row('JOB FILE NO',    fmt(s.job_file_no))}
          ${row('MBL',           fmt(s.mbl_no))}
          ${row('HBL',           fmt(s.hbl_no))}
          ${row('SALES REP',     fmt(s.sales_rep))}
          ${row('PREPARING DATE',fmt(s.prep_date || today))}
          ${row('SHIPPER',       fmt(s.shipper))}
          ${row('CONSIGNEE',     fmt(s.consignee))}
        </tbody>
      </table>
      <table>
        <tbody>
          ${row('POL',           fmt(s.pol))}
          ${row('POD',           fmt(s.pod))}
          ${row('CARRIER',       fmt(s.carrier))}
          ${row('ETD',           fmt(s.etd))}
          ${row('ETA',           fmt(s.eta))}
          ${row('ROE BUYING',    fmt(s.roe_buying))}
          ${row('ROE DEBIT',     fmt(s.roe_selling))}
        </tbody>
      </table>
    </div>
    <div class="grid grid-cols-2 gap-x-8 mb-6">
      <table>
        <tbody>
          ${row('FREIGHT TERMS', fmt(s.freight_terms))}
          ${row('CURRENCY',      fmt(s.currency))}
        </tbody>
      </table>
    </div>`;
}

// ── line table ────────────────────────────────────────────────────────────────

function lineTable(lines) {
  let totalBuy = 0, totalSell = 0;

  const rows = lines.map((l, i) => {
    const buy  = Number(l.buy_amt  || l.buying_vnd_pay      || 0);
    const sell = Number(l.sell_amt || l.selling_vnd_collect  || 0);
    totalBuy  += buy;
    totalSell += sell;
    const profit = sell - buy;
    return `
      <tr class="border-t border-slate-200 text-[11px]">
        <td class="py-1.5 pl-2 pr-3">${i + 1}</td>
        <td class="py-1.5 pr-3">${fmt(l.desc || l.description)}</td>
        <td class="py-1.5 pr-3 text-center">${fmt(l.buy_qty  || l.buying_qty)}</td>
        <td class="py-1.5 pr-3 text-center">${fmt(l.buy_unit || l.buying_unit)}</td>
        <td class="py-1.5 pr-3 text-right">${fmtNum(l.buy_amt || l.buying_amount)}</td>
        <td class="py-1.5 pr-3 text-right font-medium text-blue-800">${fmtNum(buy)}</td>
        <td class="py-1.5 pr-3 text-center">${fmt(l.sell_qty  || l.selling_qty)}</td>
        <td class="py-1.5 pr-3 text-center">${fmt(l.sell_unit || l.selling_unit)}</td>
        <td class="py-1.5 pr-3 text-right">${fmtNum(l.sell_amt || l.selling_amount)}</td>
        <td class="py-1.5 pr-3 text-right font-medium text-emerald-800">${fmtNum(sell)}</td>
        <td class="py-1.5 pr-2 text-right font-semibold ${profit >= 0 ? 'text-emerald-700' : 'text-red-600'}">${fmtNum(profit)}</td>
      </tr>`;
  });

  const totalMargin = totalSell - totalBuy;
  return `
    <div class="overflow-x-auto mb-6">
      <table class="w-full min-w-[860px] text-[11px]" style="border-collapse:collapse;">
        <thead>
          <tr class="text-[10px] uppercase tracking-wide">
            <th class="py-1.5 pl-2 pr-3 text-left border-b-2 border-slate-400" rowspan="2">#</th>
            <th class="py-1.5 pr-3 text-left border-b-2 border-slate-400" rowspan="2">DESCRIPTIONS</th>
            <th class="py-1 px-3 text-center border border-slate-300 bg-blue-50 text-blue-700" colspan="4">BUYING / PAY</th>
            <th class="py-1 px-3 text-center border border-slate-300 bg-emerald-50 text-emerald-700" colspan="4">SELLING / COLLECT</th>
            <th class="py-1 px-3 text-center border border-slate-300 bg-orange-50 text-orange-700" rowspan="2">EST GROSS PROFIT</th>
          </tr>
          <tr class="text-[10px] uppercase tracking-wide">
            <th class="py-1 px-3 text-center border border-slate-300 bg-blue-50 text-blue-700">Q'TY</th>
            <th class="py-1 px-3 text-center border border-slate-300 bg-blue-50 text-blue-700">UNIT</th>
            <th class="py-1 px-3 text-center border border-slate-300 bg-blue-50 text-blue-700">A'MT</th>
            <th class="py-1 px-3 text-center border border-slate-300 bg-blue-50 text-blue-700">VND PAY</th>
            <th class="py-1 px-3 text-center border border-slate-300 bg-emerald-50 text-emerald-700">Q'TY</th>
            <th class="py-1 px-3 text-center border border-slate-300 bg-emerald-50 text-emerald-700">UNIT</th>
            <th class="py-1 px-3 text-center border border-slate-300 bg-emerald-50 text-emerald-700">A'MT</th>
            <th class="py-1 px-3 text-center border border-slate-300 bg-emerald-50 text-emerald-700">VND COLLECT</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('')}
        </tbody>
        <tfoot>
          <tr class="border-t-2 border-slate-400 font-bold text-[11px] bg-slate-50">
            <td class="py-2 pl-2 pr-3" colspan="5">TOTAL</td>
            <td class="py-2 pr-3 text-right text-blue-800">${fmtNum(totalBuy)}</td>
            <td class="py-2 pr-3" colspan="3"></td>
            <td class="py-2 pr-3 text-right text-emerald-800">${fmtNum(totalSell)}</td>
            <td class="py-2 pr-2 text-right ${totalMargin >= 0 ? 'text-emerald-700' : 'text-red-600'}">${fmtNum(totalMargin)}</td>
          </tr>
        </tfoot>
      </table>
    </div>`;
}

// ── signature block ───────────────────────────────────────────────────────────

function signatureBlock() {
  const sig = (label) => `
    <div class="flex flex-col items-center gap-1">
      <div class="text-[10px] text-slate-500 uppercase tracking-wide mb-6">${label}</div>
      <div class="border-t border-slate-400 w-36 pt-1 text-[10px] text-center text-slate-500">Signature / Date</div>
    </div>`;
  return `
    <div class="flex justify-around mt-10">
      ${sig('Sales Rep')}
      ${sig('Prepared By')}
      ${sig('Approved By')}
    </div>`;
}

// ── empty state ───────────────────────────────────────────────────────────────

function notFoundHtml(ref) {
  return `
    <div class="p-8 text-center">
      <div class="text-sm font-semibold text-slate-700">Shipment ${ref} not found</div>
      <div class="text-xs text-slate-500 mt-1">Import or create it via <a href="#/sales/me/pnl/new" class="underline">Sales · New Form</a></div>
    </div>`;
}

// ── entry point ───────────────────────────────────────────────────────────────

export async function render(root, ref) {
  root.innerHTML = `
    <div class="p-6 max-w-[960px] mx-auto">
      <div class="flex items-center justify-between mb-4 no-print">
        <div>
          <div class="text-xs text-slate-500">F-12-08 · PROFIT-LOSS BUDGET</div>
          <div class="text-base font-semibold text-slate-900">${ref}</div>
        </div>
        <div class="flex items-center gap-3">
          <a href="#/shipments" class="text-xs text-slate-500 hover:underline">← Shipments</a>
          <button onclick="window.print()"
            class="px-4 py-1.5 bg-blue-600 text-white text-xs rounded font-medium hover:bg-blue-700 transition no-print">
            Print / PDF
          </button>
        </div>
      </div>
      <div id="budget-doc" class="print-doc bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div class="text-center mb-6">
          <div class="font-bold text-base text-slate-900">${COMPANY_NAME}</div>
          <div class="text-xs text-slate-500">${COMPANY_ADDRESS} · Tel: ${COMPANY_TEL}</div>
          <div class="mt-3 text-sm font-bold uppercase tracking-widest text-slate-800 border-t border-b border-slate-300 py-1.5">
            PROFIT-LOSS BUDGET
          </div>
        </div>
        <div id="budget-content" class="text-xs text-slate-500">Loading…</div>
      </div>
    </div>

    <style>
      @media print {
        .no-print { display: none !important; }
        .print-doc { border: none; box-shadow: none; padding: 0; }
        body { background: white; }
      }
    </style>`;

  const contentEl = root.querySelector('#budget-content');

  const [shipment, lines] = await Promise.all([loadShipment(ref), loadLines(ref)]);

  if (!shipment) {
    contentEl.innerHTML = notFoundHtml(ref);
    return;
  }

  contentEl.innerHTML = `
    ${headerBlock(shipment)}
    ${lineTable(lines)}
    ${signatureBlock()}`;
}
