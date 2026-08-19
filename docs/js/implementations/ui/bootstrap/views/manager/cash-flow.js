// Manager Cash Flow & AR — F-14-05

import {
  composeAR, composeAP, composeTimeline,
  AR_CURRENT_DAYS, AR_BUCKET_31_60, AR_BUCKET_61_90,
  CREDIT_UTILIZATION_WARN_PCT, CREDIT_UTILIZATION_EXCEEDED_PCT,
} from '../../../../freight_app/operators/manager/ar-composer.js';
import { hasRole } from '../../../../freight_app/core_abstractions/session-roles.js';
import { ROLE_MANAGER } from '../../../../freight_app/core_abstractions/roles.js';
import { navigate }  from '../../router.js';
import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { agGridLocaleText } from '../../../../kernel/core_abstractions/i18n/ag-grid-locale.js';

const MAX_CREDIT_ALERTS   = 3;
const PREFS_META_KEY      = 'preferences';
const CHART_ACTUAL_COLOR  = 'rgba(59,130,246,0.7)';
const CHART_FORECAST_COLOR= 'rgba(148,163,184,0.5)';
const KIND_BILLING        = 'billing';
const KIND_CUSTOMER       = 'customers';

let _tab           = 'AR';
let _arGrid        = null;
let _apGrid        = null;
let _timelineChart = null;
let _billing       = [];
let _pnlLines      = [];
let _shipments     = [];
let _dismissedIds  = [];
let _store         = null;
let _onEntity;

function getRepo() { return window.__vdg_repo; }

function tabBtnClass(active) {
  return `px-4 py-2 text-sm font-medium rounded-tl-lg rounded-tr-lg ${active
    ? 'bg-white border border-b-0 border-slate-200 text-blue-700'
    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`;
}

function utilizationCls(pct) {
  if (pct >= CREDIT_UTILIZATION_EXCEEDED_PCT) return 'text-red-600 font-bold';
  if (pct >= CREDIT_UTILIZATION_WARN_PCT)     return 'text-amber-600 font-semibold';
  return '';
}

function arGridCols() {
  return [
    { field: 'customer',          headerName: t('cash_flow.ar.col.customer'),       flex: 1    },
    { field: 'current_vnd',       headerName: t('cash_flow.ar.col.current', { d: AR_CURRENT_DAYS }), width: 130,
      valueFormatter: ({ value }) => value ? value.toLocaleString() : '0' },
    { field: 'bucket_31_60',      headerName: t('cash_flow.ar.col.bucket_31_60', { n: AR_BUCKET_31_60 }), width: 110,
      valueFormatter: ({ value }) => value ? value.toLocaleString() : '0' },
    { field: 'bucket_61_90',      headerName: t('cash_flow.ar.col.bucket_61_90', { n: AR_BUCKET_61_90 }), width: 110,
      valueFormatter: ({ value }) => value ? value.toLocaleString() : '0' },
    { field: 'bucket_91_plus',    headerName: t('cash_flow.ar.col.bucket_91'),  width: 90,
      valueFormatter: ({ value }) => value ? value.toLocaleString() : '0' },
    { field: 'total_outstanding', headerName: t('cash_flow.ar.col.total'),      width: 120,
      valueFormatter: ({ value }) => value ? value.toLocaleString() : '0', sort: 'desc' },
    { field: 'avg_dso',           headerName: t('cash_flow.ar.col.dso'),        width: 90  },
    { field: 'credit_limit',      headerName: t('cash_flow.ar.col.credit_limit'), width: 110 },
    { field: 'utilization_pct',   headerName: t('cash_flow.ar.col.util'),       width: 80,
      cellStyle: ({ value }) => {
        if (value >= CREDIT_UTILIZATION_EXCEEDED_PCT) return { color: '#dc2626', fontWeight: 'bold' };
        if (value >= CREDIT_UTILIZATION_WARN_PCT)     return { color: '#d97706', fontWeight: '600' };
        return null;
      } },
  ];
}

function rowClassRules() {
  return {
    'border-l-2 border-red-500': (p) => p.data?.bucket_91_plus > 0,
  };
}

function mountArGrid(container, rows) {
  if (_arGrid) { try { _arGrid.destroy(); } catch { /* ignore */ } _arGrid = null; }
  container.innerHTML = '<div class="ag-theme-quartz" style="height:380px"></div>';
  if (!window.agGrid) return;
  const opts = {
    columnDefs:   arGridCols(),
    rowData:      rows,
    rowClassRules: rowClassRules(),
    defaultColDef: { sortable: true, resizable: true },
    onRowClicked:  (e) => showRowActions(container, e.data),
    localeText:    agGridLocaleText(),
  };
  const grid = new agGrid.Grid(container.querySelector('.ag-theme-quartz'), opts);
  _arGrid = grid.gridOptions?.api || opts.api;
}

