// section-lines.js — Section B: split-column P&L table with kind auto-classify + WMA prediction
import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { computeLineVnd, fxCellsHtml, vndCellHtml, DEFAULT_HEADER_CURRENCY } from './pnl-line-fx.js';

export const KIND_LIST = ['OceanFreight','Air','Customs','HandlingAgent','THC','BAF','CAF','EBS','BankCharge','FreightRevenue','FreightCost','Other'];
const POL_POD_OPTS = ['N/A', 'POL', 'POD'];
const INIT_ROWS    = 3;
const CELL_CLS     = 'border border-slate-200 rounded px-1 py-0.5 text-xs';

// The prefix->kind table (26 entries incl. Vietnamese prefixes) and the classify rule both moved
// to Rust (rulesets::pnl_line_kind) — a comment here used to claim a Rust PNL_VERTICAL_KIND_MAP
// mirror already existed; a repo-wide grep found none, so this table was the only source. This is
// now a thin call over the wasm export; no business rule left in JS (AC-10).
const wasm = () => globalThis.window?.__vdg_wasm || globalThis.__vdg_wasm;

/**
 * classifyKind — case-insensitive prefix match, fallback 'Other' (AC-10). Decided by wasm.
 * @param {string} desc
 * @returns {string}
 */
export function classifyKind(desc) {
  const mod = wasm();
  if (typeof mod?.classify_pnl_line_kind !== 'function') {
    throw new Error('section-lines: wasm not ready — classify_pnl_line_kind missing');
  }
  return mod.classify_pnl_line_kind(desc || '');
}

function kindOpts(selected) {
  return KIND_LIST.map((k) =>
    `<option value="${k}"${k === selected ? ' selected' : ''}>${t('kind.' + k)}</option>`
  ).join('');
}

function polPodOpts(selected) {
  return POL_POD_OPTS.map((o) =>
    `<option value="${o}"${o === (selected || 'N/A') ? ' selected' : ''}>${o}</option>`
  ).join('');
}

export function lineRowHtml(idx, line = {}, headerCurrency, bookCurrency) {
  // AC-04/F-15-61: auto-classify when kind absent or not a recognised frontend value
  // Rust LineSubType variants (HandlingCost, SurchargeCost, …) are truthy but not in KIND_LIST
  const effectiveDesc = line.desc || line.description || '';
  const kindInList    = line.kind ? KIND_LIST.includes(line.kind) : false;
  const effectiveKind = (!kindInList && effectiveDesc) ? classifyKind(effectiveDesc) : (line.kind || '');
  return `
    <tr data-line="${idx}" class="border-t border-slate-100 hover:bg-slate-50/50">
      <td class="px-1 py-1 text-xs text-slate-400 text-center font-mono">${idx + 1}</td>
      <td class="col-loai px-1 py-1">
        <select name="kind" data-auto-kind="true" class="w-28 ${CELL_CLS}">
          <option value="">—</option>${kindOpts(effectiveKind)}
        </select></td>
      <td class="col-description px-1 py-1">
        <input name="desc" value="${line.desc || ''}" placeholder="${t('sales_new.ph_description')}"
          class="w-36 ${CELL_CLS}" /></td>
      <td class="px-1 py-1 bg-blue-50/20">
        <input name="buy_qty" type="number" value="${line.buy_qty ?? ''}" placeholder="${t('sales_new.ph_qty')}"
          class="w-14 ${CELL_CLS} text-right" /></td>
      <td class="px-1 py-1 bg-blue-50/20">
        <input name="buy_unit" value="${line.buy_unit || ''}" placeholder="${t('sales_new.ph_unit')}"
          class="w-12 ${CELL_CLS}" /></td>
      <td class="px-1 py-1 bg-blue-50/20">
        <input name="buy_amt" type="number" value="${line.buy_amt ?? ''}" placeholder="—"
          class="w-24 ${CELL_CLS} text-right font-mono" /></td>
      ${fxCellsHtml('buy', line, headerCurrency, bookCurrency)}
      ${vndCellHtml('buy', line, bookCurrency)}
      <td class="px-1 py-1 bg-emerald-50/20">
        <input name="sell_qty" type="number" value="${line.sell_qty ?? ''}" placeholder="${t('sales_new.ph_qty')}"
          class="w-14 ${CELL_CLS} text-right" /></td>
      <td class="px-1 py-1 bg-emerald-50/20">
        <input name="sell_unit" value="${line.sell_unit || ''}" placeholder="${t('sales_new.ph_unit')}"
          class="w-12 ${CELL_CLS}" /></td>
      <td class="px-1 py-1 bg-emerald-50/20">
        <input name="sell_amt" type="number" value="${line.sell_amt ?? ''}" placeholder="—"
          class="w-24 ${CELL_CLS} text-right font-mono" /></td>
      ${fxCellsHtml('sell', line, headerCurrency, bookCurrency)}
      ${vndCellHtml('sell', line, bookCurrency)}
      <td class="px-1 py-1">
        <select name="pol_pod_side" class="w-16 ${CELL_CLS}">
          ${polPodOpts(line.pol_pod_side)}
        </select></td>
      <td class="px-1 py-1 text-center">
        <button type="button" data-remove="${idx}"
          class="text-red-400 hover:text-red-600 text-xs px-1">&#x2715;</button></td>
    </tr>`;
}

