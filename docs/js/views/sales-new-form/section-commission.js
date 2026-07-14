// section-commission.js — Section C: HOA HONG parent-detail accordion (F-20-01)

import { t } from '../../i18n/index.js';
import { commFxCellsHtml, wireCommissionFx, applyCommFxDateDefaults } from './section-commission-fx.js';

const DEFAULT_TNCN_PCT = 15;
// # | Loai | Mo ta | Tong chi | Thuc nhan | toggle | delete
const PARENT_COLSPAN   = 7;
const INPUT_CLS        = 'w-full border border-slate-200 rounded px-1 py-0.5 text-xs';
const RDONLY_CLS       = `${INPUT_CLS} bg-slate-50`;
const EM_DASH          = '—';
// Strict enum — only 2 canonical kinds (CustomerRebate = hoa hong khach hang, LineCommission = hoa hong hang tau)
const KIND_OPTIONS = ['CustomerRebate', 'LineCommission'];

// Compact parent row: # | Loai (select strict) | Mo ta (freeform) | Tong chi VND | Thuc nhan VND | toggle | delete
function commParentRowHtml(idx, row = {}) {
  const kind  = row.kind        || '';
  const desc  = row.description || '';
  const rawFx  = row.amount_fx != null ? row.amount_fx : 0;
  const rawFxR = row.fx_rate   != null ? row.fx_rate   : 0;
  const gross  = rawFx && rawFxR ? rawFx * rawFxR : null;
  const net    = row.net_after_tax != null && gross !== null ? row.net_after_tax : null;
  const grossFmt = gross !== null ? gross.toLocaleString('vi-VN') : EM_DASH;
  const netFmt   = net   !== null ? net.toLocaleString('vi-VN')   : EM_DASH;

  return `
    <tr data-comm-row="${idx}" data-expanded="false"
        class="border-t border-slate-100 cursor-pointer hover:bg-slate-50">
      <td class="px-2 py-1.5 text-xs text-slate-400 text-center">${idx + 1}</td>
      <td class="px-2 py-1.5 min-w-[110px]">
        <select name="comm_kind" class="${INPUT_CLS}">
          ${KIND_OPTIONS.map((k) => {
            const label = t(`commission.kind.${k}`);
            const sel   = k === kind ? ' selected' : '';
            return `<option value="${k}"${sel}>${label}</option>`;
          }).join('')}
        </select>
      </td>
      <td class="px-2 py-1.5 min-w-[120px]">
        <input name="comm_desc" type="text"
          value="${desc}"
          placeholder="${t('sales.section_c.col_description_ph')}"
          class="${INPUT_CLS}" />
      </td>
      <td class="px-2 py-1.5 text-xs text-right font-medium text-slate-700 whitespace-nowrap"
          data-gross-display>${grossFmt}</td>
      <td class="px-2 py-1.5 text-xs text-right font-medium text-emerald-700 whitespace-nowrap"
          data-net-display>${netFmt}</td>
      <td class="px-2 py-1 text-center w-7">
        <button type="button" data-toggle-comm="${idx}"
          aria-label="${t('sales.section_c.detail_toggle')}"
          class="text-slate-400 hover:text-slate-600 select-none">&#9656;</button>
      </td>
      <td class="px-2 py-1 text-center w-7">
        <button type="button" data-remove-comm="${idx}"
          title="${t('commission.delete_row')}"
          class="text-red-400 hover:text-red-600 text-sm leading-none">&#x2715;</button>
      </td>
    </tr>`;
}

