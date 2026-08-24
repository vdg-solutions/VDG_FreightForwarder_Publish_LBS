// section-lines.js — Section B: split-column P&L table with kind auto-classify + WMA prediction
import { t, currentLocale } from '../../../../kernel/core_abstractions/i18n/index.js';
import { kindI18nLabel }    from '../../../../kernel/core_abstractions/util/kind-i18n.js';
import { ensureWmaStyle, applyWmaToRow, applyWmaToAllRows, dismissWmaBadge }
  from './section-lines-wma.js';
import { computeLineVnd, fxCellsHtml, vndCellHtml, wireLineFx, applyFxDateDefaults, prefillRowFx,
  DEFAULT_HEADER_CURRENCY } from './pnl-line-fx.js';

// Mirrors Rust PNL_VERTICAL_KIND_MAP — prefix-to-kind for AC-10
export const PNL_VERTICAL_KIND_MAP_JS = {
  'OCEAN FREIGHT': 'OceanFreight',
  'AIR FREIGHT':   'Air',
  'SEAL':          'Customs',
  'BILL':          'Other',
  'TELEX':         'Other',
  'AMS':           'Other',
  'D/O':           'HandlingAgent',
  'DEM':           'Other',
  'DET':           'Other',
  'CFS':           'HandlingAgent',
  'FUMI':          'Other',
  'HANDLING':      'HandlingAgent',
  'LATE PAYMENT':  'Other',
  'REFUND':        'Other',
  'SHUT OUT':      'Other',
  'THC':           'THC',
  'BAF':           'BAF',
  'CAF':           'CAF',
  'EBS':           'EBS',
  'BANK CHARGE':   'BankCharge',
  'CHI PHÍ AGENT': 'HandlingAgent', 'CHI PHI AGENT': 'HandlingAgent',
  'BÁN RA':        'FreightRevenue', 'BAN RA':        'FreightRevenue',
  'MUA VÀO':       'FreightCost',    'MUA VAO':       'FreightCost',
};

export const KIND_LIST = ['OceanFreight','Air','Customs','HandlingAgent','THC','BAF','CAF','EBS','BankCharge','FreightRevenue','FreightCost','Other'];
const POL_POD_OPTS = ['N/A', 'POL', 'POD'];
const INIT_ROWS    = 3;
const CELL_CLS     = 'border border-slate-200 rounded px-1 py-0.5 text-xs';

/**
 * classifyKind — case-insensitive prefix match against PNL_VERTICAL_KIND_MAP_JS, fallback 'Other' (AC-10)
 * @param {string} desc
 * @returns {string}
 */
