// Manager Pipeline — F-14-02

import '../../components/kanban-board.js';
import { VALID_NEXT } from '../../components/kanban-board.js';
import { isManager } from '../../auth/auth-gate.js';
import { navigate }  from '../../router.js';
import { idbGet, idbPut } from '../../cache/idb-cache.js';
import { readMode, DEFAULT_MODE } from '../../components/topbar-mode-toggle.js';

const SEA_KANBAN_STATES = ['Created','BookingConfirmed','InTransit','Arrived','Delivered','Closed'];
const AIR_KANBAN_STATES = ['Created','Tendered','Accepted','Manifested','FlightDeparted','FlightArrived','Cleared','PoD'];
const ALL_KANBAN_STATES = [...SEA_KANBAN_STATES,'Tendered','Accepted','Manifested','FlightDeparted','FlightArrived','Cleared','PoD'];

const PIPELINE_GRID_COLS = [
  { field: 'shipment_ref', headerName: 'Ref',       width: 130 },
  { field: 'customer',     headerName: 'Customer',   flex: 1    },
  { field: 'lane',         headerName: 'Lane',       width: 140 },
  { field: 'state',        headerName: 'State',      width: 140 },
  { field: 'etd',          headerName: 'ETD',        width: 110 },
  { field: 'eta',          headerName: 'ETA',        width: 110 },
  { field: 'margin_pct',   headerName: 'Margin %',   width: 100 },
  { field: 'sales_rep',    headerName: 'Sales Rep',  width: 110 },
];
const PIPELINE_VIEW_KEY   = 'pipeline_view_mode';
const PREFS_META_KEY      = 'preferences';
const FILTER_CHIPS_CONFIG = ['Sales', 'Customer', 'Carrier', 'Lane', 'State'];

let _viewMode    = 'board';
let _filter      = {};
let _mode        = DEFAULT_MODE;
let _selectedIds = new Set();
let _shipments   = [];
let _gridApi     = null;
let _kanban      = null;
let _onEntity;
let _onFilter;
let _onModeChange;

// Returns column set matching current mode
export function getColumns(mode) {
  if (mode === 'Air') return AIR_KANBAN_STATES;
  if (mode === 'Sea') return SEA_KANBAN_STATES;
  return ALL_KANBAN_STATES;
}

// Mode filter for pipeline shipments
export function applyPipelineModeFilter(shipments, mode) {
  if (!mode || mode === 'All') return shipments;
  if (mode === 'Air') return shipments.filter((s) => s.mode === 'air');
  return shipments.filter((s) => s.mode !== 'air');
}

function getRepo() { return window.__vdg_repo; }

async function loadShipments() {
  const repo = getRepo();
  if (!repo) return [];
  return repo.list('shipment', null);
}

function applyFilter(list, filter) {
  return list.filter((s) => {
    if (filter.sales  && (s.sales_rep || s.SalesRep) !== filter.sales)  return false;
    if (filter.state  && (s.state     || s.State)     !== filter.state)  return false;
    if (filter.lane) {
      const lane = `${s.pol || s.POL || ''}→${s.pod || s.POD || ''}`;
      if (lane !== filter.lane) return false;
    }
    return true;
  });
}

function enrichShipments(list) {
  return list.map((s) => ({
    ...s,
    lane: `${s.pol || s.POL || '?'}→${s.pod || s.POD || '?'}`,
  }));
}

function mountGrid(container, filtered) {
  if (_gridApi) { try { _gridApi.destroy(); } catch { /* ignore */ } _gridApi = null; }
  const rowData = filtered.map((s) => ({
    ...s,
    shipment_ref: s.shipment_ref || s.ShipmentRef || s.id,
    customer:     s.customer     || s.Customer     || '—',
    lane:         `${s.pol || s.POL || '?'}→${s.pod || s.POD || '?'}`,
    state:        s.state        || s.State        || '—',
    sales_rep:    s.sales_rep    || s.SalesRep     || '—',
  }));

  container.innerHTML = '<div class="ag-theme-quartz" style="height:500px"></div>';
  const div = container.querySelector('.ag-theme-quartz');
  if (!window.agGrid) return;

  const opts = {
    columnDefs:        PIPELINE_GRID_COLS,
    rowData,
    rowSelection:      'multiple',
    suppressRowClickSelection: true,
    onSelectionChanged: () => {
      const rows = _gridApi?.getSelectedRows() || [];
      _selectedIds = new Set(rows.map((r) => r.id));
      updateBulkToolbar(container.closest('[data-mgr-pipeline]'));
    },
    onRowClicked: (e) => {
      window.dispatchEvent(new CustomEvent('vdg:open-detail', {
        detail: { kind: 'shipment', id: e.data.id },
      }));
    },
  };
  const grid = new agGrid.Grid(div, opts);
  _gridApi = grid.gridOptions?.api || opts.api;
}

function updateBulkToolbar(root) {
  if (!root) return;
  const bar = root.querySelector('#bulk-toolbar');
  if (!bar) return;
  const n = _selectedIds.size;
  bar.classList.toggle('translate-y-full', n === 0);
  root.querySelector('#bulk-count').textContent = `${n} selected`;

  const states = [..._selectedIds].map((id) => {
    const s = _shipments.find((x) => x.id === id);
    return s?.state || s?.State || '';
  });
  const validTargets = states.length > 0
    ? (VALID_NEXT[states[0]] || []).filter((t) => states.every((st) => (VALID_NEXT[st] || []).includes(t)))
    : [];

  const select = root.querySelector('#bulk-transition-select');
  if (select) {
    select.innerHTML = `<option value="">Transition to…</option>${validTargets.map((t) => `<option>${t}</option>`).join('')}`;
  }
}

