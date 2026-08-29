// Manager Audit Log — F-14-12

import { t, currentLocale } from '../../../../kernel/core_abstractions/i18n/index.js';
import { mountAgGrid } from '../../../../kernel/core_abstractions/i18n/ag-grid-locale.js';
import { todayLocal } from '../../../../kernel/core_abstractions/util/today-local.js';
import { changeLines, changesCell, renderChainStatus } from './audit-changes.js';
import { emptyStateHtml, EMPTY_STATE_VARIANT, bindEmptyStateActions } from '../../components/empty-state.js';
import { relTime } from '../../../../kernel/core_abstractions/util/rel-time.js';
export { buildFeedHtml } from './audit-feed.js';

const AUDIT_LOG_L2_MAX       = 500;
const AUDIT_LOG_SCROLL_BATCH = 50;
const SCROLL_THRESHOLD_PX    = 200;
const AUDIT_LOG_KIND         = 'audit_log';

function csvHeaders() {
  return [
    t('audit.col.when'), t('audit.col.who'), t('audit.csv.entity_kind'), t('audit.csv.entity_id'),
    t('audit.col.from'), t('audit.col.to'), t('audit.col.event'), t('audit.col.changes'),
    t('audit.col.emitted'),
  ];
}

const _filter    = { kind: '', entityId: '', actor: '', event: '', dateFrom: '', dateTo: '' };
let _allRows   = [];
let _gridApi   = null;
let _onEntity;

function getRepo() { return window.__vdg_repo; }

// ── data ──────────────────────────────────────────────────────────────────────

async function loadRows(repo) {
  const records = await repo.list(AUDIT_LOG_KIND, null);
  return records
    .filter((r) => !r._deleted)
    .sort((a, b) => new Date(b.created_at || b.ts || 0) - new Date(a.created_at || a.ts || 0))
    .slice(0, AUDIT_LOG_L2_MAX);
}

function applyFilter(rows) {
  const { kind, entityId, actor, event, dateFrom, dateTo } = _filter;
  return rows.filter((r) => {
    if (kind     && (r.entity_kind || r.kind || '').toLowerCase() !== kind.toLowerCase())   return false;
    if (entityId && !(r.entity_id  || '').includes(entityId))                               return false;
    if (actor    && !(r.actor_email || r.actor || '').includes(actor))                      return false;
    if (event    && !(r.event || r.op || '').toLowerCase().includes(event.toLowerCase()))   return false;
    const ts = r.created_at || r.ts;
    if (dateFrom && ts && ts < dateFrom) return false;
    if (dateTo   && ts && ts > dateTo)   return false;
    return true;
  });
}

// ── grid ──────────────────────────────────────────────────────────────────────

function _colDefs() {
  return [
    {
      headerName: t('audit.col.when'), field: 'created_at', width: 140,
      cellRenderer: ({ value }) => {
        const span = document.createElement('span');
        span.textContent = relTime(value);
        span.title       = value || '';
        return span;
      },
    },
    { headerName: t('audit.col.who'), field: 'actor_email',  flex: 1    },
    {
      headerName: t('audit.col.entity'), width: 200,
      cellRenderer: ({ data }) => {
        const btn = document.createElement('button');
        btn.className   = 'text-blue-600 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500 text-xs';
        btn.textContent = `${data.entity_kind || data.kind || '?'} · ${data.entity_id || data.id || '?'}`;
        btn.setAttribute('aria-label', t('audit.aria.open_detail', { entity: data.entity_kind || 'entity' }));
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent('vdg:open-detail', {
            detail: { kind: data.entity_kind || data.kind, id: data.entity_id || data.id },
          }));
        });
        return btn;
      },
    },
    { headerName: t('audit.col.from'),    field: 'from_state',  width: 120 },
    { headerName: t('audit.col.to'),      field: 'to_state',    width: 120 },
    { headerName: t('audit.col.event'),   field: 'event',       width: 140 },
    // F-37-02: a hash can only say that something moved. Sell figures are NOT here — they are in
    // the rep's own fork, in the trail whose readers already hold the record it describes.
    { headerName: t('audit.col.changes'), flex: 1, cellRenderer: changesCell },
    { headerName: t('audit.col.emitted'), field: 'emitted_at',  width: 100 },
  ];
}

