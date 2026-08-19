// Manager P&L drill-down cost-line rows — per-side original currency + fx + VND (F-29-06)
// Reads the line's OWN persisted buying_*/selling_* fields; NO fx re-lookup (imports only t).
import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { kindI18nLabel } from '../../../../kernel/core_abstractions/util/kind-i18n.js';

const VND = 'VND';
const VND_RATE = 1;
const EMPTY = '—';
const COST_LINE_COLSPAN = 9;

// Converted-VND persisted field per side (already derived at entry via computeLineVnd)
const VND_FIELD = { buying: 'buying_vnd_pay', selling: 'selling_vnd_collect' };

function fmtInt(n) { return Number(n).toLocaleString('en-US'); }

/**
 * drillLineSideView — pure per-side selector (AC-07 seam). side ∈ {'buying','selling'}.
 * Resolves display values from the line's own persisted fields; performs NO lookup.
 * VND: rate 1, converted = amount. Foreign + rate>0: stored rate + stored vnd.
 * Foreign + rate absent/≤0: rateMissing, rate/vnd null (honest dash, never 1:1 or 0).
 */
export function drillLineSideView(line, side) {
  const amount = Number(line[`${side}_amount`]) || 0;
  const ccy    = line[`${side}_currency`] || VND;
  const present = Number.isFinite(amount) && amount !== 0;
  if (ccy === VND) {
    return { present, amount, ccy, rate: VND_RATE, vnd: amount, rateMissing: false };
  }
  const storedRate = Number(line[`${side}_fx_rate`]);
  const rateOk = Number.isFinite(storedRate) && storedRate > 0;
  if (!rateOk) {
    return { present, amount, ccy, rate: null, vnd: null, rateMissing: true };
  }
  const vnd = Number(line[VND_FIELD[side]]);
  return {
    present, amount, ccy, rate: storedRate,
    vnd: Number.isFinite(vnd) ? vnd : null,
    rateMissing: false,
  };
}

// Four cells (amt/ccy/fx/vnd) for one side-group. Missing side or missing rate → N/A marker.
function sideCells(view) {
  const na = t('fx.report.na');
  if (!view.present) {
    const dash = `<td class="px-3 py-1.5 text-right font-mono text-slate-400">${na}</td>`;
    return `${dash}<td class="px-3 py-1.5 text-slate-400">${na}</td>${dash}${dash}`;
  }
  const rateCell = view.rateMissing ? na : fmtInt(view.rate);
  const vndCell  = (view.rateMissing || view.vnd == null) ? na : fmtInt(view.vnd);
  return `
    <td class="px-3 py-1.5 text-right font-mono">${fmtInt(view.amount)}</td>
    <td class="px-3 py-1.5">${view.ccy}</td>
    <td class="px-3 py-1.5 text-right font-mono">${rateCell}</td>
    <td class="px-3 py-1.5 text-right font-mono">${vndCell}</td>`;
}

/** drillLinesRowsHtml — tbody rows for the 9-col table; one <tr> per line, both side-groups. */
export function drillLinesRowsHtml(lines) {
  return (lines || []).map((l) => {
    const buy  = sideCells(drillLineSideView(l, 'buying'));
    const sell = sideCells(drillLineSideView(l, 'selling'));
    const kind = kindI18nLabel(l.kind ?? l.subtype) || EMPTY;
    return `
    <tr data-line-id="${l.id ?? ''}" class="border-t border-slate-100 text-xs">
      <td class="px-3 py-1.5">${kind}</td>${buy}${sell}
    </tr>`;
  }).join('');
}

/** drillLinesHeadHtml — <thead> for the 9-col layout, reusing existing i18n keys. */
export function drillLinesHeadHtml() {
  return `<thead class="bg-slate-50 text-[11px] text-slate-500 uppercase">
    <tr>
      <th class="px-3 py-1.5 text-left">${t('sales_new.col_kind')}</th>
      <th class="px-3 py-1.5 text-right">${t('sales_new.col_buy_amt')}</th>
      <th class="px-3 py-1.5">${t('sales_new.col_currency')}</th>
      <th class="px-3 py-1.5 text-right">${t('sales_new.col_fx_rate')}</th>
      <th class="px-3 py-1.5 text-right">${t('fx.report.col_vnd')}</th>
      <th class="px-3 py-1.5 text-right">${t('sales_new.col_sell_amt')}</th>
      <th class="px-3 py-1.5">${t('sales_new.col_currency')}</th>
      <th class="px-3 py-1.5 text-right">${t('sales_new.col_fx_rate')}</th>
      <th class="px-3 py-1.5 text-right">${t('fx.report.col_vnd')}</th>
    </tr>
  </thead>`;
}

export { COST_LINE_COLSPAN };
