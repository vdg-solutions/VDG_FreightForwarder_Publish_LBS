import '../components/detail-panel.js';

const PANEL_WIDTH_PX    = 480;
const SLIDE_DURATION_MS = 250;
const NAV_HEIGHT_REM    = 3.5;
const Z_PANEL           = 40;

const GOOGLE_DRIVE_URL = '/data/10k_shipments.json';

function statusRenderer(params) {
  const el = document.createElement('status-badge');
  el.setAttribute('state', params.value);
  el.setAttribute('fsm', 'shipment');
  return el;
}

function pnlRenderer(params) {
  const v = params.value || 0;
  const positive = v >= 0;
  const div = document.createElement('div');
  div.className = 'flex items-center gap-2';
  const bar = document.createElement('div');
  bar.className = 'w-12 h-1.5 rounded-full overflow-hidden bg-slate-100';
  const fill = document.createElement('div');
  fill.style.width = `${Math.min(100, Math.abs(v) / 100)}%`;
  fill.className = positive ? 'h-full bg-emerald-500' : 'h-full bg-red-500';
  bar.appendChild(fill);
  const label = document.createElement('span');
  label.className = `font-mono text-xs ${positive ? 'text-emerald-700' : 'text-red-700'} font-semibold`;
  label.textContent = `${positive ? '+' : ''}$${v.toLocaleString()}`;
  div.appendChild(bar);
  div.appendChild(label);
  return div;
}

const COLUMNS = [
  { headerName: 'Shipment Ref', field: 'ref', pinned: 'left', width: 140, cellClass: 'font-mono text-xs' },
  { headerName: 'Customer', field: 'customer', width: 170 },
  { headerName: 'Trade Lane', field: 'lane', width: 140, cellClass: 'font-mono text-xs', valueGetter: (p) => p.data.lane || `${p.data.pol || '—'} → ${p.data.pod || '—'}` },
  { headerName: 'Vessel / Voyage', field: 'vessel', width: 170,
    valueGetter: (p) => `${p.data.vessel || '—'} / ${p.data.voyage || '—'}` },
  { headerName: 'ETD', field: 'etd', width: 110, cellClass: 'font-mono text-xs text-slate-600' },
  { headerName: 'ETA', field: 'eta', width: 110, cellClass: 'font-mono text-xs text-slate-600' },
  { headerName: 'TEU', field: 'teu', width: 70, type: 'numericColumn', cellClass: 'font-mono text-xs text-right' },
  { headerName: 'State', field: 'state', width: 150, cellRenderer: statusRenderer },
  { headerName: 'Job P&L (USD)', field: 'pnl', width: 180, cellRenderer: pnlRenderer },
];

const GRID_HEIGHT_PX = 560;

function toolbar(total, isLarge) {
  return `
    <div class="flex items-center justify-between mb-4">
      <div>
        <div class="text-xs text-slate-500">FSM-01 · Active jobs</div>
        <div class="text-base font-semibold text-slate-900">${total.toLocaleString()} shipments${isLarge ? ' <span class="text-xs font-normal text-amber-600 ml-1">virtual scroll demo</span>' : ''}</div>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative">
          <svg class="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input id="grid-search" placeholder="Search ref, customer, vessel…" class="text-sm pl-8 pr-3 py-1.5 border border-slate-200 rounded-md w-72 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
        </div>
        <button id="toggle-large" class="text-xs px-3 py-1.5 border border-slate-200 rounded-md text-slate-700 bg-white hover:bg-slate-50" title="Virtual scroll stress test with 10 000 rows">
          ${isLarge ? 'Normal view' : '10 K rows demo'}
        </button>
        <button id="export-csv" class="text-xs px-3 py-1.5 bg-slate-900 text-white rounded-md hover:bg-slate-800">Export CSV</button>
      </div>
    </div>
  `;
}

async function loadRealData() {
  const repo = window.__vdg_repo;
  if (!repo) return [];
  const allShipments = await repo.list('shipment', null);
  const allLines = await repo.list('pnl_line').catch(() => []);
  const linesByRef = {};
  for (const l of allLines) {
    const r = l.shipment_ref;
    if (!linesByRef[r]) linesByRef[r] = [];
    linesByRef[r].push(l);
  }
  for (const s of allShipments) {
    s.ref = s.shipment_ref || s.ref;
    s.state = s.state || s.status;
    // pnl_line entities are the aggregation source. Fall back to the shipment's embedded
    // pnl_lines for manual P&Ls saved before they materialized entities, so existing shipments
    // show revenue without a re-save.
    const lines = (linesByRef[s.ref] && linesByRef[s.ref].length) ? linesByRef[s.ref] : (s.pnl_lines || []);
    const margin = lines.reduce((acc, l) =>
      acc + (Number(l.sell_amt || l.selling_vnd_collect || 0))
          - (Number(l.buy_amt  || l.buying_vnd_pay      || 0)), 0);
    s.pnl = margin;
  }
  return allShipments;
}

export async function render(root) {
  const isLarge = location.hash.includes('large=1');
  
  root.innerHTML = `
    <div class="p-6 max-w-[1400px] mx-auto">
      <div id="grid-header">
        <div class="text-sm text-slate-500 py-4">Đang tải dữ liệu...</div>
      </div>
      <div id="grid" class="ag-theme-quartz rounded-xl overflow-hidden border border-slate-200" style="height:${GRID_HEIGHT_PX}px;"></div>
    </div>
  `;

  let rowData = [];
  if (isLarge) {
    try {
      const res = await fetch(GOOGLE_DRIVE_URL);
      rowData = await res.json();
    } catch (e) {
      console.error('Failed to load 10K demo data', e); // DEV
      rowData = [];
    }
  } else {
    rowData = await loadRealData();
  }

  const gridDiv = document.getElementById('grid');
  const api = window.agGrid.createGrid(gridDiv, {
    columnDefs: COLUMNS,
    rowData,
    defaultColDef: { sortable: true, resizable: true, filter: true },
    rowSelection: 'single',
    onRowClicked: (e) => { document.getElementById('detail-panel')?.open(e.data); },
    animateRows: !isLarge,
    rowHeight: 38,
    headerHeight: 36,
  });

  const headerDiv = document.getElementById('grid-header');
  if (headerDiv) {
    headerDiv.innerHTML = toolbar(rowData.length, isLarge);
    
    document.getElementById('grid-search').addEventListener('input', (e) => {
      api.setGridOption('quickFilterText', e.target.value);
    });

    document.getElementById('export-csv').addEventListener('click', () => {
      api.exportDataAsCsv({ fileName: 'vdg_shipments.csv' });
    });

    document.getElementById('toggle-large').addEventListener('click', () => {
      const next = isLarge ? '/shipments' : '/shipments?large=1';
      window.dispatchEvent(new CustomEvent('vdg:navigate', { detail: { route: next } }));
      location.hash = next;
    });
  }

  if (!document.getElementById('detail-panel')) {
    const panel = document.createElement('vdg-detail-panel');
    panel.id = 'detail-panel';
    panel.setAttribute('hidden', '');
    panel.className = `fixed right-0 bg-white shadow-xl flex flex-col md:w-[${PANEL_WIDTH_PX}px] w-full transition-transform duration-[${SLIDE_DURATION_MS}ms] ease-out translate-x-full`;
    panel.style.cssText = `top:${NAV_HEIGHT_REM}rem;height:calc(100vh - ${NAV_HEIGHT_REM}rem);z-index:${Z_PANEL}`;
    document.body.appendChild(panel);
  }
}
