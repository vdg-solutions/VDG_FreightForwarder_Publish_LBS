// sales-drop-preview.js — combined-format preview table renderers.
// Extracted from sales-drop.js to keep it under the 350-line cap (F-15-57, R-B).

function fmt(v) {
  if (v == null || v === '') return '—';
  if (typeof v === 'number') return v.toLocaleString();
  return String(v);
}

function marginClass(m) {
  if (!m && m !== 0) return 'text-slate-500';
  return m >= 0 ? 'text-emerald-600' : 'text-red-500';
}

function computeTotals(shipment, lines) {
  const ref = shipment.shipment_ref || shipment.ShipmentRef;
  const relevant = (lines || []).filter(
    (l) => (l.shipment_ref || l.ShipmentRef) === ref,
  );
  let buy = 0, sell = 0;
  for (const l of relevant) {
    buy  += Number(l.buying_vnd_pay     ?? l.BuyingVNDPay     ?? 0);
    sell += Number(l.selling_vnd_collect ?? l.SellingVNDCollect ?? 0);
  }
  return { buy, sell, margin: sell - buy, count: relevant.length };
}

export function renderShipmentRow(s, lines, idx) {
  const ref      = s.shipment_ref || s.ShipmentRef || '—';
  const customer = s.customer     || s.Customer    || '—';
  const pol      = s.pol          || s.POL         || '—';
  const pod      = s.pod          || s.POD         || '—';
  const etd      = s.etd          || s.ETD         || '—';
  const mode     = s.mode         || s.Product     || '—';
  const carrier  = s.carrier      || s.Carrier     || '—';
  const { buy, sell, margin, count } = computeTotals(s, lines);
  return `
    <tr class="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" data-row="${idx}">
      <td class="px-3 py-2 font-mono text-xs text-slate-700">${ref}</td>
      <td class="px-3 py-2 text-xs">${customer}</td>
      <td class="px-3 py-2 text-xs font-mono">${pol}</td>
      <td class="px-3 py-2 text-xs font-mono">${pod}</td>
      <td class="px-3 py-2 text-xs">${etd}</td>
      <td class="px-3 py-2 text-xs">${mode}</td>
      <td class="px-3 py-2 text-xs">${carrier}</td>
      <td class="px-3 py-2 text-xs text-right">${count}</td>
      <td class="px-3 py-2 text-xs text-right">${buy ? buy.toLocaleString() : '—'}</td>
      <td class="px-3 py-2 text-xs text-right">${sell ? sell.toLocaleString() : '—'}</td>
      <td class="px-3 py-2 text-xs text-right font-semibold ${marginClass(margin)}">${margin ? margin.toLocaleString() : '—'}</td>
    </tr>`;
}

export function renderLinesSubTable(lines) {
  if (!lines || !lines.length) return '<p class="text-xs text-slate-400 px-3 py-2">No lines</p>';
  const rows = lines.map((l) => `
    <tr class="border-t border-slate-100">
      <td class="px-3 py-1.5 text-xs">${l.line_no ?? l.LineNo ?? '—'}</td>
      <td class="px-3 py-1.5 text-xs">${l.description ?? l.Description ?? '—'}</td>
      <td class="px-3 py-1.5 text-xs">${l.kind ?? l.Kind ?? '—'}</td>
      <td class="px-3 py-1.5 text-xs text-right">${fmt(l.buying_vnd_pay ?? l.BuyingVNDPay)}</td>
      <td class="px-3 py-1.5 text-xs text-right">${fmt(l.selling_vnd_collect ?? l.SellingVNDCollect)}</td>
    </tr>`).join('');
  return `<table class="w-full text-[11px]">
    <thead class="bg-slate-100 text-slate-600">
      <tr>
        <th class="px-3 py-1 text-left">#</th>
        <th class="px-3 py-1 text-left">Description</th>
        <th class="px-3 py-1 text-left">Kind</th>
        <th class="px-3 py-1 text-right">Buy VND</th>
        <th class="px-3 py-1 text-right">Sell VND</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export function renderRightPanel(report, detect) {
  const errors   = report.errors   ?? [];
  const warnings = report.warnings ?? [];
  const errList  = errors.slice(0, 20).map((e) => `<li class="text-xs text-red-700">${e}</li>`).join('');
  const warnList = warnings.slice(0, 10).map((w) => `<li class="text-xs text-amber-700">${w}</li>`).join('');
  return `
    <div class="space-y-4">
      <div class="rounded-lg border border-red-200 bg-red-50 p-3">
        <div class="text-xs font-semibold text-red-700 mb-1">Errors (${errors.length})</div>
        ${errors.length ? `<ul class="list-disc pl-4 space-y-0.5">${errList}</ul>` : '<p class="text-xs text-red-400">None</p>'}
      </div>
      <div class="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div class="text-xs font-semibold text-amber-700 mb-1">Warnings (${warnings.length})</div>
        ${warnings.length ? `<ul class="list-disc pl-4 space-y-0.5">${warnList}</ul>` : '<p class="text-xs text-amber-400">None</p>'}
      </div>
    </div>`;
}
