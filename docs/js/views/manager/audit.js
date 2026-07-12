// Manager Audit Log — F-14-12

import { isManager } from '../../auth/auth-gate.js';
import { navigate }  from '../../router.js';

const AUDIT_LOG_L2_MAX       = 500;
const AUDIT_LOG_SCROLL_BATCH = 50;
const ACTIVITY_FEED_MAX      = 20;
const SCROLL_THRESHOLD_PX    = 200;
const AUDIT_LOG_KIND         = 'audit_log';
const CSV_HEADERS            = ['When', 'Who', 'Entity Kind', 'Entity ID', 'From', 'To', 'Event', 'Emitted'];

const EMPTY_STATE_COPY = { audit: { heading: 'No log entries', cta: null } };

const _filter    = { kind: '', entityId: '', actor: '', event: '', dateFrom: '', dateTo: '' };
let _allRows   = [];
let _gridApi   = null;
let _onEntity;

function getRepo() { return window.__vdg_repo; }

// ── relative time ─────────────────────────────────────────────────────────────

const _rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function relTime(iso) {
  if (!iso) return '—';
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  if (Math.abs(diff) < 60)   return _rtf.format(Math.round(diff), 'second');
  if (Math.abs(diff) < 3600) return _rtf.format(Math.round(diff / 60), 'minute');
  if (Math.abs(diff) < 86400) return _rtf.format(Math.round(diff / 3600), 'hour');
  return _rtf.format(Math.round(diff / 86400), 'day');
}

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
      headerName: 'When', field: 'created_at', width: 140,
      cellRenderer: ({ value }) => {
        const span = document.createElement('span');
        span.textContent = relTime(value);
        span.title       = value || '';
        return span;
      },
    },
    { headerName: 'Who',         field: 'actor_email',  flex: 1    },
    {
      headerName: 'Entity', width: 200,
      cellRenderer: ({ data }) => {
        const btn = document.createElement('button');
        btn.className   = 'text-blue-600 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500 text-xs';
        btn.textContent = `${data.entity_kind || data.kind || '?'} · ${data.entity_id || data.id || '?'}`;
        btn.setAttribute('aria-label', `Open ${data.entity_kind || 'entity'} detail`);
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent('vdg:open-detail', {
            detail: { kind: data.entity_kind || data.kind, id: data.entity_id || data.id },
          }));
        });
        return btn;
      },
    },
    { headerName: 'From',    field: 'from_state',  width: 120 },
    { headerName: 'To',      field: 'to_state',    width: 120 },
    { headerName: 'Event',   field: 'event',       width: 140 },
    { headerName: 'Emitted', field: 'emitted_at',  width: 100 },
  ];
}