export function sectionBHtml(draft = {}) {
  const lines          = draft.lines || [];
  // Never '' — an empty header sends fxCellsHtml down its own VND fallback, which is a different
  // currency from the header select's USD fallback (see DEFAULT_HEADER_CURRENCY).
  const headerCurrency = draft.currency || DEFAULT_HEADER_CURRENCY;
  const bookCurrency   = draft.book_currency || DEFAULT_HEADER_CURRENCY;
  const padded = lines.length >= INIT_ROWS
    ? lines
    : [...lines, ...Array(INIT_ROWS - lines.length).fill({})];
  const rows = padded.map((l, i) => lineRowHtml(i, l, headerCurrency, bookCurrency)).join('');
  return `
    <div id="sec-b-body" class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          ${t('sales_new.section.lines')}
        </div>
        <button type="button" id="add-line-btn"
          class="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md hover:bg-blue-100 transition-colors">${t('sales_new.col_add_row')}</button>
      </div>

      <!-- Quick KPI Stats Bar -->
      <div class="grid grid-cols-4 gap-3 mb-4 p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs">
        <div class="bg-white p-2 rounded border border-slate-200">
          <div class="text-[10px] text-slate-500 font-medium">${t('sales_new.kpi_total_pay')}</div>
          <div id="quick-total-pay" class="text-sm font-semibold text-blue-700 mt-0.5">0</div>
        </div>
        <div class="bg-white p-2 rounded border border-slate-200">
          <div class="text-[10px] text-slate-500 font-medium">${t('sales_new.kpi_total_collect')}</div>
          <div id="quick-total-collect" class="text-sm font-semibold text-emerald-700 mt-0.5">0</div>
        </div>
        <div class="bg-white p-2 rounded border border-slate-200">
          <div class="text-[10px] text-slate-500 font-medium">${t('sales_new.kpi_margin')}</div>
          <div id="quick-margin" class="text-sm font-semibold text-slate-900 mt-0.5">0</div>
        </div>
        <div class="bg-white p-2 rounded border border-slate-200">
          <div class="text-[10px] text-slate-500 font-medium">${t('sales_new.kpi_margin_pct')}</div>
          <div id="quick-margin-pct" class="text-sm font-semibold text-slate-900 mt-0.5">—</div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-xs min-w-[1500px]" id="lines-table">
          <thead>
            <tr class="bg-slate-100/70 border-b border-slate-200">
              <th colspan="3" class="px-2 py-1 text-left text-slate-500 font-semibold uppercase tracking-wider text-[10px]">${t('sales_new.col_group_item')}</th>
              <th colspan="7" class="px-2 py-1 text-center bg-blue-100/50 text-blue-800 font-semibold uppercase tracking-wider text-[10px] border-x border-blue-200">${t('sales_new.col_group_buy')}</th>
              <th colspan="7" class="px-2 py-1 text-center bg-emerald-100/50 text-emerald-800 font-semibold uppercase tracking-wider text-[10px] border-r border-emerald-200">${t('sales_new.col_group_sell')}</th>
              <th colspan="2" class="px-2 py-1 text-center text-slate-500 font-semibold uppercase tracking-wider text-[10px]">${t('sales_new.col_group_other')}</th>
            </tr>
            <tr class="bg-slate-50 border-b border-slate-200">
              <th class="px-1 py-1.5 text-left text-slate-400 w-6">#</th>
              <th class="px-1 py-1.5 text-left text-slate-500">${t('sales_new.col_kind')}</th>
              <th class="px-1 py-1.5 text-left text-slate-500">${t('sales_new.col_description')}</th>
              <th class="px-1 py-1.5 text-right text-blue-700 bg-blue-50/30">${t('sales_new.col_buy_qty')}</th>
              <th class="px-1 py-1.5 text-left text-blue-700 bg-blue-50/30">${t('sales_new.col_unit')}</th>
              <th class="px-1 py-1.5 text-right text-blue-700 bg-blue-50/30">${t('sales_new.col_buy_amt')}</th>
              <th class="px-1 py-1.5 text-left text-blue-700 bg-blue-50/30">${t('sales_new.col_currency')}</th>
              <th class="px-1 py-1.5 text-right text-blue-700 bg-blue-50/30">${t('sales_new.col_fx_rate')}</th>
              <th class="px-1 py-1.5 text-left text-blue-700 bg-blue-50/30">${t('sales_new.col_fx_date')}</th>
              <th class="px-1 py-1.5 text-right text-blue-800 font-semibold bg-blue-100/40">${t('sales_new.col_vnd_pay')}</th>
              <th class="px-1 py-1.5 text-right text-emerald-700 bg-emerald-50/30">${t('sales_new.col_sell_qty')}</th>
              <th class="px-1 py-1.5 text-left text-emerald-700 bg-emerald-50/30">${t('sales_new.col_unit')}</th>
              <th class="px-1 py-1.5 text-right text-emerald-700 bg-emerald-50/30">${t('sales_new.col_sell_amt')}</th>
              <th class="px-1 py-1.5 text-left text-emerald-700 bg-emerald-50/30">${t('sales_new.col_currency')}</th>
              <th class="px-1 py-1.5 text-right text-emerald-700 bg-emerald-50/30">${t('sales_new.col_fx_rate')}</th>
              <th class="px-1 py-1.5 text-left text-emerald-700 bg-emerald-50/30">${t('sales_new.col_fx_date')}</th>
              <th class="px-1 py-1.5 text-right text-emerald-800 font-semibold bg-emerald-100/40">${t('sales_new.col_vnd_collect')}</th>
              <th class="px-1 py-1.5 text-left text-slate-500">${t('sales_new.col_pol_pod')}</th>
              <th class="px-1 py-1.5 w-6"></th>
            </tr>
          </thead>
          <tbody id="lines-tbody">${rows}</tbody>
        </table>
      </div>
    </div>`;
}

