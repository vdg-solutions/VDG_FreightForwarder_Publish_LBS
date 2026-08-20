// quote-attach.js — F-41-02: the JOB-SIDE door of the quote↔job link.
//
// The industry model has two doors onto one link: Sales converts a quote INTO a job (the button
// on /sales/quote), and ops attaches a quote onto a job that already exists — CS opened the file
// first, Sales closed the price later. This module is that second door, plus the thing that makes
// the link worth having: AUTO-RATING. The attached quote's lines become the job's SELL rows, so
// a price nobody retypes is a price nobody mistypes. The buy side is untouched — cost is CS's
// working data, the quote never carried it.

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { lineRowHtml, classifyKind } from './section-lines.js';
import { applyFxDateDefaults, prefillRowFx } from './pnl-line-fx.js';
import { checkAlreadyConverted } from '../../../core_abstractions/ports/flows/quote-orchestrator.js';

const KIND_QUOTATIONS = 'quotations';
const SELL_QTY_DEFAULT = 1; // a quote line prices the shipment once — qty is not quote data

/// Quotes this job may attach: Accepted, for this customer (case-insensitive, matching
/// lastAcceptedAmount's comparison), still valid. Pure — the picker and the tests share it.
export function eligibleQuotes(quotes, customerName, now = Date.now()) {
  const needle = (customerName || '').toLowerCase();
  return (quotes || []).filter((q) =>
    q.state === 'Accepted'
    && (!needle || (q.customer || '').toLowerCase() === needle)
    && (!q.valid_until_ms || q.valid_until_ms >= now));
}

/// Auto-rating: quote lines → SELL rows. Blank placeholder rows are filled first, more are
/// appended when the quote is longer. Returns how many rows landed.
export function applyQuoteSellRows(root, quoteLines, { fxRepo = null, docDate = '', onChanged = null } = {}) {
  const tbody = root.querySelector('#lines-tbody');
  if (!tbody || !quoteLines?.length) return 0;
  const isBlank = (row) => ['desc', 'buy_amt', 'sell_amt']
    .every((n) => !(row.querySelector(`[name=${n}]`)?.value));
  const blanks = Array.from(tbody.querySelectorAll('tr[data-line]')).filter(isBlank);
  const headerCurrency = root.querySelector('[name=currency]')?.value || '';

  let applied = 0;
  for (const q of quoteLines) {
    if (!q?.description || !(Number(q.amount) > 0)) continue;
    let row = blanks.shift();
    if (!row) {
      const idx = tbody.querySelectorAll('tr[data-line]').length;
      const tmp = document.createElement('tbody');
      tmp.innerHTML = lineRowHtml(idx, {}, headerCurrency);
      row = tmp.firstElementChild;
      tbody.appendChild(row);
    }
    const set = (n, v) => { const el = row.querySelector(`[name=${n}]`); if (el) el.value = v; };
    set('desc', q.description);
    set('sell_qty', SELL_QTY_DEFAULT);
    set('sell_amt', q.amount);
    set('sell_currency', q.currency || '');
    const kindSel = row.querySelector('[name=kind]');
    if (kindSel && !kindSel.value) kindSel.value = classifyKind(q.description);
    applyFxDateDefaults(row, docDate);
    Promise.all([prefillRowFx(row, 'buy', fxRepo), prefillRowFx(row, 'sell', fxRepo)])
      .then(() => onChanged?.())
      .catch(() => { /* fx prefill is a convenience — the row stands without it */ });
    applied++;
  }
  if (applied) onChanged?.();
  return applied;
}

function _toast(message, type) {
  window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { message, type } }));
}

async function _attach(root, quote, opts) {
  const { repo, ownRef } = opts;
  // One quote, one job — the same guard the convert button runs, minus this job itself.
  const existing = await checkAlreadyConverted(repo, quote.id).catch(() => null);
  if (existing && existing.shipment_ref !== ownRef) {
    _toast(t('sales_new.quote_already_converted').replace('{ref}', existing.shipment_ref || existing.id), 'error');
    return false;
  }
  const hidden = root.querySelector('[name=quote_id]');
  if (hidden) hidden.value = quote.id;
  applyQuoteSellRows(root, quote.lines, opts);
  // The quote's creator IS the rep — fill the select when nothing picked one yet.
  const repSel = root.querySelector('select[name=sales_rep]');
  if (repSel && !repSel.value && quote.created_by
      && [...repSel.options].some((o) => o.value === quote.created_by)) {
    repSel.value = quote.created_by;
    repSel.dispatchEvent(new Event('change', { bubbles: true }));
  }
  _toast(t('sales_new.quote_attached').replace('{id}', quote.id), 'success');
  return true;
}

/**
 * Wires the picker: options re-filter by the current customer each time it opens, a pick runs
 * the one-job-per-quote guard then attaches. On mount, a prefilled quote_id whose form still has
 * no lines (the convert door) auto-rates — the convert button used to carry only header fields,
 * so the price the customer accepted was retyped by hand.
 */
export function wireQuoteAttach(root, { repo, fxRepo = null, docDate = '', ownRef = null, onChanged = null } = {}) {
  const picker = root.querySelector('select[name=quote_pick]');
  if (!picker || !repo) return;
  let quotes = [];

  const quoteId = (q) => q.id;
  const refill = async () => {
    quotes = await repo.list(KIND_QUOTATIONS, null).catch(() => []);
    const customer = root.querySelector('[name=customer]')?.value || '';
    const current  = picker.value;
    const rows = eligibleQuotes(quotes, customer);
    picker.innerHTML = `<option value="">${t('sales_new.quote_pick_placeholder')}</option>`
      + rows.map((q) => `<option value="${quoteId(q)}"${q.id === current ? ' selected' : ''}>${quoteId(q)}</option>`).join('');
  };

  picker.addEventListener('mousedown', refill);
  picker.addEventListener('focus', refill);
  picker.addEventListener('change', async () => {
    const quote = quotes.find((q) => q.id === picker.value);
    if (!quote) return;
    const ok = await _attach(root, quote, { repo, fxRepo, docDate, ownRef, onChanged });
    if (!ok) picker.value = '';
  });

  // Convert-door completion: quote_id arrived via the URL, rating did not.
  const preset = root.querySelector('[name=quote_id]')?.value;
  const hasAnyLine = Array.from(root.querySelectorAll('#lines-tbody tr[data-line]'))
    .some((row) => ['desc', 'buy_amt', 'sell_amt'].some((n) => row.querySelector(`[name=${n}]`)?.value));
  if (preset && !hasAnyLine) {
    repo.get(KIND_QUOTATIONS, preset)
      .then((quote) => { if (quote) applyQuoteSellRows(root, quote.lines, { fxRepo, docDate, onChanged }); })
      .catch(() => { /* the quote may not be readable here — the form still works hand-filled */ });
  }
}
