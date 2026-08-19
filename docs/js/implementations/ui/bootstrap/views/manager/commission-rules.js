import { hasRole } from '../../../../freight_app/core_abstractions/session-roles.js';
import { ROLE_MANAGER } from '../../../../freight_app/core_abstractions/roles.js';
import { navigate } from '../../router.js';
import { bulkPut } from '../../../../freight_app/operators/cache/bulk-orchestrator.js';
import { t } from '../../../../kernel/core_abstractions/i18n/index.js';

const KIND_COMMISSION_RULES = 'commission_rules';
const KIND_USERS            = 'user'; // F-39-01: canonical user-master kind (MASTER_REGISTRY)
const DEFAULT_SALES_PCT     = 70; // fallback default shown in placeholder

let _users   = [];
const _rules = new Map();
let _gridApi = null;

function getRepo() { return window.__vdg_repo; }

async function loadData() {
  const repo = getRepo();
  if (!repo) return;
  const [users, ruleEntities] = await Promise.all([
    repo.list(KIND_USERS, null).catch(() => []),
    repo.list(KIND_COMMISSION_RULES, null).catch(() => []),
  ]);
  _users = users;
  _rules.clear();
  for (const r of ruleEntities) {
    const key = r.sales_id || r.salesId || r.id;
    if (key) _rules.set(key, r);
  }
}

function buildGridCols() {
  return [
    { field: 'email',  headerName: t('commission_rules.col.email'), flex: 1, minWidth: 200 },
    { field: 'name',   headerName: t('commission_rules.col.name'), flex: 1, minWidth: 140 },
    { field: 'role',   headerName: t('commission_rules.col.role'), width: 110 },
    {
      headerName: t('commission_rules.col.sales_pct'),
      field: 'salesPct',
      width: 150,
      cellRenderer: (p) => {
        const wrap  = document.createElement('div');
        wrap.className = 'flex items-center gap-2 h-full';

        const input = document.createElement('input');
        input.type  = 'number';
        input.min   = '0';
        input.max   = '100';
        input.step  = '1';
        input.value = p.value ?? '';
        input.placeholder = t('commission_rules.default_suffix', { n: DEFAULT_SALES_PCT });
        input.className = 'w-24 border border-slate-300 rounded px-2 py-1 text-xs text-right focus:ring focus:ring-blue-200 outline-none';

        const lbsLabel = document.createElement('span');
        lbsLabel.className = 'text-xs text-slate-400 whitespace-nowrap';
        lbsLabel.textContent = p.value != null
          ? t('commission_rules.lbs_share', { n: 100 - Number(p.value) })
          : t('commission_rules.lbs_share', { n: 100 - DEFAULT_SALES_PCT });

        input.addEventListener('input', (e) => {
          const val = Math.min(Math.max(Number(e.target.value), 0), 100);
          lbsLabel.textContent = t('commission_rules.lbs_share', { n: 100 - val });
          p.data.salesPct = e.target.value === '' ? null : val;
          p.data.dirty    = true;
          const btn = document.getElementById('btn-save-rules');
          if (btn) btn.disabled = false;
        });

        wrap.appendChild(input);
        wrap.appendChild(lbsLabel);
        return wrap;
      },
    },
  ];
}