// Detail panel (accordion body) — 6 inputs + auto/manual TNCN VND + breakdown display
function commDetailPanelHtml(idx, row = {}, headerCurrency) {
  const amountFx   = row.amount_fx   != null ? row.amount_fx   : '';
  const bankFee    = row.bank_fee    != null ? row.bank_fee    : '';
  const tncnPct    = row.tncn_pct    != null ? row.tncn_pct    : DEFAULT_TNCN_PCT;
  const tncnAmount = row.tncn_amount != null ? row.tncn_amount : '';
  const netVnd     = row.net_after_tax != null ? row.net_after_tax : '';
  const isManual   = row.tncn_manual || false;

  return `
    <tr data-comm-panel="${idx}" aria-hidden="true" class="hidden">
      <td colspan="${PARENT_COLSPAN}" class="px-3 pb-2">
        <div class="comm-panel rounded border border-slate-200 bg-slate-50 p-3">
          <div class="grid grid-cols-3 gap-x-3 gap-y-2 text-xs">
            <label class="flex flex-col gap-0.5">
              <span class="text-slate-500">${t('commission.col.amount')}</span>
              <input name="comm_amount_fx" type="number" step="any"
                value="${amountFx}" placeholder="0"
                class="${INPUT_CLS} text-right" />
            </label>
            ${commFxCellsHtml(row, headerCurrency)}
            <label class="flex flex-col gap-0.5">
              <span class="text-slate-500">${t('commission.col.bank_fee')}</span>
              <input name="comm_bank_fee" type="number" step="any"
                value="${bankFee}" placeholder="0"
                class="${INPUT_CLS} text-right" />
            </label>
            <label class="flex flex-col gap-0.5">
              <span class="text-slate-500">${t('commission.col.tncn_pct')}</span>
              <input name="comm_tncn_pct" type="number" step="any" min="0" max="100"
                value="${tncnPct}"
                class="${INPUT_CLS} text-right" />
            </label>
            <label class="flex flex-col gap-0.5">
              <span class="text-slate-500">${t('commission.col.tncn_vnd')}</span>
              <input name="comm_tncn_vnd" type="number" step="any"
                value="${tncnAmount}" placeholder="0"
                ${isManual ? '' : 'readonly'}
                data-tncn-manual="${isManual}"
                class="${isManual ? INPUT_CLS : RDONLY_CLS} text-right" />
            </label>
          </div>
          <input name="comm_net_vnd" type="hidden" value="${netVnd}" />
          <div class="mt-3 pt-2 border-t border-slate-200">
            <div class="font-mono tabular-nums text-xs">
              <div class="flex justify-end items-center gap-3 py-0.5">
                <span class="text-slate-600 font-medium">${t('sales.section_c.breakdown_tong_chi')}:</span>
                <span class="w-28 text-right font-semibold text-slate-700" data-bd-gross>${EM_DASH}</span>
              </div>
              <div class="flex justify-end items-center gap-3 py-0.5 text-slate-400">
                <span>&#x2500; ${t('sales.section_c.breakdown_phi_nh')}:</span>
                <span class="w-28 text-right" data-bd-bank>${EM_DASH}</span>
              </div>
              <div class="flex justify-end items-center gap-3 py-0.5 text-slate-400">
                <span>&#x2500; ${t('sales.section_c.breakdown_tncn_nn')}:</span>
                <span class="w-28 text-right" data-bd-tncn>${EM_DASH}</span>
              </div>
              <div class="flex justify-end items-center gap-3 pt-1 border-t border-slate-300">
                <span class="text-emerald-700 font-semibold">${t('sales.section_c.breakdown_thuc_nhan')}:</span>
                <span class="w-28 text-right font-bold text-emerald-700" data-bd-net>${EM_DASH}</span>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>`;
}

// Combined parent + panel HTML for one entry (always starts collapsed)
export function commEntryHtml(idx, row = {}, headerCurrency) {
  return commParentRowHtml(idx, row) + commDetailPanelHtml(idx, row, headerCurrency);
}

export function sectionCHtml(draft = {}) {
  const headerCurrency = draft.currency || '';
  const rows = (draft.commission_lines || []).map((r, i) => commEntryHtml(i, r, headerCurrency)).join('');
  return `
    <div id="sec-c-body" class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          ${t('sales_new.section.commission')}
        </div>
        <button type="button" id="add-comm-btn"
          class="text-xs text-blue-600 hover:text-blue-700">
          ${t('commission.add_row')}
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs" id="commission-table">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-2 py-1.5 text-center text-slate-400 font-medium w-8">#</th>
              <th class="px-2 py-1.5 text-left text-slate-500 font-medium">
                ${t('commission.col.type')}</th>
              <th class="px-2 py-1.5 text-left text-slate-500 font-medium">
                ${t('sales.section_c.col_description')}</th>
              <th class="px-2 py-1.5 text-right text-slate-700 font-semibold">
                ${t('sales.section_c.col_tong_chi')}</th>
              <th class="px-2 py-1.5 text-right text-emerald-700 font-semibold">
                ${t('sales.section_c.col_thuc_nhan')}</th>
              <th class="px-2 py-1.5 w-8"></th>
              <th class="px-2 py-1.5 w-8"></th>
            </tr>
          </thead>
          <tbody id="commission-tbody">${rows}</tbody>
        </table>
      </div>
    </div>`;
}

