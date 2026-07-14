// pnl-line-fx.js — per-line currency + fx markup/calc/wiring for mục B cost lines (F-29-01)
// Split out of section-lines.js (already at the 350-line cap) — see design.md §4.
import { getRateForDate } from '../../util/fx-lookup.js';

const VND_CURRENCY = 'VND';
const FX_CELL_CLS  = 'border border-slate-200 rounded px-1 py-0.5 text-xs';
const RO_CELL_CLS  = `${FX_CELL_CLS} bg-slate-50`;

// AC-01: mirrors section-header.js's CURRENCY_OPTIONS by value — not imported from there,
// since section-header.js pulls in wasm-loader.js + semantic-search.js (heavy, network-bound
// module graph) that a plain table-cell markup helper must not carry along. Keep in sync by hand.
export const LINE_CURRENCY_OPTIONS = ['USD', 'VND', 'EUR', 'SGD', 'JPY'];

/** computeLineVnd — AC-02: vnd_amount = amount × fx_rate, VND passthrough */
export function computeLineVnd(amount, currency, fxRate) {
  const amt = Number(amount) || 0;
  if (currency === VND_CURRENCY) return amt;
  return amt * (Number(fxRate) || 0);
}

/** lockFxIfVnd — AC-03: currency VND locks fx_rate at 1 */
export function lockFxIfVnd(currency) {
  return currency === VND_CURRENCY ? { rate: 1, locked: true } : { rate: null, locked: false };
}

/** prefillFxRate — AC-04: thin wrapper over the (currency-generic) fx-rates lookup */
export async function prefillFxRate(fxRepo, currency, fxDate) {
  if (!fxRepo || !fxDate || !currency || currency === VND_CURRENCY) return null;
  return getRateForDate(fxRepo, fxDate, currency);
}

// F-29-02: exported with optional cls so mục C's detail-panel widget can reuse the same
// select markup at full-width instead of mục B's fixed w-16 table-cell sizing.
export function currencySelectHtml(name, selected, cls = `w-16 ${FX_CELL_CLS}`) {
  const opts = LINE_CURRENCY_OPTIONS.map((c) =>
    `<option value="${c}"${c === selected ? ' selected' : ''}>${c}</option>`).join('');
  return `<select name="${name}" class="${cls}">${opts}</select>`;
}

/** fxCellsHtml — AC-01/03/04/06: currency + fx_rate + fx_date cells for one side ('buy'|'sell') */
export function fxCellsHtml(side, line = {}, headerCurrency) {
  const currency        = line[`${side}_currency`] || headerCurrency || VND_CURRENCY;
  const { rate, locked } = lockFxIfVnd(currency);
  const rateVal          = locked ? rate : (line[`${side}_fx_rate`] ?? '');
  const rateCls          = locked ? RO_CELL_CLS : FX_CELL_CLS;
  return `
    <td class="px-1 py-1">${currencySelectHtml(`${side}_currency`, currency)}</td>
    <td class="px-1 py-1">
      <input name="${side}_fx_rate" type="number" step="any" value="${rateVal}"${locked ? ' readonly' : ''}
        class="w-16 ${rateCls} text-right" /></td>
    <td class="px-1 py-1">
      <input name="${side}_fx_date" type="date" value="${line[`${side}_fx_date`] || ''}"
        class="w-28 ${FX_CELL_CLS}" /></td>`;
}

/** vndCellHtml — AC-02: readonly derived VND Chi/Thu cell (replaces the old free-input cell) */
export function vndCellHtml(side, line = {}) {
  const amt      = side === 'buy' ? line.buy_amt : line.sell_amt;
  const currency = line[`${side}_currency`] || VND_CURRENCY;
  const fxRate   = side === 'buy' ? line.buy_fx_rate : line.sell_fx_rate;
  const vnd      = computeLineVnd(amt, currency, fxRate);
  const fieldName = side === 'buy' ? 'vnd_pay' : 'vnd_collect';
  const colorCls  = side === 'buy' ? 'text-blue-700' : 'text-emerald-700';
  return `<td class="px-1 py-1">
    <input name="${fieldName}" type="number" value="${vnd || ''}" placeholder="0" readonly
      class="w-28 ${RO_CELL_CLS} text-right font-medium ${colorCls}" /></td>`;
}

/** countCurrencyMismatches — FR-05: count of entered mục B/C currency values that differ from header */
export function countCurrencyMismatches(lines = [], commissionLines = [], headerCurrency) {
  if (!headerCurrency) return 0;
  let count = 0;
  for (const l of lines) {
    if (l.buy_currency && l.buy_currency !== headerCurrency) count++;
    if (l.sell_currency && l.sell_currency !== headerCurrency) count++;
  }
  for (const l of commissionLines) {
    if (l.currency && l.currency !== headerCurrency) count++;
  }
  return count;
}

