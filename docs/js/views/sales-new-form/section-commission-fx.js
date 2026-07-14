// section-commission-fx.js — per-line currency + fx markup/wiring for mục C commission
// rows (F-29-02). Split out of section-commission.js (at the 350-line cap) — design.md §3.
import { t } from '../../i18n/index.js';
import { lockFxIfVnd, prefillFxRate, currencySelectHtml } from './pnl-line-fx.js';

const VND_CURRENCY = 'VND';
// Mirrors section-commission.js's INPUT_CLS/RDONLY_CLS — kept in sync by hand to avoid a
// circular import between the two sibling files (same tradeoff as pnl-line-fx.js:9-11's
// LINE_CURRENCY_OPTIONS mirroring section-header.js's CURRENCY_OPTIONS).
const INPUT_CLS  = 'w-full border border-slate-200 rounded px-1 py-0.5 text-xs';
const RDONLY_CLS = `${INPUT_CLS} bg-slate-50`;

/** commFxCellsHtml — AC-01/03: currency + fx_rate + fx_date fields for one commission row */
export function commFxCellsHtml(row = {}, headerCurrency) {
  const currency          = row.currency || headerCurrency || VND_CURRENCY;
  const { rate, locked }  = lockFxIfVnd(currency);
  const rateVal           = locked ? rate : (row.fx_rate ?? '');
  const rateCls           = locked ? RDONLY_CLS : INPUT_CLS;
  return `
            <label class="flex flex-col gap-0.5">
              <span class="text-slate-500">${t('commission.col.currency')}</span>
              ${currencySelectHtml('comm_currency', currency, `${INPUT_CLS} text-center uppercase`)}
            </label>
            <label class="flex flex-col gap-0.5">
              <span class="text-slate-500">${t('commission.col.fx')}</span>
              <input name="comm_fx_rate" type="number" step="any" value="${rateVal}"${locked ? ' readonly' : ''}
                class="${rateCls} text-right" />
            </label>
            <label class="flex flex-col gap-0.5">
              <span class="text-slate-500">${t('commission.col.fx_date')}</span>
              <input name="comm_fx_date" type="date" value="${row.fx_date || ''}"
                class="${INPUT_CLS}" />
            </label>`;
}

function _recompute(panel) {
  // Rides the existing tbody 'input' listener → recomputeEntry(panel) wiring
  // (section-commission.js:286-296) instead of duplicating the recompute call —
  // design.md §3 prefers the dispatch approach over a new export.
  panel?.dispatchEvent(new Event('input', { bubbles: true }));
}

/** applyCommFxDateDefaults — AC-01: blank fx_date cells default to the document date */
export function applyCommFxDateDefaults(tbody, docDate) {
  if (!tbody || !docDate) return;
  tbody.querySelectorAll('[data-comm-panel]').forEach((panel) => {
    const el = panel.querySelector('[name=comm_fx_date]');
    if (el && !el.value) el.value = docDate;
  });
}

/**
 * prefillPanelFx — F-29-10 FR-A mục-C parity: mirrors prefillRowFx (pnl-line-fx.js) for a
 * commission detail panel. overwrite=false → fill only a BLANK rate (add/mount); overwrite=true
 * → replace a stale non-manual rate (currency/fx_date change). Never clobbers a user-typed rate.
 */
export async function prefillPanelFx(panel, fxRepo, { overwrite = false } = {}) {
  if (!panel) return;
  const currencyEl = panel.querySelector('[name=comm_currency]');
  const rateEl     = panel.querySelector('[name=comm_fx_rate]');
  const dateEl     = panel.querySelector('[name=comm_fx_date]');
  if (!fxRepo || !currencyEl || currencyEl.value === VND_CURRENCY) return;
  if (rateEl?.dataset.manuallySet === 'true') return;
  if (!overwrite && rateEl?.value !== '') return;
  const fetched = await prefillFxRate(fxRepo, currencyEl.value, dateEl?.value);
  if (fetched != null && rateEl && rateEl.dataset.manuallySet !== 'true') {
    rateEl.value = fetched;
    _recompute(panel);
  }
}

// currency change → lock/unlock fx_rate, pre-fill via fxRepo, recompute via existing path
async function _onCurrencyChange(panel, fxRepo) {
  if (!panel) return;
  const currencyEl = panel.querySelector('[name=comm_currency]');
  const rateEl     = panel.querySelector('[name=comm_fx_rate]');
  const { rate, locked } = lockFxIfVnd(currencyEl?.value);
  if (rateEl) {
    rateEl.readOnly = locked;
    rateEl.classList.toggle('bg-slate-50', locked);
    if (locked) { rateEl.value = rate; delete rateEl.dataset.manuallySet; }
  }
  _recompute(panel);
  if (!locked) await prefillPanelFx(panel, fxRepo, { overwrite: true });
}

// fx_date change → re-run prefill unless the rate was manually overridden
async function _onFxDateChange(panel, fxRepo) {
  await prefillPanelFx(panel, fxRepo, { overwrite: true });
}

/** wireCommissionFx — delegated wiring for comm_currency/comm_fx_rate/comm_fx_date, mounted once per tbody */
export function wireCommissionFx(tbody, fxRepo, docDate) {
  if (!tbody) return;

  applyCommFxDateDefaults(tbody, docDate);
  // AC-02 mục-C parity: mount prefill for blank non-VND panels (persisted/typed rates preserved)
  tbody.querySelectorAll('[data-comm-panel]').forEach((panel) => prefillPanelFx(panel, fxRepo));

  tbody.addEventListener('change', (e) => {
    const panel = e.target.closest('[data-comm-panel]');
    if (!panel) return;
    if (e.target.name === 'comm_currency') { _onCurrencyChange(panel, fxRepo); return; }
    if (e.target.name === 'comm_fx_date')  { _onFxDateChange(panel, fxRepo); }
  });

  tbody.addEventListener('input', (e) => {
    if (e.target.name === 'comm_fx_rate' && e.isTrusted) {
      e.target.dataset.manuallySet = 'true';
    }
  });
}
