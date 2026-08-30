// Air Invoice (CASS) reconciliation (F-16-09, E-16)
// Route: /manager/air-invoice
//
// Real AWBs (awb_list_all, the same store awb.js reads) reconciled against the `air_rate` tariff
// they were booked at — chargeable weight, expected freight, variance and verdict are all
// air_invoice.rs's own compute; this view only renders rows and builds the CSV export.

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { emptyStateHtml, EMPTY_STATE_VARIANT } from '../../components/empty-state.js';
import { composeAirInvoice, KIND_AIR_RATE, KIND_AIRLINE_CARRIER } from '../../../core_abstractions/ports/manager/air-invoice-composer.js';

const CSV_HEADER = 'awb_no,carrier_iata,flight_no,origin_iata,dest_iata,weight_chargeable_kg,expected_freight,invoiced_amount,variance_amount,currency,verdict';

function getRepo() { return window.__vdg_repo; }

function fmtAmount(n) { return n != null ? Number(n).toLocaleString('vi-VN') : '—'; }

// AC-05: quote field iff it contains comma, double-quote, or newline (RFC 4180)
export function csvField(value) {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// AC-03/04/05/06: pure CSV builder — returns string, no DOM side effects
export function buildCassCSV(rows) {
  const lines = rows.map((r) => [
    csvField(r.awbNo),
    csvField(r.carrierIata),
    csvField(r.flightNo),
    csvField(r.originIata),
    csvField(r.destIata),
    csvField(r.weightChargeableKg),
    csvField(r.expectedFreightDisplay),
    csvField(r.invoicedAmountDisplay),
    csvField(r.varianceAmountDisplay),
    csvField(r.invoiceCurrency),
    csvField(r.verdict),
  ].join(','));
  return [CSV_HEADER, ...lines].join('\n');
}

function groupByCarrier(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.carrierIata)) map.set(r.carrierIata, { name: r.carrierName, rows: [] });
    map.get(r.carrierIata).rows.push(r);
  }
  return map;
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function verdictBadge(verdict) {
  const map = {
    matched:  ['bg-green-100 text-green-700',   t('air_invoice.verdict.matched')],
    disputed: ['bg-red-100 text-red-700',       t('air_invoice.verdict.disputed')],
    unbilled: ['bg-slate-100 text-slate-500',   t('air_invoice.verdict.unbilled')],
  };
  const [cls, label] = map[verdict] || map.unbilled;
  return `<span class="text-[10px] px-2 py-0.5 rounded border-0 font-medium ${cls}">${label}</span>`;
}

function buildInvoiceRow(r) {
  return `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs">
      <td class="px-3 py-2 font-mono">${escHtml(r.awbNo)}</td>
      <td class="px-3 py-2 font-mono">${escHtml(r.flightNo) || '—'}</td>
      <td class="px-3 py-2">${escHtml(r.originIata)} → ${escHtml(r.destIata)}</td>
      <td class="px-3 py-2 text-right">${fmtAmount(r.weightChargeableKg)} kg</td>
      <td class="px-3 py-2 text-right">${fmtAmount(r.expectedFreightDisplay)} ${escHtml(r.rateCurrency)}</td>
      <td class="px-3 py-2 text-right">${fmtAmount(r.invoicedAmountDisplay)} ${escHtml(r.invoiceCurrency)}</td>
      <td class="px-3 py-2 text-right">${r.varianceAmountDisplay != null ? fmtAmount(r.varianceAmountDisplay) : '—'}</td>
      <td class="px-3 py-2 text-center">${verdictBadge(r.verdict)}</td>
    </tr>`;
}

function buildCarrierSection(carrierIata, group) {
  const rows = group.rows.map(buildInvoiceRow).join('');
  return `
    <div class="mb-6">
      <div class="text-sm font-semibold text-slate-700 mb-2 px-1">
        ${escHtml(carrierIata)} — ${escHtml(group.name)}
        <span class="ml-2 text-xs text-slate-400">${t('air_invoice.count_invoices', { n: group.rows.length })}</span>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">${t('air_invoice.col.awb')}</th>
              <th class="px-3 py-2 text-left">${t('air_invoice.col.flight')}</th>
              <th class="px-3 py-2 text-left">${t('air_invoice.col.route')}</th>
              <th class="px-3 py-2 text-right">${t('air_invoice.col.weight')}</th>
              <th class="px-3 py-2 text-right">${t('air_invoice.col.expected')}</th>
              <th class="px-3 py-2 text-right">${t('air_invoice.col.invoiced')}</th>
              <th class="px-3 py-2 text-right">${t('air_invoice.col.variance')}</th>
              <th class="px-3 py-2 text-center">${t('air_invoice.col.verdict')}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

function summaryHtml(totals) {
  return `
    <div class="flex items-center gap-4 text-xs text-slate-500 mb-4">
      <span>${t('air_invoice.verdict.matched')}: <b class="text-green-700">${totals.matchedCount}</b></span>
      <span>${t('air_invoice.verdict.disputed')}: <b class="text-red-700">${totals.disputedCount}</b></span>
      <span>${t('air_invoice.verdict.unbilled')}: <b class="text-slate-600">${totals.unbilledCount}</b></span>
    </div>`;
}

async function loadReconciliation() {
  const repo = getRepo();
  if (!repo) return { rows: [], totals: { matchedCount: 0, disputedCount: 0, unbilledCount: 0 } };
  const [awbs, airRates, carriers] = await Promise.all([
    repo.awb_list_all(),
    repo.list(KIND_AIR_RATE, null),
    repo.list(KIND_AIRLINE_CARRIER, null),
  ]);
  return composeAirInvoice(awbs, airRates, carriers);
}

export async function render(root) {
  const { rows, totals } = await loadReconciliation();

  root.innerHTML = `
    <div class="p-6 max-w-6xl mx-auto">
      <div class="flex items-center justify-between mb-4">
        <div class="text-lg font-semibold text-slate-900">${t('air_invoice.title')}</div>
        <button id="air-invoice-export"
          class="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium">
          ${t('air_invoice.export_csv')}
        </button>
      </div>
      ${rows.length ? summaryHtml(totals) : ''}
      <div id="air-invoice-body"></div>
    </div>`;

  const body = root.querySelector('#air-invoice-body');
  if (!body) return;

  if (!rows.length) {
    body.innerHTML = emptyStateHtml({ variant: EMPTY_STATE_VARIANT.FIRST_RUN, entity: t('air_invoice.entity') });
    root.querySelector('#air-invoice-export')?.setAttribute('disabled', 'true');
    return;
  }

  const groups = groupByCarrier(rows);
  for (const [iata, group] of groups) {
    body.insertAdjacentHTML('beforeend', buildCarrierSection(iata, group));
  }

  const exportBtn = root.querySelector('#air-invoice-export');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const csv  = buildCassCSV(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'cass-invoice.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}