// Section wiring (wireLinesSection, applyKindChange) extracted to section-lines-wiring.js
// (350-line cap) — mirrors the section-header.js / section-header-wiring.js split.

export function collectLines(root) {
  const bookCurrency = root.querySelector('[name=book_currency]')?.value || DEFAULT_HEADER_CURRENCY;
  return Array.from(root.querySelectorAll('#lines-tbody tr[data-line]')).map((row) => {
    const buy_amt      = parseFloat(row.querySelector('[name=buy_amt]')?.value)      || 0;
    const buy_currency  = row.querySelector('[name=buy_currency]')?.value  || '';
    const buy_fx_rate   = parseFloat(row.querySelector('[name=buy_fx_rate]')?.value)  || 0;
    const sell_amt      = parseFloat(row.querySelector('[name=sell_amt]')?.value)     || 0;
    const sell_currency = row.querySelector('[name=sell_currency]')?.value || '';
    const sell_fx_rate  = parseFloat(row.querySelector('[name=sell_fx_rate]')?.value) || 0;
    return {
      desc:         row.querySelector('[name=desc]')?.value          || '',
      kind:         row.querySelector('[name=kind]')?.value          || '',
      buy_qty:      parseFloat(row.querySelector('[name=buy_qty]')?.value)      || 0,
      buy_unit:     row.querySelector('[name=buy_unit]')?.value      || '',
      buy_amt,
      buy_currency,
      buy_fx_rate,
      buy_fx_date:  row.querySelector('[name=buy_fx_date]')?.value   || '',
      // AC-02: vnd_amount is DERIVED, not read off the (now-readonly) cell
      vnd_pay:      computeLineVnd(buy_amt, buy_currency, buy_fx_rate, bookCurrency),
      sell_qty:     parseFloat(row.querySelector('[name=sell_qty]')?.value)     || 0,
      sell_unit:    row.querySelector('[name=sell_unit]')?.value     || '',
      sell_amt,
      sell_currency,
      sell_fx_rate,
      sell_fx_date: row.querySelector('[name=sell_fx_date]')?.value  || '',
      vnd_collect:  computeLineVnd(sell_amt, sell_currency, sell_fx_rate, bookCurrency),
      pol_pod_side: row.querySelector('[name=pol_pod_side]')?.value  || 'N/A',
    };
  });
}