function mountApGrid(container, rows) {
  if (_apGrid) { try { _apGrid.destroy(); } catch { /* ignore */ } _apGrid = null; }
  container.innerHTML = '<div class="ag-theme-quartz" style="height:380px"></div>';
  if (!window.agGrid) return;
  const opts = {
    columnDefs: [
      { field: 'carrier',           headerName: t('cash_flow.ap.col.carrier'),       flex: 1 },
      { field: 'shipment_count',    headerName: t('cash_flow.ap.col.jobs'),          width: 90 },
      { field: 'total_payable_vnd', headerName: t('cash_flow.ap.col.total_payable'), width: 130, sort: 'desc',
        valueFormatter: ({ value }) => value ? value.toLocaleString() : '0' },
      { field: 'avg_per_job',       headerName: t('cash_flow.ap.col.avg_per_job'),   width: 110 },
      { field: 'oldest_outstanding',headerName: t('cash_flow.ap.col.oldest'),        width: 110 },
    ],
    rowData: rows,
    defaultColDef: { sortable: true, resizable: true },
    localeText: agGridLocaleText(),
  };
  const grid = new agGrid.Grid(container.querySelector('.ag-theme-quartz'), opts);
  _apGrid = grid.gridOptions?.api || opts.api;
}

function showRowActions(container, row) {
  const existing = container.querySelector('.row-actions');
  if (existing) existing.remove();
  if (!row) return;

  const div = document.createElement('div');
  div.className = 'row-actions mt-2 p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap gap-2';
  div.innerHTML = `
    <button data-action="email" class="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
      ${t('cash_flow.action.send_reminder')}
    </button>
    <button data-action="followup" class="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200">
      ${t('cash_flow.action.followup')}
    </button>
    <button data-action="note" class="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200">
      ${t('cash_flow.action.add_note')}
    </button>
    <button data-action="print" class="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200">
      ${t('cash_flow.action.statement')}
    </button>`;

  div.addEventListener('click', async (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    const repo = getRepo();
    if (action === 'email') {
      const subj = encodeURIComponent(t('cash_flow.mail.subject', {
        customer: row.customer,
        amount: (row.total_outstanding || 0).toLocaleString(),
      }));
      window.location.href = `mailto:?subject=${subj}`;
    } else if (action === 'followup' && repo) {
      const bEntry = _billing.find((b) => (b.customer || b.Customer) === row.customer);
      if (bEntry) {
        await repo.put(KIND_BILLING, bEntry.id, {
          ...bEntry,
          followed_up_at: new Date().toISOString(),
          followed_up_by: window.__vdg_auth?.getCurrentUser?.()?.email || 'manager',
        });
      }
      e.target.textContent = t('cash_flow.status.marked');
    } else if (action === 'note') {
      const ta = document.createElement('textarea');
      ta.placeholder = t('cash_flow.placeholder.note');
      ta.className   = 'w-full text-xs border border-slate-200 rounded p-2 mt-2 resize-none';
      ta.rows        = 2;
      div.appendChild(ta);
      ta.focus();
      ta.addEventListener('blur', async () => {
        const note = ta.value.trim();
        if (!note || !repo) return;
        const bEntry = _billing.find((b) => (b.customer || b.Customer) === row.customer);
        if (bEntry) {
          const notes = [...(bEntry.notes || []), { text: note, at: new Date().toISOString() }];
          await repo.put(KIND_BILLING, bEntry.id, { ...bEntry, notes });
        }
        ta.remove();
      });
    } else if (action === 'print') {
      window.print();
    }
  });

  container.appendChild(div);
}

function renderTimeline(root, timeline) {
  const ctx = root.querySelector('#timeline-chart');
  if (!ctx || !window.Chart) return;
  _timelineChart?.destroy();
  _timelineChart = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels: timeline.weeks,
      datasets: [
        { label: t('cash_flow.chart.actuals'),  data: timeline.actuals,  backgroundColor: CHART_ACTUAL_COLOR },
        { label: t('cash_flow.chart.forecast'), data: timeline.forecast, backgroundColor: CHART_FORECAST_COLOR,
          borderDash: [5, 5] },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top' },
        title: { display: true, text: t('cash_flow.chart.title') } },
      scales: { x: { stacked: true }, y: { stacked: true } },
    },
  });
}

