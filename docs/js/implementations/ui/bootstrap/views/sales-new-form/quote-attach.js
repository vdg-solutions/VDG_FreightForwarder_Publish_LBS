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
  const needle = (customerName || '').toLowerCase().trim();
  return (quotes || []).filter((q) => {
    if (q.state === 'Cancelled' || q.state === 'Expired' || q.state === 'Rejected') return false;
    if (needle && (q.customer || '').toLowerCase().trim() !== needle) return false;
    if (q.valid_until_ms && q.valid_until_ms < now) return false;
    return true;
  });
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
  const bookCurrency   = root.querySelector('[name=book_currency]')?.value || '';

  let applied = 0;
  for (const q of quoteLines) {
    if (!q?.description || !(Number(q.amount) > 0)) continue;
    let row = blanks.shift();
    if (!row) {
      const idx = tbody.querySelectorAll('tr[data-line]').length;
      const tmp = document.createElement('tbody');
      tmp.innerHTML = lineRowHtml(idx, {}, headerCurrency, bookCurrency);
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
  const { repo, ownRef, onChanged } = opts;
  // One quote, one job — the same guard the convert button runs, minus this job itself.
  const existing = await checkAlreadyConverted(repo, quote.id).catch(() => null);
  if (existing && existing.shipment_ref !== ownRef) {
    _toast(t('sales_new.quote_already_converted').replace('{ref}', existing.shipment_ref || existing.id), 'error');
    return false;
  }
  const hidden = root.querySelector('[name=quote_id]');
  if (hidden) hidden.value = quote.id;

  // Auto-fill header fields from the quote
  if (quote.customer) {
    const custInput = root.querySelector('#customer-search-input');
    const custHidden = root.querySelector('input[name=customer]');
    if (custInput) custInput.value = quote.customer;
    if (custHidden) custHidden.value = quote.customer;
  }
  if (quote.pol) {
    const pol = root.querySelector('[name=pol]');
    if (pol && !pol.value) pol.value = quote.pol;
  }
  if (quote.pod) {
    const pod = root.querySelector('[name=pod]');
    if (pod && !pod.value) pod.value = quote.pod;
  }
  if (quote.carrier) {
    const carrier = root.querySelector('[name=carrier]');
    if (carrier && !carrier.value) carrier.value = quote.carrier;
  }
  if (quote.container_type) {
    const vol = root.querySelector('[name=volume]');
    if (vol && !vol.value) vol.value = quote.container_type;
  }

  applyQuoteSellRows(root, quote.lines, opts);
  // F-41: sales_rep_id is the quote's commercial owner (SalesRepDerivation's verdict) — NOT
  // created_by, which is only who happened to key the quote in and may be a different person
  // entirely (CS, or a covering rep). Fill the select when nothing picked one yet.
  const repSel = root.querySelector('select[name=sales_rep]');
  if (repSel && !repSel.value && quote.sales_rep_id
      && [...repSel.options].some((o) => o.value === quote.sales_rep_id)) {
    repSel.value = quote.sales_rep_id;
    repSel.dispatchEvent(new Event('change', { bubbles: true }));
  }
  _toast(t('sales_new.quote_attached').replace('{id}', quote.id), 'success');
  onChanged?.();
  return true;
}

/**
 * Wires the picker: options pre-load and re-filter by the current customer, a pick runs
 * the one-job-per-quote guard then attaches and auto-fills routing and sell lines.
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
      + rows.map((q) => {
        const label = q.customer ? `${quoteId(q)} — ${q.customer} (${q.pol || 'POL'} → ${q.pod || 'POD'})` : quoteId(q);
        return `<option value="${quoteId(q)}"${q.id === current ? ' selected' : ''}>${label}</option>`;
      }).join('');
  };

  refill().catch(() => {});
  picker.addEventListener('mousedown', refill);
  picker.addEventListener('focus', refill);
  root.querySelector('#customer-search-input')?.addEventListener('change', refill);
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
