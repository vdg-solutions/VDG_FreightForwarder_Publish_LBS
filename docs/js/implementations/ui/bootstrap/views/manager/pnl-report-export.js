// Spreadsheet export for the P&L pivot -- its own file because loading a CDN library and
// laying out cells is a different responsibility from rendering the report, and the two only
// meet at the rows the view already computed. Rows and period come in as arguments; this module
// holds no view state of its own.
import { todayLocal } from '../../../../kernel/core_abstractions/util/today-local.js';

const SHEETJS_CDN = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js';

let _sheetJsLoaded = false;

async function loadSheetJs() {
  if (_sheetJsLoaded || window.XLSX) { _sheetJsLoaded = true; return; }
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = SHEETJS_CDN;
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
  _sheetJsLoaded = true;
}

export async function exportExcel(rows, period) {
  await loadSheetJs();
  if (!window.XLSX) return;
  const XLSX   = window.XLSX;
  const header = ['Dims', 'Revenue VND', 'Cost VND', 'Margin VND', 'Margin %', '# Shipments'];
  const wsData = [header, ...rows.map((r) => [
    Object.values(r.dims).join(' · '),
    r.revenue_vnd, r.cost_vnd, r.margin_vnd, r.margin_pct / 100, r.shipment_count,
  ])];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  // Bold header + number formats
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = { font: { bold: true } };
  }
  const fmtCols = [1, 2, 3]; // revenue, cost, margin
  for (let R = 1; R <= rows.length; R++) {
    for (const C of fmtCols) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (ws[addr]) ws[addr].z = '#,##0';
    }
    const pctAddr = XLSX.utils.encode_cell({ r: R, c: 4 });
    if (ws[pctAddr]) ws[pctAddr].z = '0.0%';
  }
  const wb   = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PnL Report');
  const date = todayLocal();
  XLSX.writeFile(wb, `vdg-pnl-${period.toLowerCase()}-${date}.xlsx`);
}
