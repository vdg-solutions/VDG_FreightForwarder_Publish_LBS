// ledger-unbalanced-modal.js — drill-through modal for an unbalanced journal entry.
// Extracted from ledger-viewer.js for the 350-line cap.

function fmtAmount(n) { return n ? Number(n).toLocaleString('vi-VN') : '—'; }

// AC-08: resolve the entry's source shipment/commission and dispatch the same drill-through
// event the per-leg source column already uses (vdg:open-detail contract, F-23-04 precedent).
export function jumpToUnbalancedEntry(entryId, legs) {
  const source = legs[0]?.source;
  if (source) {
    window.dispatchEvent(new CustomEvent('vdg:open-detail', {
      detail: { kind: source.type, id: source.id },
    }));
  }

  // Fallback / immediate view: display the legs in a modal to show exactly what is unbalanced
  const debitSum = legs.reduce((sum, l) => sum + (l.debit || 0), 0);
  const creditSum = legs.reduce((sum, l) => sum + (l.credit || 0), 0);

  const trs = legs.map(l => `
    <tr class="border-b border-slate-100">
      <td class="px-3 py-2 font-mono">${l.account_code}</td>
      <td class="px-3 py-2 text-right font-mono">${fmtAmount(l.debit)}</td>
      <td class="px-3 py-2 text-right font-mono">${fmtAmount(l.credit)}</td>
    </tr>
  `).join('');

  const dlg = document.createElement('dialog');
  dlg.className = 'rounded-xl shadow-2xl p-0 w-[500px] max-w-[95vw] bg-white backdrop:bg-black/40';
  dlg.innerHTML = `
    <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
      <div>
        <div class="font-semibold text-slate-900 text-sm">Chi tiết bút toán (Entry Details)</div>
        <div class="text-xs text-slate-500 font-mono mt-0.5">${entryId}</div>
      </div>
      <button class="w-8 h-8 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500" onclick="this.closest('dialog').close()">✕</button>
    </div>
    <div class="px-6 py-4 text-xs">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50 text-slate-500 uppercase">
            <th class="px-3 py-2">Tài khoản</th>
            <th class="px-3 py-2 text-right">Nợ (Debit)</th>
            <th class="px-3 py-2 text-right">Có (Credit)</th>
          </tr>
        </thead>
        <tbody>${trs}</tbody>
        <tfoot>
          <tr class="font-bold bg-amber-50 text-amber-900">
            <td class="px-3 py-2">TỔNG</td>
            <td class="px-3 py-2 text-right font-mono">${fmtAmount(debitSum)}</td>
            <td class="px-3 py-2 text-right font-mono">${fmtAmount(creditSum)}</td>
          </tr>
        </tfoot>
      </table>
      <div class="mt-4 text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 flex justify-between items-center font-semibold">
        <span>Lệch (Discrepancy):</span>
        <span class="font-mono text-sm">${fmtAmount(Math.abs(debitSum - creditSum))}</span>
      </div>
    </div>
  `;
  document.body.appendChild(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}