async function showCreditAlert(root, customerName, newState) {
  if (_dismissedIds.includes(customerName)) return;
  const alerts = root.querySelector('#credit-alerts');
  if (!alerts) return;
  const existing = alerts.querySelectorAll('.credit-alert');
  if (existing.length >= MAX_CREDIT_ALERTS) return;

  const div = document.createElement('div');
  div.className = 'credit-alert flex items-center justify-between bg-red-600 text-white px-4 py-2 text-xs';
  div.innerHTML = `
    <span>${t('cash_flow.alert.credit')} <strong>${customerName}</strong> → ${newState}
      <a href="#" class="ml-2 underline" data-goto-ar>${t('cash_flow.alert.view_ar')}</a>
    </span>
    <button class="ml-4 text-red-100 hover:text-white" data-dismiss>✕</button>`;

  div.querySelector('[data-dismiss]').addEventListener('click', async () => {
    _dismissedIds.push(customerName);
    div.remove();
    if (_store) {
      try {
        const prefs = (await _store.cache_get_meta(PREFS_META_KEY)) || { key: PREFS_META_KEY };
        await _store.cache_put_meta(PREFS_META_KEY, {
          ...prefs,
          dismissed_credit_alerts: _dismissedIds,
        });
      } catch { /* pref non-critical */ }
    }
  });

  alerts.appendChild(div);
}

export async function render(root) {
  if (!hasRole(ROLE_MANAGER)) { navigate('/dashboard'); return; }
  if (_onEntity) window.removeEventListener('vdg:entity-changed', _onEntity);

  try {
    _store = window.__vdg_store || null;
    const prefs = _store ? await _store.cache_get_meta(PREFS_META_KEY) : null;
    _dismissedIds = prefs?.dismissed_credit_alerts || [];
  } catch { _store = null; }

  const repo = getRepo();
  if (repo) {
    [_billing, _pnlLines, _shipments] = await Promise.all([
      repo.list(KIND_BILLING, null),
      repo.list('pnl_line', null),
      repo.list('shipment', null),
    ]);
  }

  const today   = Date.now();
  const arData  = composeAR({ billingEntities: _billing, today });
  const apData  = composeAP({ pnlLines: _pnlLines });
  const timeline= composeTimeline({ billingEntities: _billing, shipments: _shipments, today });

  root.innerHTML = `
    <div class="p-6 space-y-4 max-w-[1600px] mx-auto">
      <div id="credit-alerts" class="rounded-lg overflow-hidden"></div>

      <div class="flex gap-1">
        <button data-tab="AR" class="${tabBtnClass(_tab === 'AR')}">
          ${t('cash_flow.tab.ar')}
        </button>
        <button data-tab="AP" class="${tabBtnClass(_tab === 'AP')}">
          ${t('cash_flow.tab.ap')}
        </button>
      </div>

      <div id="tab-content" class="bg-white rounded-xl border border-slate-200 p-5">
        <div id="ar-section">
          <div id="ar-grid-container"></div>
          <div class="mt-5">
            <div class="h-52"><canvas id="timeline-chart"></canvas></div>
          </div>
        </div>
        <div id="ap-section" class="hidden">
          <div id="ap-grid-container"></div>
        </div>
      </div>
    </div>`;

  mountArGrid(root.querySelector('#ar-grid-container'), arData.rows);
  mountApGrid(root.querySelector('#ap-grid-container'), apData.rows);
  queueMicrotask(() => renderTimeline(root, timeline));

  root.addEventListener('click', async (e) => {
    const tabBtn = e.target.closest('[data-tab]');
    if (!tabBtn) return;
    _tab = tabBtn.dataset.tab;
    root.querySelectorAll('[data-tab]').forEach((b) => {
      b.className = tabBtnClass(b.dataset.tab === _tab);
    });
    root.querySelector('#ar-section').classList.toggle('hidden', _tab !== 'AR');
    root.querySelector('#ap-section').classList.toggle('hidden', _tab !== 'AP');
  });

  _onEntity = async (e) => {
    const { kind } = e.detail || {};
    if (kind !== KIND_BILLING && kind !== KIND_CUSTOMER) return;

    if (repo) _billing = await repo.list(KIND_BILLING, null);
    const fresh = composeAR({ billingEntities: _billing, today: Date.now() });
    mountArGrid(root.querySelector('#ar-grid-container'), fresh.rows);

    // Credit alert check
    if (kind === KIND_CUSTOMER || kind === KIND_BILLING) {
      const changed = _billing.find(
        (b) => ['Watch', 'Exceeded', 'Suspended'].includes(b.credit_state),
      );
      if (changed) {
        const name = changed.customer || changed.Customer || changed.id;
        await showCreditAlert(root, name, changed.credit_state);
      }
    }
  };

  window.addEventListener('vdg:entity-changed', _onEntity);
}