function initGrid(container, rows) {
  if (!window.agGrid) {
    container.innerHTML = `<div class="p-4 text-xs text-slate-400">AG Grid not loaded</div>`;
    return null;
  }
  let api = null;
  const gridDiv = document.createElement('div');
  gridDiv.className = 'ag-theme-quartz';
  gridDiv.style.height = '480px';
  gridDiv.setAttribute('role', 'grid');
  container.appendChild(gridDiv);

  new agGrid.Grid(gridDiv, {
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

// ── activity feed ─────────────────────────────────────────────────────────────

/**
 * Exported helper — builds feed HTML from entries; imported by dashboard.js.
 * @param {object[]} entries
 * @returns {string}
 */
export function buildFeedHtml(entries) {
  if (!entries.length) return '<li class="py-2 text-xs text-slate-400">No recent activity</li>';

  // group by entity
  const groups = new Map();
  for (const e of entries) {
    const key = `${e.entity_kind || e.kind}::${e.entity_id || e.id}`;
    (groups.get(key) || (() => { const a = []; groups.set(key, a); return a; })()).push(e);
  }

  const items = [...groups.values()].slice(0, ACTIVITY_FEED_MAX);
  return items.map((group) => {
    const first = group[0];
    const label = `${first.entity_kind || first.kind || '?'} ${first.entity_id || first.id || '?'}`;
    if (group.length === 1) {
      return `<li class="py-1.5 text-xs text-slate-600 border-b border-slate-50">
        ${relTime(first.created_at || first.ts)} — ${label} · ${first.event || first.op || '?'}
      </li>`;
    }
    return `<li class="py-1.5 text-xs border-b border-slate-50">
      <details>
        <summary class="cursor-pointer text-slate-600">${relTime(first.created_at || first.ts)} — ${label} · ${first.event || first.op || '?'}</summary>
        <ul class="pl-4 mt-1 space-y-0.5">
          ${group.slice(1).map((e) => `<li class="text-slate-500">${relTime(e.created_at || e.ts)} — ${e.event || e.op || '?'}</li>`).join('')}
          <li class="text-blue-500 text-[11px] cursor-pointer">Show ${group.length - 1} more</li>
        </ul>
      </details>
    </li>`;
  }).join('');
}

// ── CSV export ────────────────────────────────────────────────────────────────

function handleExportCsv() {
  const rows = _gridApi
    ? _gridApi.getRenderedNodes().map((n) => n.data)
    : applyFilter(_allRows);

  const lines = [
    CSV_HEADERS.join(','),
    ...rows.map((r) => [
      `"${r.created_at || r.ts || ''}"`,
      `"${r.actor_email || r.actor || ''}"`,
      `"${r.entity_kind || r.kind || ''}"`,
      `"${r.entity_id   || r.id  || ''}"`,
      `"${r.from_state  || ''}"`,
      `"${r.to_state    || ''}"`,
      `"${r.event       || r.op || ''}"`,
      `"${r.emitted_at  || ''}"`,
    ].join(',')),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `vdg-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

// ── render ────────────────────────────────────────────────────────────────────

export async function render(root) {
  if (!isManager()) { navigate('/dashboard'); return; }

  if (_onEntity) window.removeEventListener('vdg:entity-changed', _onEntity);
  _gridApi   = null;
  _allRows   = [];

  // skeleton
  root.innerHTML = `
    <div class="p-6 space-y-4 max-w-[1600px] mx-auto print-root" data-report-title="Audit Log">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="text-sm font-semibold text-slate-900">Audit Log</div>
        <button id="btn-export-csv" class="px-3 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 btn-export focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Export CSV">Export CSV</button>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar flex flex-wrap gap-2 bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
        <input id="f-kind"      placeholder="Entity Kind" class="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Filter by entity kind">
        <input id="f-entity-id" placeholder="Entity ID"   class="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Filter by entity ID">
        <input id="f-actor"     placeholder="Actor"        class="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Filter by actor">
        <input id="f-event"     placeholder="Event"        class="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Filter by event">
        <input id="f-date-from" type="date" class="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Filter from date">
        <input id="f-date-to"   type="date" class="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Filter to date">
      </div>

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
        <div class="text-sm">Something went wrong</div>
        <button class="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700" onclick="location.reload()">Retry</button>
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

  const gridWrap = root.querySelector('#grid-wrap');
  gridWrap.innerHTML = '';

  if (!_allRows.length) {
    gridWrap.innerHTML = `
      <div class="flex flex-col items-center gap-2 py-16 text-slate-400">
        <svg class="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <div class="text-sm font-medium">${EMPTY_STATE_COPY.audit.heading}</div>
      </div>`;
  } else {
    _gridApi = initGrid(gridWrap, _allRows);
  }

  // Filter inputs
  const bindFilter = (id, key) => {
    root.querySelector(`#${id}`)?.addEventListener('input', (e) => {
      _filter[key] = e.target.value.trim();
      if (_gridApi) _gridApi.setRowData(applyFilter(_allRows));
    });
  };
  bindFilter('f-kind',      'kind');
  bindFilter('f-entity-id', 'entityId');
  bindFilter('f-actor',     'actor');
  bindFilter('f-event',     'event');
  bindFilter('f-date-from', 'dateFrom');
  bindFilter('f-date-to',   'dateTo');

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
