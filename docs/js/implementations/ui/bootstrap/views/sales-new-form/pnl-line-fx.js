// pnl-line-fx.js — per-line currency + fx markup/calc/wiring for mục B cost lines (F-29-01)
// Split out of section-lines.js (already at the 350-line cap) — see design.md §4.
import { getRateForDate } from '../../../../kernel/core_abstractions/util/fx-lookup.js';

const VND_CURRENCY = 'VND';
const FX_CELL_CLS  = 'border border-slate-200 rounded px-1 py-0.5 text-xs';
const RO_CELL_CLS  = `${FX_CELL_CLS} bg-slate-50`;

// AC-01: mirrors section-header.js's CURRENCY_OPTIONS by value — not imported from there,
// since section-header.js pulls in wasm-loader.js + semantic-search.js (heavy, network-bound
// module graph) that a plain table-cell markup helper must not carry along. Keep in sync by hand.
export const LINE_CURRENCY_OPTIONS = ['USD', 'VND', 'EUR', 'SGD', 'JPY'];

// Last-ditch header currency when neither the draft nor the workspace default supplies one.
// MUST equal workspace-settings.js's DEFAULT_CURRENCY and section-header.js's own fallback:
// sectionBHtml used to pass '' here instead, so a blank form rendered one currency in the header
// against another in the line cells and called every cell a mismatch. Hand-sync rule as above.
export const DEFAULT_HEADER_CURRENCY = 'VND';

/** computeLineVnd — AC-02: vnd_amount = amount × fx_rate, book-currency passthrough */
export function computeLineVnd(amount, currency, fxRate, bookCurrency) {
  const amt = Number(amount) || 0;
  if (currency === bookCurrency) return amt;
  return amt * (Number(fxRate) || 0);
}

/** lockFxIfVnd — AC-03: currency matching the workspace's book currency locks fx_rate at 1.
 *  Named for the case that's true today (book = VND); read bookCurrency, not the name. */
export function lockFxIfVnd(currency, bookCurrency) {
  return currency === bookCurrency ? { rate: 1, locked: true } : { rate: null, locked: false };
}

/// Thin call into the Rust rule (boundary/workspace_config.rs::header_currency). The bridge is up
/// by the time a view renders; DEFAULT_HEADER_CURRENCY is the same literal Rust falls back to, so
/// a missing bridge yields the identical answer rather than a JS-side decision.
export function resolveHeaderCurrency(saved, configuredDefault) {
  const bridge = window.workspace_header_currency;
  if (typeof bridge !== 'function') return saved || configuredDefault || DEFAULT_HEADER_CURRENCY;
  return bridge(saved || '', configuredDefault || '');
}

/// bookCurrencyOf — the workspace book currency for the form `el` sits in, read off the hidden
/// `book_currency` field sales-new-form.js stamps once per render (same source everywhere, per
/// default_currency_lock.rs — no second resolution path).
export function bookCurrencyOf(el) {
  return el?.closest('form')?.querySelector('[name=book_currency]')?.value || DEFAULT_HEADER_CURRENCY;
}

// side -> FX direction (Circular 200): a 'buy' row is a cost the company owes/pays out (a
// payable-like flow), valued at the bank's SELLING rate; a 'sell' row is revenue the company
// collects (a receivable-like flow), valued at the bank's BUYING rate.
const SIDE_DIRECTION = { buy: 'Sell', sell: 'Buy' };

/** prefillFxRate — AC-04: thin wrapper over the (currency-generic) fx-rates lookup */
export async function prefillFxRate(fxRepo, currency, fxDate, side) {
  if (!fxRepo || !fxDate || !currency || currency === VND_CURRENCY) return null;
  return getRateForDate(fxRepo, fxDate, currency, SIDE_DIRECTION[side]);
}

// F-29-02: exported with optional cls so mục C's detail-panel widget can reuse the same
// select markup at full-width instead of mục B's fixed w-16 table-cell sizing.
export function currencySelectHtml(name, selected, cls = `w-16 ${FX_CELL_CLS}`) {
  const opts = LINE_CURRENCY_OPTIONS.map((c) =>
    `<option value="${c}"${c === selected ? ' selected' : ''}>${c}</option>`).join('');
  return `<select name="${name}" class="${cls}">${opts}</select>`;
}