export function classifyKind(desc) {
  const upper = (desc || '').trim().toUpperCase();
  for (const [prefix, kind] of Object.entries(PNL_VERTICAL_KIND_MAP_JS)) {
    if (upper.startsWith(prefix)) return kind;
  }
  return 'Other';
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

export function lineRowHtml(idx, line = {}, headerCurrency) {
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
      ${fxCellsHtml('buy', line, headerCurrency)}
      ${vndCellHtml('buy', line)}
      <td class="px-1 py-1 bg-emerald-50/20">
        <input name="sell_qty" type="number" value="${line.sell_qty ?? ''}" placeholder="${t('sales_new.ph_qty')}"
          class="w-14 ${CELL_CLS} text-right" /></td>
      <td class="px-1 py-1 bg-emerald-50/20">
        <input name="sell_unit" value="${line.sell_unit || ''}" placeholder="${t('sales_new.ph_unit')}"
          class="w-12 ${CELL_CLS}" /></td>
      <td class="px-1 py-1 bg-emerald-50/20">
        <input name="sell_amt" type="number" value="${line.sell_amt ?? ''}" placeholder="—"
          class="w-24 ${CELL_CLS} text-right font-mono" /></td>
      ${fxCellsHtml('sell', line, headerCurrency)}
      ${vndCellHtml('sell', line)}
      <td class="px-1 py-1">
        <select name="pol_pod_side" class="w-16 ${CELL_CLS}">
          ${polPodOpts(line.pol_pod_side)}
        </select></td>
      <td class="px-1 py-1 text-center">
        <button type="button" data-remove="${idx}"
          class="text-red-400 hover:text-red-600 text-xs px-1">&#x2715;</button></td>
    </tr>`;
}

// AC-02..AC-04: exported for unit tests
export function applyKindChange(descInput, newKind) {
  if (!descInput) return;
  if (descInput.dataset.userEdited === 'true') return;
  if (!newKind || newKind === '—') { descInput.value = ''; return; }
  descInput.value = kindI18nLabel(newKind, currentLocale());
}

function onKindChange(rowEl, newKind) {
  applyKindChange(rowEl.querySelector('.col-description input'), newKind);
}

export function sectionBHtml(draft = {}) {
  const lines          = draft.lines || [];
  // Never '' — an empty header sends fxCellsHtml down its own VND fallback, which is a different
  // currency from the header select's USD fallback (see DEFAULT_HEADER_CURRENCY).
  const headerCurrency = draft.currency || DEFAULT_HEADER_CURRENCY;
  const padded = lines.length >= INIT_ROWS
    ? lines
    : [...lines, ...Array(INIT_ROWS - lines.length).fill({})];
  const rows = padded.map((l, i) => lineRowHtml(i, l, headerCurrency)).join('');
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
          <div class="text-[10px] text-slate-500 font-medium">Tổng Chi (VND)</div>
          <div id="quick-total-pay" class="text-sm font-semibold text-blue-700 mt-0.5">0</div>
        </div>
        <div class="bg-white p-2 rounded border border-slate-200">
          <div class="text-[10px] text-slate-500 font-medium">Tổng Thu (VND)</div>
          <div id="quick-total-collect" class="text-sm font-semibold text-emerald-700 mt-0.5">0</div>
        </div>
        <div class="bg-white p-2 rounded border border-slate-200">
          <div class="text-[10px] text-slate-500 font-medium">Lợi Nhuận Gộp (Margin)</div>
          <div id="quick-margin" class="text-sm font-semibold text-slate-900 mt-0.5">0</div>
        </div>
        <div class="bg-white p-2 rounded border border-slate-200">
          <div class="text-[10px] text-slate-500 font-medium">Tỷ Suất Lợi Nhuận (Margin %)</div>
          <div id="quick-margin-pct" class="text-sm font-semibold text-slate-900 mt-0.5">—</div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-xs min-w-[1500px]" id="lines-table">
          <thead>
            <tr class="bg-slate-100/70 border-b border-slate-200">
              <th colspan="3" class="px-2 py-1 text-left text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Hạng mục</th>
              <th colspan="7" class="px-2 py-1 text-center bg-blue-100/50 text-blue-800 font-semibold uppercase tracking-wider text-[10px] border-x border-blue-200">Chi Phí Mua (Chi)</th>
              <th colspan="7" class="px-2 py-1 text-center bg-emerald-100/50 text-emerald-800 font-semibold uppercase tracking-wider text-[10px] border-r border-emerald-200">Doanh Thu Bán (Thu)</th>
              <th colspan="2" class="px-2 py-1 text-center text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Khác</th>
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

// ── Section wiring ────────────────────────────────────────────────────────────

// F-29-10 AC-01/AC-02: prefill blank buy/sell fx_rate cells (add-line/Tab/mount), never
// clobbering a manually-set or persisted rate — see prefillRowFx overwrite guard.
function _prefillRow(row, fxRepo, onChanged) {
  if (!row || !fxRepo) return;
  Promise.all([prefillRowFx(row, 'buy', fxRepo), prefillRowFx(row, 'sell', fxRepo)])
    .then(() => onChanged?.());
}

export function wireLinesSection(root, onChanged, repId, fxRepo, docDate) {
  const tbody = root.querySelector('#lines-tbody');
  if (!tbody) return;

  ensureWmaStyle();
  wireLineFx(tbody, fxRepo, docDate);
  tbody.querySelectorAll('tr[data-line]').forEach((r) => _prefillRow(r, fxRepo, onChanged));

  // Mount: fire-and-forget WMA predictions for blank-kind rows
  if (repId) {
    applyWmaToAllRows(tbody, repId, classifyKind).catch((err) => {
      console.warn('[wma] mount predict failed:', err.message); // DEV
    });
  }

  root.querySelector('#add-line-btn')?.addEventListener('click', () => {
    const idx = tbody.querySelectorAll('tr[data-line]').length;
    const headerCurrency = root.querySelector('[name=currency]')?.value || '';
    const tmp = document.createElement('tbody');
    tmp.innerHTML = lineRowHtml(idx, {}, headerCurrency);
    const newRow = tmp.firstElementChild;
    tbody.appendChild(newRow);
    applyFxDateDefaults(newRow, docDate);
    _prefillRow(newRow, fxRepo, onChanged);
    if (repId) {
      applyWmaToRow(newRow, repId, classifyKind).catch((err) => {
        console.warn('[wma] new row predict failed:', err.message); // DEV
      });
    }
    onChanged?.();
  });

  tbody.addEventListener('input', (e) => {
    // AC-06: real keystroke on desc → mark as user-edited
    if (e.target.name === 'desc' && e.isTrusted) {
      e.target.dataset.userEdited = 'true';
    }
    // UX enhancement: auto-mirror buy_qty and buy_unit to sell side when sell side is blank
    const row = e.target.closest('tr[data-line]');
    if (row && e.isTrusted) {
      if (e.target.name === 'buy_qty') {
        const sellQty = row.querySelector('[name=sell_qty]');
        if (sellQty && (!sellQty.value || sellQty.dataset.autoSynced === 'true')) {
          sellQty.value = e.target.value;
          sellQty.dataset.autoSynced = 'true';
        }
      } else if (e.target.name === 'buy_unit') {
        const sellUnit = row.querySelector('[name=sell_unit]');
        if (sellUnit && (!sellUnit.value || sellUnit.dataset.autoSynced === 'true')) {
          sellUnit.value = e.target.value;
          sellUnit.dataset.autoSynced = 'true';
        }
      } else if (e.target.name === 'sell_qty' || e.target.name === 'sell_unit') {
        delete e.target.dataset.autoSynced;
      }
    }
    onChanged?.();
  });

  tbody.addEventListener('change', (e) => {
    if (e.target.name === 'kind') {
      e.target.dataset.manuallySet = 'true';
      onKindChange(e.target.closest('tr[data-line]'), e.target.value);
    }
    onChanged?.();
  });

  // AC-10: description blur → auto-classify kind (only if not manually set)
  tbody.addEventListener('focusout', (e) => {
    if (e.target.name !== 'desc') return;
    const row = e.target.closest('tr[data-line]');
    if (!row) return;
    const kindSel = row.querySelector('[name=kind]');
    if (!kindSel || kindSel.dataset.manuallySet === 'true') return;
    kindSel.value = classifyKind(e.target.value);
    onChanged?.();
  });

  // Tab on last input of last row → append new row
  tbody.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || e.shiftKey) return;
    const rows    = tbody.querySelectorAll('tr[data-line]');
    const lastRow = rows[rows.length - 1];
    if (!lastRow) return;
    const inputs = lastRow.querySelectorAll('input,select');
    if (e.target !== inputs[inputs.length - 1]) return;
    e.preventDefault();
    const newIdx = rows.length;
    const headerCurrency = root.querySelector('[name=currency]')?.value || '';
    const tmp = document.createElement('tbody');
    tmp.innerHTML = lineRowHtml(newIdx, {}, headerCurrency);
    const newRow = tmp.firstElementChild;
    tbody.appendChild(newRow);
    applyFxDateDefaults(newRow, docDate);
    _prefillRow(newRow, fxRepo, onChanged);
    newRow.querySelector('input,select')?.focus();
    if (repId) {
      applyWmaToRow(newRow, repId, classifyKind).catch((err) => {
        console.warn('[wma] tab row predict failed:', err.message); // DEV
      });
    }
    onChanged?.();
  });

  tbody.addEventListener('click', async (e) => {
    const badge = e.target.closest('.wma-badge');
    if (badge) {
      if (await dismissWmaBadge(badge, repId)) onChanged?.();
      return;
    }
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    btn.closest('tr[data-line]')?.remove();
    onChanged?.();
  });
}

export function collectLines(root) {
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
      vnd_pay:      computeLineVnd(buy_amt, buy_currency, buy_fx_rate),
      sell_qty:     parseFloat(row.querySelector('[name=sell_qty]')?.value)     || 0,
      sell_unit:    row.querySelector('[name=sell_unit]')?.value     || '',
      sell_amt,
      sell_currency,
      sell_fx_rate,
      sell_fx_date: row.querySelector('[name=sell_fx_date]')?.value  || '',
      vnd_collect:  computeLineVnd(sell_amt, sell_currency, sell_fx_rate),
      pol_pod_side: row.querySelector('[name=pol_pod_side]')?.value  || 'N/A',
    };
  });
}

/** sumVndPay — Σ line.vnd_pay */
export function sumVndPay(lines) {
  return lines.reduce((s, l) => s + (l.vnd_pay || 0), 0);
}

/** sumVndCollect — Σ line.vnd_collect */
export function sumVndCollect(lines) {
  return lines.reduce((s, l) => s + (l.vnd_collect || 0), 0);
}
