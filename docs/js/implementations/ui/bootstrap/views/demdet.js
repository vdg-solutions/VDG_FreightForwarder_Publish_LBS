// F-06-07 — DEM/DET Alert Dashboard
// Route: /finance/demdet
//
// Every derivation (free-time remaining, days/amount accrued, the four KPI totals, the urgency
// tiers) is computed in wasm (operators/manager/demdet.rs) — this view only renders what it
// returns.

import { t, fmtDate, fmtNumber } from '../../../kernel/core_abstractions/i18n/index.js';
import { emptyStateHtml, EMPTY_STATE_VARIANT } from '../components/empty-state.js';
import { composeOverview } from '../../core_abstractions/ports/manager/demdet-composer.js';
import { listDemdetInstances } from '../../core_abstractions/ports/data/sales-reads.js';

const STATE_LABEL_KEYS = {
  NotStarted:       'demdet.state.not_started',
  FreeTimeRunning:  'demdet.state.free_time_running',
  FreeTimeExpiring: 'demdet.state.free_time_expiring',
  FreeTimeExpired:  'demdet.state.free_time_expired',
  AccruingCharges:  'demdet.state.accruing_charges',
  WaiverRequested:  'demdet.state.waiver_requested',
  WaiverGranted:    'demdet.state.waiver_granted',
  WaiverRejected:   'demdet.state.waiver_rejected',
  InvoiceReceived:  'demdet.state.invoice_received',
  Disputed:         'demdet.state.disputed',
  Settled:          'demdet.state.settled',
  Waived:           'demdet.state.waived',
};

const URGENCY_BADGE_CLS = {
  ok:      'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  over:    'bg-red-100 text-red-700',
  done:    'bg-slate-100 text-slate-500',
};

function getRepo() { return window.__vdg_repo; }

function stateLabel(state) {
  return t(STATE_LABEL_KEYS[state] ?? 'demdet.state.not_started');
}

function vnd(amount) {
  return `${fmtNumber(amount)} ₫`;
}

function kpiCard(labelKey, value, colorCls) {
  return `
    <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div class="text-sm font-semibold text-slate-500 mb-1">${t(labelKey)}</div>
      <div class="text-3xl font-bold ${colorCls}">${value}</div>
    </div>`;
}

function buildRow(row) {
  const badgeCls = URGENCY_BADGE_CLS[row.urgency] ?? URGENCY_BADGE_CLS.ok;
  const freeTimeEnds = row.expiryMs ? fmtDate(new Date(row.expiryMs)) : '—';
  return `
    <tr class="hover:bg-slate-50">
      <td class="py-3 px-4 font-mono">${row.containerNo || '—'}</td>
      <td class="py-3 px-4">${row.shipmentId || '—'}</td>
      <td class="py-3 px-4 font-mono text-xs">${row.legType}</td>
      <td class="py-3 px-4">${freeTimeEnds}</td>
      <td class="py-3 px-4">
        <span class="px-2 py-0.5 rounded text-xs font-medium ${badgeCls}">${stateLabel(row.state)}</span>
      </td>
      <td class="py-3 px-4 text-right font-mono">${vnd(row.accruedBaseDisplay)}</td>
    </tr>`;
}

function buildTableBody(rows) {
  if (!rows.length) {
    return `<tr><td colspan="6" class="p-0">${emptyStateHtml({ variant: EMPTY_STATE_VARIANT.FIRST_RUN, entity: t('demdet.entity') })}</td></tr>`;
  }
  return rows.map(buildRow).join('');
}

async function loadOverview() {
  const repo = getRepo();
  if (!repo) return { rows: [], kpis: { activeContainers: 0, overFreeTime: 0, expiringSoon: 0, totalExposureBaseDisplay: 0 } };
  const instances = await listDemdetInstances().catch(() => []);
  return composeOverview(instances);
}

export async function render(root) {
  const { rows, kpis } = await loadOverview();

  root.innerHTML = `
    <div class="p-6 max-w-[1600px] mx-auto">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">${t('demdet.title')}</h1>
          <p class="text-slate-500 text-sm mt-1">${t('demdet.subtitle')}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        ${kpiCard('demdet.card.active_containers', kpis.activeContainers, 'text-slate-800')}
        ${kpiCard('demdet.card.over_free_time', kpis.overFreeTime, 'text-red-600')}
        ${kpiCard('demdet.card.expiring_48h', kpis.expiringSoon, 'text-amber-500')}
        ${kpiCard('demdet.card.total_exposure', vnd(kpis.totalExposureBaseDisplay), 'text-slate-800')}
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
              <th class="py-3 px-4 font-semibold">${t('demdet.col.container_no')}</th>
              <th class="py-3 px-4 font-semibold">${t('demdet.col.shipment')}</th>
              <th class="py-3 px-4 font-semibold">${t('demdet.col.type')}</th>
              <th class="py-3 px-4 font-semibold">${t('demdet.col.free_time_ends')}</th>
              <th class="py-3 px-4 font-semibold">${t('demdet.col.status')}</th>
              <th class="py-3 px-4 font-semibold text-right">${t('demdet.col.exposure')}</th>
            </tr>
          </thead>
          <tbody class="text-sm divide-y divide-slate-100">${buildTableBody(rows)}</tbody>
        </table>
      </div>
    </div>
  `;
}