function initGrid(container, rows) {
  if (!window.agGrid) {
    container.innerHTML = `<div class="p-4 text-xs text-slate-400">${t('audit.grid.not_loaded')}</div>`;
    return null;
  }
  let api = null;
  const gridDiv = document.createElement('div');
  gridDiv.className = 'ag-theme-quartz';
  gridDiv.style.height = '480px';
  gridDiv.setAttribute('role', 'grid');
  container.appendChild(gridDiv);

  mountAgGrid(gridDiv, {
    columnDefs: _colDefs(),
    rowData:    rows,
    rowHeight:  34,
    onGridReady: (p) => { api = p.api; },
    onRowClicked: (ev) => {
      window.dispatchEvent(new CustomEvent('vdg:open-detail', {
        detail: { kind: ev.data.entity_kind || ev.data.kind, id: ev.data.entity_id || ev.data.id },
      }));
    },
    onBodyScroll: async (ev) => {
      const body = ev.api?.gridBodyCtrl?.eBodyViewport;
      if (!body) return;
      const near = body.scrollTop + body.clientHeight >= body.scrollHeight - SCROLL_THRESHOLD_PX;
      if (!near) return;
      const repo = getRepo();
      if (!repo || !api) return;
      const nextBatch = await repo.list(AUDIT_LOG_KIND, null).catch(() => []);
      const batch = nextBatch
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(_allRows.length, _allRows.length + AUDIT_LOG_SCROLL_BATCH);
      if (batch.length) { _allRows.push(...batch); api.applyTransaction({ add: batch }); }
    },
  });
  return api;
}

// ── CSV export ────────────────────────────────────────────────────────────────

