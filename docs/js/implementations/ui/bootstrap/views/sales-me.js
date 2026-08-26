// F-12-09 — Sales personal workspace (daily driver)
// Identity: Google OAuth verified — no self-pick modal

import { currentSalesRepId, hasRole } from '../../../ui/core_abstractions/ports/auth/session-roles.js';
import { ROLE_MANAGER } from '../../../ui/core_abstractions/roles.js';
import { overdueFollowupsHtml, sendSalesReminder } from './sales-me-overdue.js';
import { dueSoonHtml } from './sales-me-due-soon.js';
import { t, currentLocale } from '../../../kernel/core_abstractions/i18n/index.js';
import { agGridLocaleText } from '../../../kernel/core_abstractions/i18n/ag-grid-locale.js';
import { safeAwait } from '../../../kernel/core_abstractions/util/safe-await.js';
import { statusBadgeLabel } from '../../../kernel/core_abstractions/util/status-i18n.js';
import { loadMyData } from './sales-me-data.js';
import { navigate } from '../router.js';
import { wireGridFilterEmptyState } from '../components/empty-state.js';

const LOAD_TIMEOUT_MS = 12000;
const CLOSED_LIKE_STATES = ['Closed', 'Delivered'];
const MONTH_YEAR_FMT = { month: 'long', year: 'numeric' };

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtVnd(n) {
  if (!n && n !== 0) return '—';
  return Number(n).toLocaleString('vi-VN');
}

function roleBadgeHtml(salesId) {
  const isM  = hasRole(ROLE_MANAGER);
  const cls  = isM
    ? 'bg-purple-100 text-purple-700 border-purple-200'
    : 'bg-blue-100 text-blue-700 border-blue-200';
  const label = isM ? t('sales_me.role.manager') : salesId;
  return `<span class="ml-2 px-2 py-0.5 text-[10px] font-semibold rounded border ${cls}">${label}</span>`;
}

// ── KPI cards ─────────────────────────────────────────────────────────────────

function kpiCardsHtml(stats) {
  const cards = [
    { label: t('sales_me.kpi.shipments'), value: String(stats.shipments), tone: 'blue',  icon: 'ship',   delta: t('sales_me.kpi.delta.month') },
    { label: t('sales_me.kpi.revenue'),   value: fmtVnd(stats.revenue),   tone: 'green', icon: 'dollar', delta: t('sales_me.kpi.delta.vnd') },
    { label: t('sales_me.kpi.margin'),    value: fmtVnd(stats.margin),    tone: 'green', icon: 'dollar', delta: t('sales_me.kpi.delta.vnd') },
    { label: t('sales_me.kpi.ttcn'),      value: fmtVnd(stats.customerRebate),      tone: 'amber', icon: 'dollar', delta: t('sales_me.kpi.delta.vnd') },
  ];
  return `<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    ${cards.map((c) => `
      <kpi-card label="${c.label}" value="${c.value}" delta="${c.delta}" tone="${c.tone}" icon="${c.icon}"></kpi-card>
    `).join('')}
  </div>`;
}

// ── shipment grid ─────────────────────────────────────────────────────────────

function publishBadgeHtml(s) {
  if (s.publish_state === 'draft') {
    return `<span class="ml-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-800">${t('sales_new.badge.draft')}</span>`;
  }
  return '';
}

