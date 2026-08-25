// F-12-10 — Quotation list view (all states, role-filtered)

import { currentSalesRepId, hasRole } from '../../../ui/core_abstractions/ports/auth/session-roles.js';
import { ROLE_MANAGER } from '../../../ui/core_abstractions/roles.js';
import { listWhere } from '../../core_abstractions/ports/data/repo-query.js';
import { sendToCustomer, markAccepted, checkAlreadyConverted } from '../../core_abstractions/ports/flows/quote-orchestrator.js';
import { agGridLocaleText } from '../../../kernel/core_abstractions/i18n/ag-grid-locale.js';
import { navigate } from '../router.js';
import { t } from '../../../kernel/core_abstractions/i18n/index.js';

const STATE_COLORS = {
  Draft:    'bg-slate-100 text-slate-700',
  Sent:     'bg-blue-100 text-blue-700',
  Accepted: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
  Expired:  'bg-amber-100 text-amber-700',
};

const KIND_QUOTATIONS = 'quotations';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('vi-VN');
}

function effectiveState(q) {
  if ((q.state === 'Draft' || q.state === 'Sent') && q.valid_until_ms < Date.now()) return 'Expired';
  return q.state;
}

// ── cell renderers ────────────────────────────────────────────────────────────

function stateBadgeRenderer(params) {
  const q = params.data;
  if (!q) return document.createTextNode('—');
  const ds = effectiveState(q);
  const cls = STATE_COLORS[ds] || 'bg-slate-100 text-slate-600';
  const span = document.createElement('span');
  span.className = `inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${cls}`;
  span.textContent = t('quote.status.' + ds);
  return span;
}

function makeQuoteActionsRenderer(repo, onUpdated) {
  return function quoteActionsRenderer(params) {
    const q = params.data;
    if (!q) return document.createTextNode('—');
    const isM = hasRole(ROLE_MANAGER);
    const ds = effectiveState(q);

    const wrap = document.createElement('div');
    wrap.className = 'flex items-center gap-1 h-full';

    if (ds === 'Draft') {
      const blocked = q.pending_manager_approval && !isM;
      if (blocked) {
        const span = document.createElement('span');
        span.className = 'text-xs text-slate-400';
        span.title = t('quote_list.pending_title');
        span.textContent = t('quote_list.pending_chip');
        wrap.appendChild(span);
        return wrap;
      }
      const btn = document.createElement('button');
      btn.className = 'btn-send text-xs px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700';
      btn.textContent = t('quote_list.action.send');
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        btn.disabled = true;
        const updated = await sendToCustomer(repo, q);
        onUpdated(updated);
      });
      wrap.appendChild(btn);
      return wrap;
    }

    if (ds === 'Sent') {
      const btn = document.createElement('button');
      btn.className = 'btn-accept text-xs px-2 py-0.5 rounded bg-emerald-600 text-white hover:bg-emerald-700';
      btn.textContent = t('quote_list.action.accept');
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        btn.disabled = true;
        const updated = await markAccepted(repo, q);
        onUpdated(updated);
      });
      wrap.appendChild(btn);
      return wrap;
    }

    if (ds === 'Accepted') {
      const btn = document.createElement('button');
      btn.className = 'btn-convert text-xs px-2 py-0.5 rounded bg-purple-600 text-white hover:bg-purple-700';
      btn.textContent = t('quote_list.action.convert');
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        btn.disabled = true;
        const existing = await checkAlreadyConverted(repo, q.id);
        if (existing) {
          wrap.innerHTML = `<span class="text-xs text-slate-500">${t('quote_list.already_converted')} <a href="#/shipments" class="text-blue-600 hover:underline">${existing.shipment_ref || existing.id}</a></span>`;
        } else {
          const qs = new URLSearchParams({
            quote_id: q.id,
            customer: q.customer || '',
            pol: q.pol || '',
            pod: q.pod || '',
            container: q.container_type || '',
            sales: q.created_by || '',
          });
          navigate(`/shipments/new?${qs.toString()}`);
        }
      });
      wrap.appendChild(btn);
      return wrap;
    }

    wrap.textContent = '—';
    return wrap;
  };
}

// ── load & render ─────────────────────────────────────────────────────────────

async function loadQuotes(repo, salesId, isM) {
  const filter = isM ? null : (q) => (q.created_by || '').toLowerCase() === salesId.toLowerCase();
  return listWhere(repo, KIND_QUOTATIONS, filter).catch(() => []);
}