/** applyFxDateDefaults — AC-06: blank fx_date cells default to the document date */
export function applyFxDateDefaults(row, docDate) {
  if (!row || !docDate) return;
  ['buy_fx_date', 'sell_fx_date'].forEach((name) => {
    const el = row.querySelector(`[name=${name}]`);
    if (el && !el.value) el.value = docDate;
  });
}

function _sideOf(name, suffix) {
  if (name === `buy${suffix}`) return 'buy';
  if (name === `sell${suffix}`) return 'sell';
  return null;
}

function _recomputeVndCell(row, side) {
  if (!row) return;
  const amtEl  = row.querySelector(`[name=${side === 'buy' ? 'buy_amt' : 'sell_amt'}]`);
  const curEl  = row.querySelector(`[name=${side}_currency]`);
  const rateEl = row.querySelector(`[name=${side}_fx_rate]`);
  const vndEl  = row.querySelector(`[name=${side === 'buy' ? 'vnd_pay' : 'vnd_collect'}]`);
  if (!vndEl) return;
  vndEl.value = computeLineVnd(amtEl?.value, curEl?.value, rateEl?.value) || '';
}

/**
 * prefillRowFx — F-29-10 FR-A: single row-level prefill for one side ('buy'|'sell'), shared
 * by the change handlers and the add/mount call sites so the lookup logic is not duplicated.
 * overwrite=false → fill only a BLANK cell (add/mount); overwrite=true → replace a stale
 * non-manual cell (currency/fx_date change). Never clobbers a user-typed rate.
 */
export async function prefillRowFx(row, side, fxRepo, { overwrite = false } = {}) {
  if (!row) return;
  const currencyEl = row.querySelector(`[name=${side}_currency]`);
  const rateEl     = row.querySelector(`[name=${side}_fx_rate]`);
  const dateEl     = row.querySelector(`[name=${side}_fx_date]`);
  if (!fxRepo || !currencyEl || currencyEl.value === VND_CURRENCY) return;
  if (rateEl?.dataset.manuallySet === 'true') return;
  if (!overwrite && rateEl?.value !== '') return;
  const fetched = await prefillFxRate(fxRepo, currencyEl.value, dateEl?.value);
  if (fetched != null && rateEl && rateEl.dataset.manuallySet !== 'true') {
    rateEl.value = fetched;
    _recomputeVndCell(row, side);
    row.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// currency change → lock/unlock fx_rate, pre-fill via fxRepo, recompute VND cell
async function _onCurrencyChange(row, side, fxRepo) {
  if (!row) return;
  const currencyEl = row.querySelector(`[name=${side}_currency]`);
  const rateEl     = row.querySelector(`[name=${side}_fx_rate]`);
  const { rate, locked } = lockFxIfVnd(currencyEl?.value);
  if (rateEl) {
    rateEl.readOnly = locked;
    rateEl.classList.toggle('bg-slate-50', locked);
    if (locked) {
      rateEl.value = rate;
      delete rateEl.dataset.manuallySet;
    } else if (rateEl.dataset.manuallySet !== 'true') {
      // unlocking (VND→foreign): drop the stale locked "1" so a missing master
      // rate leaves the cell empty, never a phantom 1:1 (D2)
      rateEl.value = '';
    }
  }
  _recomputeVndCell(row, side);
  if (!locked) await prefillRowFx(row, side, fxRepo, { overwrite: true });
}

// fx_date change → re-run prefill unless the rate was manually overridden
async function _onFxDateChange(row, side, fxRepo) {
  await prefillRowFx(row, side, fxRepo, { overwrite: true });
}

/** wireLineFx — delegated wiring for the 6 new fields, mounted once per tbody */
export function wireLineFx(tbody, fxRepo, docDate) {
  if (!tbody) return;

  Array.from(tbody.querySelectorAll('tr[data-line]')).forEach((row) => applyFxDateDefaults(row, docDate));

  tbody.addEventListener('change', (e) => {
    const currencySide = _sideOf(e.target.name, '_currency');
    if (currencySide) {
      _onCurrencyChange(e.target.closest('tr[data-line]'), currencySide, fxRepo);
      return;
    }
    const dateSide = _sideOf(e.target.name, '_fx_date');
    if (dateSide) _onFxDateChange(e.target.closest('tr[data-line]'), dateSide, fxRepo);
  });

  tbody.addEventListener('input', (e) => {
    if (e.target.name === 'buy_amt' || e.target.name === 'sell_amt') {
      _recomputeVndCell(e.target.closest('tr[data-line]'), e.target.name === 'buy_amt' ? 'buy' : 'sell');
      return;
    }
    const rateSide = _sideOf(e.target.name, '_fx_rate');
    if (rateSide) {
      if (e.isTrusted) e.target.dataset.manuallySet = 'true';
      _recomputeVndCell(e.target.closest('tr[data-line]'), rateSide);
    }
  });
}