function renderGrid(container) {
  if (_gridApi) {
    try { _gridApi.destroy(); } catch { /* ignore */ }
    _gridApi = null;
  }

  container.innerHTML = '<div class="ag-theme-quartz" style="height: 480px;"></div>';
  if (!window.agGrid) {
    container.innerHTML = `<div class="p-4 text-xs text-slate-400">${t('commission_rules.ag_grid_unavailable')}</div>`;
    return;
  }

  const rowData = _users.map((u) => {
    const key      = u.email || u.id;
    const existing = _rules.get(key);
    return {
      id:       key,
      email:    u.email || key,
      name:     u.display_name || u.name || '',
      role:     u.role || (Array.isArray(u.roles) ? u.roles[0] : u.roles) || '',
      salesPct: existing?.sales_pct ?? null,
      dirty:    false,
    };
  });

  const gridOptions = {
    columnDefs:            buildGridCols(),
    rowData,
    defaultColDef:         { sortable: true, resizable: true },
    rowHeight:             48,
    suppressMovableColumns: true,
    onGridReady: (params) => { _gridApi = params.api; },
  };

  if (typeof agGrid.createGrid === 'function') {
    _gridApi = agGrid.createGrid(container.querySelector('.ag-theme-quartz'), gridOptions);
  } else {
    new agGrid.Grid(container.querySelector('.ag-theme-quartz'), gridOptions);
    _gridApi = gridOptions.api;
  }
}

export async function render(root) {
  if (!hasRole(ROLE_MANAGER)) { navigate('/dashboard'); return; }

  await loadData();

  root.innerHTML = `
    <div class="p-6 space-y-5 max-w-[900px] mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-slate-900">${t('commission_rules.title')}</h1>
          <p class="text-sm text-slate-500 mt-1">
            ${t('commission_rules.subtitle')}
          </p>
        </div>
        <button id="btn-save-rules" disabled
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 text-sm font-medium transition-colors">
          ${t('commission_rules.save')}
        </button>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
        <div class="font-semibold">${t('commission_rules.waterfall.title')}</div>
        <div>${t('commission_rules.waterfall.line1')}</div>
        <div>${t('commission_rules.waterfall.line2')}</div>
        <div>${t('commission_rules.waterfall.line3')}</div>
        <div class="pt-1 text-blue-600">${t('commission_rules.waterfall.default_note', { sales: DEFAULT_SALES_PCT, lbs: 100 - DEFAULT_SALES_PCT })}</div>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div id="rules-grid"></div>
      </div>

      <div id="save-status" class="text-xs text-slate-500 text-right"></div>
    </div>
  `;

  renderGrid(root.querySelector('#rules-grid'));

  root.querySelector('#btn-save-rules').addEventListener('click', async () => {
    const repo = getRepo();
    if (!repo) return;

    const rows = [];
    if (_gridApi) {
      if (typeof _gridApi.forEachNode === 'function') {
        _gridApi.forEachNode((node) => rows.push(node.data));
      } else if (typeof _gridApi.getDisplayedRowCount === 'function') {
        const count = _gridApi.getDisplayedRowCount();
        for (let i = 0; i < count; i++) {
          const row = _gridApi.getDisplayedRowAtIndex(i);
          if (row) rows.push(row.data);
        }
      }
    }

    const dirtyRows = rows.filter((r) => r.dirty);
    if (!dirtyRows.length) return;

    const btn    = document.getElementById('btn-save-rules');
    const status = root.querySelector('#save-status');
    if (btn) btn.disabled = true;
    if (status) status.textContent = t('commission_rules.saving');

    const entities = dirtyRows.map((r) => ({
      id:         r.id,
      sales_id:   r.id,
      sales_pct:  r.salesPct != null ? Number(r.salesPct) : null, // null = use default
      updated_at: new Date().toISOString(),
    }));

    try {
      await bulkPut(repo, KIND_COMMISSION_RULES, entities);
      window.dispatchEvent(new CustomEvent('vdg:toast', {
        detail: { type: 'success', message: t('commission_rules.saved', { n: entities.length }) },
      }));
      if (status) status.textContent = t('commission_rules.saved_at', { time: new Date().toLocaleTimeString('vi-VN') });
      dirtyRows.forEach((r) => { r.dirty = false; });
      await loadData();
    } catch (e) {
      window.dispatchEvent(new CustomEvent('vdg:toast', {
        detail: { type: 'error', message: t('commission_rules.save_error', { msg: e.message }) },
      }));
      if (btn) btn.disabled = false;
    }
  });
}
