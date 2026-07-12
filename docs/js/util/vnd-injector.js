// VND column injector for PNL drill panel (AC-08).
import { getRateForDate } from './fx-lookup.js';
import { t }             from '../i18n/index.js';

// Returns VND string or 'N/A'. fxRepo = FxRateDriveRepo instance.
export async function vndEquivalent(line, shipment, fxRepo) {
  if (!fxRepo) return t('fx.report.na');
  const raw = shipment?.etd ?? shipment?.created_at;
  if (!raw) return t('fx.report.na');
  try {
    const rate = await getRateForDate(fxRepo, String(raw).slice(0, 10));
    if (rate == null) return t('fx.report.na');
    const cur = line.currency || 'VND';
    const amt = Number(line.buy_amt ?? line.sell_amt ?? 0);
    if (cur !== 'USD') return `${Math.round(amt).toLocaleString('vi-VN')} VND`;
    return `${Math.round(amt * rate).toLocaleString('vi-VN')} VND`;
  } catch { /* rate lookup failure — show N/A, no propagation to caller */ return t('fx.report.na'); }
}

// Inject VND column into `tbody tr[data-line-id]` rows inside container.
export async function injectVndColumn(container, allPnlLines, allShipments, fxRepo) {
  if (!allPnlLines?.length || !container) return;
  const shipMap = new Map(allShipments.map((s) => [s.id, s]));
  const rows    = container.querySelectorAll('tbody tr[data-line-id]');
  if (!rows.length) return;
  const thead = container.querySelector('thead tr');
  if (thead && !thead.querySelector('[data-vnd-col]')) {
    const th = document.createElement('th');
    th.dataset.vndCol = '1';
    th.className = 'px-3 py-1.5 text-right text-[11px] text-slate-500 uppercase';
    th.textContent = t('fx.report.col_vnd');
    thead.appendChild(th);
  }
  for (const row of rows) {
    const line = allPnlLines.find((l) => l.id === row.dataset.lineId);
    const ship = line ? shipMap.get(line.shipment_id) : null;
    const td   = document.createElement('td');
    td.className = 'px-3 py-1.5 text-right text-xs font-mono';
    td.textContent = (line && ship) ? await vndEquivalent(line, ship, fxRepo) : t('fx.report.na');
    row.appendChild(td);
  }
}