/** fxCellsHtml — AC-01/03/04/06: currency + fx_rate + fx_date cells for one side ('buy'|'sell') */
export function fxCellsHtml(side, line = {}, headerCurrency, bookCurrency) {
  const currency        = line[`${side}_currency`] || headerCurrency || bookCurrency || VND_CURRENCY;
  const { rate, locked } = lockFxIfVnd(currency, bookCurrency);
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

function fmtVndNum(val) {
  if (val == null || val === '') return '';
  const n = Number(val);
  if (isNaN(n) || n === 0) return '';
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** vndCellHtml — AC-02: readonly derived book-currency Chi/Thu cell (replaces the old free-input cell) */
export function vndCellHtml(side, line = {}, bookCurrency) {
  const amt      = side === 'buy' ? line.buy_amt : line.sell_amt;
  const currency = line[`${side}_currency`] || bookCurrency || VND_CURRENCY;
  const fxRate   = side === 'buy' ? line.buy_fx_rate : line.sell_fx_rate;
  const vnd      = computeLineVnd(amt, currency, fxRate, bookCurrency);
  const fieldName = side === 'buy' ? 'vnd_pay' : 'vnd_collect';
  const colorCls  = side === 'buy' ? 'text-blue-700 bg-blue-50/40' : 'text-emerald-700 bg-emerald-50/40';
  return `<td class="px-1 py-1">
    <input name="${fieldName}" type="text" value="${fmtVndNum(vnd)}" placeholder="0" readonly
      class="w-28 ${RO_CELL_CLS} text-right font-semibold ${colorCls}" /></td>`;
}

/** summarizeLineCurrencies — how many lines sit in each currency, mục B rows + mục C rows.
 *  Counts ROWS, not cells: a mục B row counts once per distinct currency it actually uses, so an
 *  all-USD row is 1 × USD and a buy-USD/sell-VND row is 1 × USD + 1 × VND. Only sides carrying an
 *  amount count — a blank form has nothing to report. Replaces countCurrencyMismatches (FR-05),
 *  which compared against the header and so fired on every untouched form. */
export function summarizeLineCurrencies(lines = [], commissionLines = []) {
  const counts = new Map();
  const bump = (currency) => { if (currency) counts.set(currency, (counts.get(currency) || 0) + 1); };
  for (const l of lines) {
    const used = new Set();
    if (l.buy_amt)  used.add(l.buy_currency);
    if (l.sell_amt) used.add(l.sell_currency);
    for (const c of used) bump(c);
  }
  for (const l of commissionLines) {
    if (l.amount_fx) bump(l.currency);
  }
  return [...counts.entries()]
    .map(([currency, count]) => ({ currency, count }))
    .sort((a, b) => b.count - a.count || a.currency.localeCompare(b.currency));
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
  const vnd = computeLineVnd(amtEl?.value, curEl?.value, rateEl?.value, bookCurrencyOf(row));
  vndEl.value = fmtVndNum(vnd);
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
  // D-N1: drop the previous currency/date's rate up front on an overwrite pass — if the
  // new lookup comes back null the cell ends empty instead of retaining a stale rate
  // (foreign→foreign switch, or a date change into a no-rate day)
  if (overwrite && rateEl) rateEl.value = '';
  const fetched = await prefillFxRate(fxRepo, currencyEl.value, dateEl?.value, side);
  if (rateEl && rateEl.dataset.manuallySet !== 'true' && (fetched != null || overwrite)) {
    if (fetched != null) rateEl.value = fetched;
    _recomputeVndCell(row, side);
    row.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// currency change → lock/unlock fx_rate, pre-fill via fxRepo, recompute VND cell
async function _onCurrencyChange(row, side, fxRepo) {
  if (!row) return;
  const currencyEl = row.querySelector(`[name=${side}_currency]`);
  const rateEl     = row.querySelector(`[name=${side}_fx_rate]`);
  const { rate, locked } = lockFxIfVnd(currencyEl?.value, bookCurrencyOf(row));
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