// Pure formula helper — AC-04: exported for testability
export function computeCommission({ amountFx, fxRate, bankFee, tncnPct, tncnManual, tncnAmtManual }) {
  const grossVnd = amountFx * fxRate;
  const tncnAmt  = tncnManual
    ? tncnAmtManual
    : Math.round(grossVnd * tncnPct / 100);
  return { grossVnd, tncnAmt, netVnd: grossVnd - bankFee - tncnAmt };
}

function recomputeEntry(panelEl) {
  const idx      = panelEl.dataset.commPanel;
  const amountFx = parseFloat(panelEl.querySelector('[name=comm_amount_fx]')?.value) || 0;
  const fxRate   = parseFloat(panelEl.querySelector('[name=comm_fx_rate]')?.value)   || 1;
  const bankFee  = parseFloat(panelEl.querySelector('[name=comm_bank_fee]')?.value)  || 0;
  const tncnPct  = parseFloat(panelEl.querySelector('[name=comm_tncn_pct]')?.value)  || 0;
  const tncnEl   = panelEl.querySelector('[name=comm_tncn_vnd]');
  const isManual = tncnEl?.dataset.tncnManual === 'true';

  const { grossVnd, tncnAmt, netVnd } = computeCommission({
    amountFx, fxRate, bankFee, tncnPct,
    tncnManual: isManual, tncnAmtManual: parseFloat(tncnEl?.value) || 0,
  });

  if (!isManual && tncnEl) tncnEl.value = grossVnd ? tncnAmt : '';

  // Persist net for collectCommission
  const netHidden = panelEl.querySelector('[name=comm_net_vnd]');
  if (netHidden) netHidden.value = grossVnd ? netVnd : '';

  // Update breakdown display in detail panel
  const has  = grossVnd !== 0;
  const fmt  = (n) => n.toLocaleString('vi-VN');
  const qs   = (s) => panelEl.querySelector(s);
  if (qs('[data-bd-gross]')) qs('[data-bd-gross]').textContent = has ? fmt(grossVnd) : EM_DASH;
  if (qs('[data-bd-bank]'))  qs('[data-bd-bank]').textContent  = has ? fmt(bankFee)  : EM_DASH;
  if (qs('[data-bd-tncn]'))  qs('[data-bd-tncn]').textContent  = has ? fmt(tncnAmt)  : EM_DASH;
  if (qs('[data-bd-net]'))   qs('[data-bd-net]').textContent   = has ? fmt(netVnd)   : EM_DASH;

  // Update compact parent displays
  const tbody  = panelEl.closest('tbody');
  const parent = tbody?.querySelector(`[data-comm-row="${idx}"]`);
  if (parent?.querySelector('[data-gross-display]')) {
    parent.querySelector('[data-gross-display]').textContent = has ? fmt(grossVnd) : EM_DASH;
  }
  if (parent?.querySelector('[data-net-display]')) {
    parent.querySelector('[data-net-display]').textContent = has ? fmt(netVnd) : EM_DASH;
  }
}

function toggleEntry(tbody, idx, expand) {
  const parent   = tbody.querySelector(`[data-comm-row="${idx}"]`);
  const panelRow = tbody.querySelector(`[data-comm-panel="${idx}"]`);
  if (!parent || !panelRow) return;
  parent.setAttribute('data-expanded', String(expand));
  panelRow.classList.toggle('hidden', !expand);
  panelRow.setAttribute('aria-hidden', String(!expand));
  const btn = parent.querySelector('[data-toggle-comm]');
  if (btn) btn.style.transform = expand ? 'rotate(90deg)' : '';
}