function handleExportCsv() {
  const rows = _gridApi
    ? _gridApi.getRenderedNodes().map((n) => n.data)
    : applyFilter(_allRows);

  const lines = [
    csvHeaders().join(','),
    ...rows.map((r) => [
      `"${r.created_at || r.ts || ''}"`,
      `"${r.actor_email || r.actor || ''}"`,
      `"${r.entity_kind || r.kind || ''}"`,
      `"${r.entity_id   || r.id  || ''}"`,
      `"${r.from_state  || ''}"`,
      `"${r.to_state    || ''}"`,
      `"${r.event       || r.op || ''}"`,
      // Semicolons, not newlines: one entry stays one CSV row. Quotes are doubled because a
      // changed value can contain one and would otherwise end the field early.
      `"${changeLines(r).join('; ').replace(/"/g, '""')}"`,
      `"${r.emitted_at  || ''}"`,
    ].join(',')),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `vdg-audit-log-${todayLocal()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

// ── render ────────────────────────────────────────────────────────────────────

export async function render(root) {
  if (_onEntity) window.removeEventListener('vdg:entity-changed', _onEntity);
  _gridApi   = null;
  _allRows   = [];

  // skeleton
  root.innerHTML = `
    <div class="p-6 space-y-4 max-w-[1600px] mx-auto print-root" data-report-title="${t('audit.title')}">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="text-sm font-semibold text-slate-900">${t('audit.title')}</div>
        <button id="btn-export-csv" class="px-3 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 btn-export focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="${t('audit.export_csv')}">${t('audit.export_csv')}</button>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar flex flex-wrap gap-2 bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
        <input id="f-kind"      placeholder="${t('audit.filter.entity_kind_placeholder')}" class="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="${t('audit.filter.aria.entity_kind')}">
        <input id="f-entity-id" placeholder="${t('audit.filter.entity_id_placeholder')}"   class="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="${t('audit.filter.aria.entity_id')}">
        <input id="f-actor"     placeholder="${t('audit.filter.actor_placeholder')}"        class="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="${t('audit.filter.aria.actor')}">
        <input id="f-event"     placeholder="${t('audit.filter.event_placeholder')}"        class="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="${t('audit.filter.aria.event')}">
        <input id="f-date-from" type="date" lang="${currentLocale()}" class="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="${t('audit.filter.aria.date_from')}">
        <input id="f-date-to"   type="date" lang="${currentLocale()}" class="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="${t('audit.filter.aria.date_to')}">
      </div>

      <!-- F-37-02: whether the trail can still be trusted. Everyone who writes a shipment can
           write this folder, so an intact chain is a claim worth making explicitly. -->
      <div id="chain-status" class="text-xs text-slate-400"></div>

      <!-- Grid skeleton -->
      <div id="grid-wrap">
        <div class="h-12 bg-slate-200 animate-pulse rounded-t-lg"></div>
        <div class="h-64 bg-slate-100 animate-pulse rounded-b-lg"></div>
      </div>
    </div>`;

  // error boundary
  const _onWasmError = (e) => {
    console.error('[audit] wasm-error:', e.detail); // DEV
    root.querySelector('#grid-wrap').innerHTML = `
      <div class="flex flex-col items-center gap-3 py-12 text-slate-400">
        <div class="text-sm">${t('audit.error.generic')}</div>
        <button class="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700" onclick="location.reload()">${t('retry')}</button>
      </div>`;
  };
  const _onUnhandled = (e) => { console.error('[audit] unhandledrejection:', e.reason); _onWasmError(e); }; // DEV
  window.addEventListener('vdg:wasm-error',     _onWasmError);
  window.addEventListener('unhandledrejection', _onUnhandled);

  const repo = getRepo();
  if (repo) {
    try { _allRows = await loadRows(repo); }
    catch (err) { console.error('[audit] load failed:', err); } // DEV
  }

  renderChainStatus(root.querySelector('#chain-status'), _allRows);

  const gridWrap = root.querySelector('#grid-wrap');
  gridWrap.innerHTML = '';
  _gridApi = initGrid(gridWrap, _allRows);

  // Two empty sub-states an audit log tells apart from a `kind`/entity/date filter: no log
  // entries exist yet at all (FIRST_RUN, no create action — entries are system-written, never
  // user-created) vs the filter above matches none of the entries that do exist (FILTERED).
  function refreshEmptyState() {
    if (!_gridApi) return;
    const total     = _allRows.length;
    const displayed = applyFilter(_allRows).length;
    const variant   = total === 0 ? EMPTY_STATE_VARIANT.FIRST_RUN : EMPTY_STATE_VARIANT.FILTERED;
    _gridApi.setGridOption('overlayNoRowsTemplate', emptyStateHtml({ variant, entity: t('audit.empty.entity') }));
    if (displayed === 0) _gridApi.showNoRowsOverlay(); else _gridApi.hideOverlay();
  }
  refreshEmptyState();

  // Filter inputs
  const FILTER_INPUT_IDS = ['f-kind', 'f-entity-id', 'f-actor', 'f-event', 'f-date-from', 'f-date-to'];
  const bindFilter = (id, key) => {
    root.querySelector(`#${id}`)?.addEventListener('input', (e) => {
      _filter[key] = e.target.value.trim();
      if (_gridApi) _gridApi.setRowData(applyFilter(_allRows));
      refreshEmptyState();
    });
  };
  bindFilter('f-kind',      'kind');
  bindFilter('f-entity-id', 'entityId');
  bindFilter('f-actor',     'actor');
  bindFilter('f-event',     'event');
  bindFilter('f-date-from', 'dateFrom');
  bindFilter('f-date-to',   'dateTo');

  bindEmptyStateActions(root, {
    onClearFilter: () => {
      Object.keys(_filter).forEach((k) => { _filter[k] = ''; });
      FILTER_INPUT_IDS.forEach((id) => {
        const el = root.querySelector(`#${id}`);
        if (el) el.value = '';
      });
      if (_gridApi) _gridApi.setRowData(_allRows);
      refreshEmptyState();
    },
  });

  root.querySelector('#btn-export-csv')?.addEventListener('click', handleExportCsv);

  // Live feed updates
  _onEntity = (e) => {
    const { kind } = e.detail || {};
    if (kind !== AUDIT_LOG_KIND) return;
    if (repo) {
      repo.list(AUDIT_LOG_KIND, null).then((records) => {
        const latest = records
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
          .slice(0, 1);
        if (latest.length && _gridApi) {
          _allRows.unshift(...latest);
          while (_allRows.length > AUDIT_LOG_L2_MAX) _allRows.pop();
          _gridApi.applyTransaction({ add: latest, addIndex: 0 });
        }
      }).catch(() => {});
    }
  };
  window.addEventListener('vdg:entity-changed', _onEntity);

  // cleanup on next render
  root._auditCleanup = () => {
    window.removeEventListener('vdg:entity-changed', _onEntity);
    window.removeEventListener('vdg:wasm-error',     _onWasmError);
    window.removeEventListener('unhandledrejection', _onUnhandled);
  };
}