async function saveViewMode(db, mode) {
  if (!db) return;
  try {
    const prefs = (await idbGet(db, 'meta', PREFS_META_KEY)) || { key: PREFS_META_KEY };
    await idbPut(db, 'meta', { ...prefs, [PIPELINE_VIEW_KEY]: mode });
  } catch { /* pref — non-critical */ }
}

export async function render(root) {
  if (!isManager()) { navigate('/dashboard'); return; }

  if (_onEntity)     window.removeEventListener('vdg:entity-changed', _onEntity);
  if (_onFilter)     window.removeEventListener('vdg:filter-changed', _onFilter);
  if (_onModeChange) window.removeEventListener('vdg:mode-change',    _onModeChange);

  _mode = readMode();

  let db = null;
  try {
    const { openVdgDb } = await import('../../cache/idb-cache.js');
    db = await openVdgDb();
    const prefs = await idbGet(db, 'meta', PREFS_META_KEY);
    if (prefs?.[PIPELINE_VIEW_KEY]) _viewMode = prefs[PIPELINE_VIEW_KEY];
  } catch { /* IDB optional */ }

  _shipments = enrichShipments(await loadShipments());
  root.setAttribute('data-mgr-pipeline', '1');

  const chipHtml = FILTER_CHIPS_CONFIG.map((f) =>
    `<button data-chip="${f.toLowerCase()}"
      class="px-3 py-1 rounded-full text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
    >${f}</button>`).join('');

  root.innerHTML = `
    <div class="p-6 space-y-4 max-w-[1600px] mx-auto" data-mgr-pipeline="1">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex gap-2 flex-wrap">${chipHtml}</div>
        <button id="view-toggle"
          class="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
          ${_viewMode === 'board' ? 'List view' : 'Board view'}
        </button>
      </div>

      <div id="pipeline-content"></div>

      <!-- Bulk toolbar -->
      <div id="bulk-toolbar"
        class="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 text-white flex items-center gap-4 px-6 py-3
               transition-transform translate-y-full">
        <span id="bulk-count" class="text-sm font-medium"></span>
        <select id="bulk-transition-select"
          class="text-xs bg-slate-700 text-white border border-slate-600 rounded px-2 py-1">
          <option value="">Transition to…</option>
        </select>
        <button id="bulk-export" class="px-3 py-1.5 text-xs bg-blue-600 rounded hover:bg-blue-700">
          Export CSV
        </button>
        <button id="bulk-clear"
          class="ml-auto px-2 py-1.5 text-xs text-slate-400 hover:text-white">✕ Clear</button>
      </div>
    </div>`;

  const content = root.querySelector('#pipeline-content');

  function mountView() {
    const modeFiltered = applyPipelineModeFilter(_shipments, _mode);
    const filtered     = applyFilter(modeFiltered, _filter);
    if (_viewMode === 'board') {
      if (!content.querySelector('vdg-kanban-board')) {
        content.innerHTML = '<vdg-kanban-board></vdg-kanban-board>';
      }
      _kanban = content.querySelector('vdg-kanban-board');
      _kanban.shipments = filtered;
      _kanban.filter    = _filter;
      _kanban.columns   = getColumns(_mode);
      _kanban.mode      = _mode;
    } else {
      mountGrid(content, filtered);
    }
  }

  mountView();

  // Card click → detail panel
  content.addEventListener('vdg:card-click', (e) => {
    window.dispatchEvent(new CustomEvent('vdg:open-detail', {
      detail: { kind: 'shipment', id: e.detail.id },
    }));
  });

  // Transition request → optimistic write
  content.addEventListener('vdg:transition-request', async (e) => {
    const { id, to } = e.detail;
    const s = _shipments.find((x) => x.id === id);
    if (!s) return;
    const repo = getRepo();
    if (repo) {
      try { await repo.put('shipment', id, { ...s, state: to }); }
      catch (err) { console.warn('[pipeline] transition write failed:', err.message); } // DEV
    }
    _kanban?.confirmPending(id);
  });

  root.querySelector('#view-toggle').addEventListener('click', async () => {
    _viewMode = _viewMode === 'board' ? 'list' : 'board';
    root.querySelector('#view-toggle').textContent = _viewMode === 'board' ? 'List view' : 'Board view';
    mountView();
    await saveViewMode(db, _viewMode);
  });

  root.querySelector('#bulk-clear').addEventListener('click', () => {
    _selectedIds.clear();
    updateBulkToolbar(root);
    _gridApi?.deselectAll?.();
  });

  root.querySelector('#bulk-export')?.addEventListener('click', () => {
    const selected = _shipments.filter((s) => _selectedIds.has(s.id));
    const csv = ['ref,customer,lane,state,etd\n',
      ...selected.map((s) => `${s.shipment_ref || s.id},${s.customer || ''},${s.lane || ''},${s.state || ''},${s.etd || ''}`)].join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `vdg-pipeline-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    a.click();
  });

  _onEntity = async () => {
    _shipments = enrichShipments(await loadShipments());
    mountView();
  };
  _onFilter     = (e) => { _filter = e.detail || {}; mountView(); };
  _onModeChange = (e) => { _mode   = e.detail?.mode ?? DEFAULT_MODE; mountView(); };

  window.addEventListener('vdg:entity-changed', _onEntity);
  window.addEventListener('vdg:filter-changed', _onFilter);
  window.addEventListener('vdg:mode-change',    _onModeChange);
}