export function wireCommissionSection(root, onChanged, fxRepo, docDate) {
  const tbody = root.querySelector('#commission-tbody');
  if (!tbody) return;

  wireCommissionFx(tbody, fxRepo, docDate);

  root.querySelector('#add-comm-btn')?.addEventListener('click', () => {
    const idx            = tbody.querySelectorAll('[data-comm-row]').length;
    const headerCurrency = root.querySelector('[name=currency]')?.value || '';
    const tmp = document.createElement('tbody');
    tmp.innerHTML = commEntryHtml(idx, {}, headerCurrency);
    while (tmp.firstElementChild) tbody.appendChild(tmp.firstElementChild);
    applyCommFxDateDefaults(tbody, docDate);   // design §3: new row defaults fx_date to doc date
    toggleEntry(tbody, idx, true);   // AC-07: auto-expand new row
    onChanged?.();
  });

  tbody.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('[data-toggle-comm]');
    if (toggleBtn) {
      const idx      = toggleBtn.dataset.toggleComm;
      const parent   = tbody.querySelector(`[data-comm-row="${idx}"]`);
      const expanded = parent?.dataset.expanded === 'true';
      toggleEntry(tbody, idx, !expanded);
      return;
    }

    const removeBtn = e.target.closest('[data-remove-comm]');
    if (removeBtn) {
      const idx = removeBtn.dataset.removeComm;
      tbody.querySelector(`[data-comm-row="${idx}"]`)?.remove();
      tbody.querySelector(`[data-comm-panel="${idx}"]`)?.remove();
      onChanged?.();
      return;
    }

    // Row click toggles — not on inputs, selects, buttons
    const parentRow = e.target.closest('[data-comm-row]');
    if (parentRow
        && !e.target.closest('input')
        && !e.target.closest('select')
        && !e.target.closest('button')) {
      const idx      = parentRow.dataset.commRow;
      const expanded = parentRow.dataset.expanded === 'true';
      toggleEntry(tbody, idx, !expanded);
    }
  });

  tbody.addEventListener('input', (e) => {
    const panel = e.target.closest('[data-comm-panel]');
    if (panel) {
      // Manual TNCN edit → set manual flag
      if (e.target.name === 'comm_tncn_vnd') {
        e.target.dataset.tncnManual = 'true';
      }
      recomputeEntry(panel);
    }
    onChanged?.();
  });

  // comm_tncn_pct change resets manual flag
  tbody.addEventListener('change', (e) => {
    if (e.target.name === 'comm_tncn_pct') {
      const panel  = e.target.closest('[data-comm-panel]');
      const tncnEl = panel?.querySelector('[name=comm_tncn_vnd]');
      if (tncnEl) {
        tncnEl.dataset.tncnManual = 'false';
        tncnEl.setAttribute('readonly', '');
        tncnEl.className = `${RDONLY_CLS} text-right`;
      }
    }
    const panel = e.target.closest('[data-comm-panel]');
    if (panel) recomputeEntry(panel);
    onChanged?.();
  });

  // Initial compute for pre-filled rows
  tbody.querySelectorAll('[data-comm-panel]').forEach(recomputeEntry);
}

export function collectCommission(root) {
  return Array.from(root.querySelectorAll('#commission-tbody [data-comm-panel]')).map((panel) => {
    const idx    = panel.dataset.commPanel;
    const tbody  = panel.closest('tbody');
    const parent = tbody?.querySelector(`[data-comm-row="${idx}"]`);
    const tncnEl = panel.querySelector('[name=comm_tncn_vnd]');
    return {
      kind:          parent?.querySelector('[name=comm_kind]')?.value              || '',
      description:   parent?.querySelector('[name=comm_desc]')?.value             || '',
      amount_fx:     parseFloat(panel.querySelector('[name=comm_amount_fx]')?.value) || 0,
      currency:      panel.querySelector('[name=comm_currency]')?.value             || '',
      fx_rate:       parseFloat(panel.querySelector('[name=comm_fx_rate]')?.value)   || 0,
      fx_date:       panel.querySelector('[name=comm_fx_date]')?.value              || '',
      bank_fee:      parseFloat(panel.querySelector('[name=comm_bank_fee]')?.value)  || 0,
      tncn_pct:      parseFloat(panel.querySelector('[name=comm_tncn_pct]')?.value)  || 0,
      tncn_amount:   parseFloat(tncnEl?.value)                                       || 0,
      net_after_tax: parseFloat(panel.querySelector('[name=comm_net_vnd]')?.value)   || 0,
      tncn_manual:   tncnEl?.dataset.tncnManual === 'true',
    };
  });
}