function shipmentRowHtml(s) {
  const margin   = Number(s.margin || 0);
  const posCls   = margin >= 0 ? 'text-emerald-700' : 'text-red-600';
  const stateCls = 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700';
  const ref = s.shipment_ref || s.ref;
  const editHref   = `#/sales/edit/${encodeURIComponent(ref || '')}`;
  const budgetHref = `#/shipment/${encodeURIComponent(ref || '')}/budget`;
  return `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs">
      <td class="px-3 py-2 font-mono">
        <a href="${editHref}" class="text-blue-600 hover:underline">${ref || '—'}</a>${publishBadgeHtml(s)}
      </td>
      <td class="px-3 py-2">${s.customer || '—'}</td>
      <td class="px-3 py-2 font-mono">${s.pol || '—'} → ${s.pod || '—'}</td>
      <td class="px-3 py-2">${s.etd || '—'}</td>
      <td class="px-3 py-2"><span class="${stateCls}">${statusBadgeLabel('shipment', s.state) || '—'}</span></td>
      <td class="px-3 py-2 text-right font-semibold ${posCls}">${fmtVnd(margin)}</td>
      <td class="px-3 py-2">
        <a href="${budgetHref}" class="text-xs text-slate-500 hover:text-blue-600" title="${t('sales_me.grid.print_budget')}">⎙</a>
      </td>
    </tr>`;
}

function shipmentTableHtml(shipments, emptyMsg) {
  if (!shipments.length) {
    return `<div class="text-xs text-slate-400 py-4 text-center">${emptyMsg}</div>`;
  }
  return `
    <div class="overflow-x-auto rounded-lg border border-slate-200">
      <table class="w-full min-w-[640px]">
        <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-3 py-2 text-left">${t('sales_me.grid.ref')}</th>
            <th class="px-3 py-2 text-left">${t('sales_me.grid.customer')}</th>
            <th class="px-3 py-2 text-left">${t('sales_me.grid.route')}</th>
            <th class="px-3 py-2 text-left">${t('sales_me.grid.etd')}</th>
            <th class="px-3 py-2 text-left">${t('sales_me.grid.state')}</th>
            <th class="px-3 py-2 text-right">${t('sales_me.grid.margin_vnd')}</th>
            <th class="px-3 py-2 w-8"></th>
          </tr>
        </thead>
        <tbody>${shipments.map(shipmentRowHtml).join('')}</tbody>
      </table>
    </div>`;
}

// ── commission section ────────────────────────────────────────────────────────

function commissionHtml(stats) {
  const gross  = stats.salesCommission;
  const net    = gross - stats.advances;
  const netCls = net >= 0 ? 'text-emerald-700' : 'text-red-600';
  const now    = new Date();
  const monthStr = `(${new Intl.DateTimeFormat(currentLocale(), MONTH_YEAR_FMT).format(now)})`;
  return `
    <div class="bg-white rounded-xl border border-slate-200 p-5">
      <div class="text-sm font-semibold text-slate-900 mb-3">${t('sales_me.commission.title').replace('(MTD)', monthStr)}</div>
      <dl class="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
        <div>
          <dt class="text-slate-400">${t('sales_me.commission.margin_total')}</dt>
          <dd class="font-medium text-slate-900">${fmtVnd(stats.margin)} VND</dd>
        </div>
        <div>
          <dt class="text-slate-400">${t('sales_me.commission.sales_share')}</dt>
          <dd class="font-semibold text-emerald-700">${fmtVnd(gross)} VND</dd>
        </div>
        <div>
          <dt class="text-slate-400">${t('sales_me.commission.advances')}</dt>
          <dd class="font-medium text-slate-900">${fmtVnd(stats.advances)} VND</dd>
        </div>
        <div>
          <dt class="text-slate-400">${t('sales_me.commission.net_payable')}</dt>
          <dd class="font-semibold ${netCls}">${fmtVnd(net)} VND</dd>
        </div>
      </dl>
      <div class="mt-3 text-[10px] text-slate-400">${t('sales_me.commission.rate_note')}</div>
    </div>`;
}

// data aggregation extracted to sales-me-data.js (350-line cap)

// ── entry point ───────────────────────────────────────────────────────────────


let _onLocale = null;