// ── entry point ───────────────────────────────────────────────────────────────


let _onLocale = null;

export async function render(root) {
  if (_onLocale) window.removeEventListener('vdg:locale-changed', _onLocale);
  _onLocale = () => {
    const liveRoot = document.getElementById('view-root');
    if (liveRoot) render(liveRoot);
  };
  window.addEventListener('vdg:locale-changed', _onLocale);

  const salesId = currentSalesRepId();
  const isM = hasRole(ROLE_MANAGER);
  const repo = window.__vdg_repo;
  let items = [];
  let api = null;

  root.innerHTML = `
    <div class="p-6 max-w-[1200px] mx-auto">
      <div id="grid-header"></div>
      <div id="quote-grid" class="ag-theme-quartz rounded-xl overflow-hidden border border-slate-200" style="height:520px;"></div>
      <div id="qt-loading" class="text-xs text-slate-400 mt-2">${t('common.loading')}</div>
    </div>`;

  function renderToolbar(total) {
    return `
      <div class="flex items-center justify-between mb-4">
        <div class="text-lg font-semibold text-slate-900">${t('quote_list.title')} <span class="text-sm font-normal text-slate-400">(${total})</span></div>
        <div class="flex items-center gap-2">
          <div class="relative">
            <svg class="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input id="grid-search" placeholder="${t('quote_list.toolbar.search_placeholder')}" class="text-sm pl-8 pr-3 py-1.5 border border-slate-200 rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
          </div>
          <button id="export-csv" class="text-xs px-3 py-1.5 border border-slate-200 rounded-md text-slate-700 bg-white hover:bg-slate-50">${t('quote_list.toolbar.export_csv')}</button>
          <a href="#/sales/quote/new"
             class="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition inline-block">
            ${t('quote_list.new')}
          </a>
        </div>
      </div>`;
  }

  function onQuoteUpdated(updated) {
    items = items.map((q) => (q.id === updated.id ? { ...q, ...updated } : q));
    api?.setGridOption('rowData', items);
  }

  function buildColumnDefs() {
    return [
      { headerName: t('quote_list.col.id'),          field: 'id',             width: 140, cellClass: 'font-mono text-xs' },
      { headerName: t('quote_list.col.customer'),    field: 'customer',       flex: 2, minWidth: 150, valueGetter: (p) => p.data.customer || '—' },
      { headerName: t('quote_list.col.route'),       field: 'route',          width: 140, cellClass: 'font-mono text-xs', valueGetter: (p) => `${p.data.pol || '—'} → ${p.data.pod || '—'}` },
      { headerName: t('quote_list.col.container'),   field: 'container_type', width: 110, valueGetter: (p) => p.data.container_type || '—' },
      { headerName: t('quote_list.col.state'),       field: 'state',          width: 110, cellRenderer: stateBadgeRenderer },
      { headerName: t('quote_list.col.valid_until'), field: 'valid_until_ms', width: 120, cellClass: 'font-mono text-xs', valueGetter: (p) => fmtDate(p.data.valid_until_ms) },
      { headerName: t('quote_list.col.actions'),     field: 'actions',        width: 140, sortable: false, filter: false, cellRenderer: makeQuoteActionsRenderer(repo, onQuoteUpdated) },
    ];
  }

  function wireToolbar() {
    root.querySelector('#grid-search')?.addEventListener('input', (e) => {
      api?.setGridOption('quickFilterText', e.target.value);
    });
    root.querySelector('#export-csv')?.addEventListener('click', () => {
      api?.exportDataAsCsv({ fileName: 'vdg_quotations.csv' });
    });
  }

  if (!repo) {
    root.querySelector('#qt-loading').textContent = t('quote_list.no_repo');
    return;
  }

  items = await loadQuotes(repo, salesId, isM);
  root.querySelector('#qt-loading').textContent = '';

  const headerDiv = root.querySelector('#grid-header');
  if (headerDiv) headerDiv.innerHTML = renderToolbar(items.length);

  const gridDiv = root.querySelector('#quote-grid');
  if (window.agGrid && gridDiv) {
    api = window.agGrid.createGrid(gridDiv, {
      columnDefs: buildColumnDefs(),
      rowData: items,
      defaultColDef: { sortable: true, resizable: true, filter: true },
      rowSelection: 'single',
      rowHeight: 38,
      headerHeight: 36,
      localeText: agGridLocaleText(),
    });
  }

  wireToolbar();

}