export async function render(root) {
  if (_onLocale) window.removeEventListener('vdg:locale-changed', _onLocale);
  _onLocale = () => {
    const liveRoot = document.getElementById('view-root');
    if (liveRoot) render(liveRoot);
  };
  window.addEventListener('vdg:locale-changed', _onLocale);

  const user    = window.__vdg_auth?.getCurrentUser?.();
  const salesId = currentSalesRepId();

  if (!user || !salesId) {
    root.innerHTML = `<div data-auth-stale class="p-6 text-red-600 text-sm">${t('sales_me.not_authenticated')}</div>`;
    return;
  }

  root.innerHTML = `
    <div class="p-6 max-w-[1600px] mx-auto">
      <div class="text-lg font-semibold text-slate-900">
        ${t('sales_me.title')} — ${user.name || salesId}${roleBadgeHtml(salesId)}
      </div>
      <div id="me-loading" class="text-xs text-slate-500 mt-2">${t('loading')}</div>
      <div id="me-body" class="hidden"></div>
    </div>`;

  await populateView(root, salesId, user);
}

async function populateView(root, salesId, user) {
  const loadingEl = root.querySelector('#me-loading');
  const bodyEl    = root.querySelector('#me-body');

  const { ok, value: data, error } = await safeAwait(
    loadMyData(salesId),
    LOAD_TIMEOUT_MS,
    () => {},
    'sales-me:loadMyData',
  );

  if (!ok) {
    console.warn('[sales-me] load failed:', error?.message); // DEV
    if (loadingEl) {
      const msg = t('sales_me.load_failed').replace('{s}', String(LOAD_TIMEOUT_MS / 1000));
      loadingEl.innerHTML = `<span class="text-amber-700">${msg}</span>
        <button id="me-retry" class="ml-2 underline text-blue-600">${t('sales_me.retry')}</button>`;
      loadingEl.querySelector('#me-retry')?.addEventListener('click', () => populateView(root, salesId, user));
    }
    return;
  }

  const { all, pending, stats } = data;
  // F-18-11: `all` shipments already carry a resolved canonical `state` (set in loadMyData).
  const activeShipments = all.filter((s) => !CLOSED_LIKE_STATES.includes(s.state));

  const emptyActive = `${t('sales_me.empty_active')} <a href="#/shipments/new" class="text-blue-500 hover:underline">${t('sales_me.quick_add')}</a>`;

  if (bodyEl) {
    bodyEl.innerHTML = `
      <div class="mt-1 mb-4 flex items-center justify-between">
        <div class="text-xs text-slate-500">
          ${t('sales_me.signed_in_as')} <span class="font-semibold text-slate-800">${user.email}</span>
        </div>
        <a href="#/shipments/new?sales=${encodeURIComponent(salesId)}"
          class="px-4 py-2 bg-blue-600 text-white text-xs rounded-lg font-semibold hover:bg-blue-700 transition">
          ${t('sales_me.quick_add')}
        </a>
      </div>

      ${kpiCardsHtml(stats)}

      <div class="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <div class="flex items-center justify-between mb-3">
          <div class="text-sm font-semibold text-slate-900">
            ${t('sales_me.active_shipments')}
            <span class="ml-2 text-xs font-normal text-slate-400">${t('sales_me.total_suffix').replace('{n}', activeShipments.length)}</span>
          </div>
          <div class="relative">
            <svg class="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input id="active-grid-search" placeholder="${t('sales_me.toolbar.search_placeholder')}" class="text-xs pl-8 pr-3 py-1 border border-slate-200 rounded-md w-48 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
          </div>
        </div>
        <div id="active-shipments-grid" class="ag-theme-quartz rounded-lg overflow-hidden border border-slate-200" style="height:320px;"></div>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <div class="text-sm font-semibold text-slate-900 mb-3">
          ${t('sales_me.pending_revenue')}
          ${pending.length === 0 
            ? `<span class="ml-2 text-xs font-normal text-emerald-600">${t('sales_me.pending_zero')}</span>`
            : `<span class="ml-2 text-xs font-normal text-amber-600">${t('sales_me.pending_suffix').replace('{n}', pending.length)}</span>`
          }
        </div>
        ${shipmentTableHtml(pending, t('sales_me.empty_pending'))}
        ${pending.length ? `<div class="mt-2 text-[11px] text-amber-700">${t('sales_me.pending_hint')}</div>` : ''}
      </div>

      ${commissionHtml(stats)}

      ${await dueSoonHtml(salesId)}
      ${await overdueFollowupsHtml(salesId)}`;

    bodyEl.classList.remove('hidden');

    const gridDiv = root.querySelector('#active-shipments-grid');
    if (window.agGrid && gridDiv) {
      const activeGridApi = window.agGrid.createGrid(gridDiv, {
        columnDefs: [
          {
            headerName: t('sales_me.grid.ref'),
            field: 'ref',
            width: 140,
            cellClass: 'font-mono text-xs',
            cellRenderer: (p) => {
              const s = p.data;
              const ref = s.shipment_ref || s.ref;
              const wrap = document.createElement('div');
              wrap.className = 'flex items-center gap-1 h-full';
              wrap.innerHTML = `<a href="#/sales/edit/${encodeURIComponent(ref || '')}" class="text-blue-600 hover:underline font-mono">${ref || '—'}</a>${publishBadgeHtml(s)}`;
              return wrap;
            },
          },
          { headerName: t('sales_me.grid.customer'), field: 'customer', flex: 2, minWidth: 140, valueGetter: (p) => p.data.customer || '—' },
          { headerName: t('sales_me.grid.route'), field: 'route', width: 140, cellClass: 'font-mono text-xs', valueGetter: (p) => `${p.data.pol || '—'} → ${p.data.pod || '—'}` },
          { headerName: t('sales_me.grid.etd'), field: 'etd', width: 110, cellClass: 'font-mono text-xs', valueGetter: (p) => p.data.etd || '—' },
          {
            headerName: t('sales_me.grid.state'),
            field: 'state',
            width: 130,
            cellRenderer: (p) => {
              const span = document.createElement('span');
              span.className = 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700';
              span.textContent = statusBadgeLabel('shipment', p.data.state) || '—';
              return span;
            },
          },
          {
            headerName: t('sales_me.grid.margin_vnd'),
            field: 'margin',
            width: 130,
            cellClass: (p) => `font-mono text-xs font-semibold text-right ${(p.value || 0) >= 0 ? 'text-emerald-700' : 'text-red-600'}`,
            valueFormatter: (p) => fmtVnd(p.value || 0),
          },
          {
            headerName: '',
            field: 'budget',
            width: 50,
            sortable: false,
            filter: false,
            cellRenderer: (p) => {
              const ref = p.data.shipment_ref || p.data.ref;
              const a = document.createElement('a');
              a.href = `#/shipment/${encodeURIComponent(ref || '')}/budget`;
              a.className = 'text-xs text-slate-500 hover:text-blue-600';
              a.title = t('sales_me.grid.print_budget');
              a.textContent = '⎙';
              return a;
            },
          },
        ],
        rowData: activeShipments,
        defaultColDef: { sortable: true, resizable: true, filter: true },
        rowSelection: 'single',
        rowHeight: 38,
        headerHeight: 36,
        localeText: agGridLocaleText(),
      });

      wireGridFilterEmptyState({
        root,
        getApi: () => activeGridApi,
        searchSelector: '#active-grid-search',
        getTotal: () => activeShipments.length,
        entity: t('sales_me.empty.entity'),
        onCreate: () => navigate(`/shipments/new?sales=${encodeURIComponent(salesId)}`),
        filteredCreateLabel: t('sales_me.empty.create_action'),
        firstRunCreateLabel: t('sales_me.empty.first_run_action'),
      });
    }
  }

  if (loadingEl) loadingEl.textContent = '';

  root.querySelector('#me-body')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-send-reminder]');
    if (!btn) return;
    const cid    = btn.dataset.sendReminder;
    const mailto = btn.dataset.email || '';
    sendSalesReminder(cid, mailto);
  });
}
