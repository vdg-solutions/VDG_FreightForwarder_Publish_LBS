import { isManager } from '../../auth/auth-gate.js';
import { navigate } from '../../router.js';
import { bulkPut } from '../../cache/bulk-orchestrator.js';

const KIND_COMMISSION_RULES = 'commission_rules';
const KIND_USERS            = 'users';
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
    { field: 'email',  headerName: 'Email',  flex: 1, minWidth: 200 },
    { field: 'name',   headerName: 'Tên',    flex: 1, minWidth: 140 },
    { field: 'role',   headerName: 'Role',   width: 110 },
    {
      headerName: 'Sales % (0–100)',
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
        input.placeholder = `${DEFAULT_SALES_PCT} (mặc định)`;
        input.className = 'w-24 border border-slate-300 rounded px-2 py-1 text-xs text-right focus:ring focus:ring-blue-200 outline-none';

        const lbsLabel = document.createElement('span');
        lbsLabel.className = 'text-xs text-slate-400 whitespace-nowrap';
        lbsLabel.textContent = p.value != null
          ? `LBS ${100 - Number(p.value)}%`
          : `LBS ${100 - DEFAULT_SALES_PCT}%`;

        input.addEventListener('input', (e) => {
          const val = Math.min(Math.max(Number(e.target.value), 0), 100);
          lbsLabel.textContent = `LBS ${100 - val}%`;
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
    container.innerHTML = '<div class="p-4 text-xs text-slate-400">ag-Grid chưa sẵn sàng. Tải lại trang.</div>';
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
  if (!isManager()) { navigate('/dashboard'); return; }

  await loadData();

  root.innerHTML = `
    <div class="p-6 space-y-5 max-w-[900px] mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-slate-900">Thiết lập hoa hồng Sales</h1>
          <p class="text-sm text-slate-500 mt-1">
            Set % Sales Share cho từng người. LBS Share = 100% − Sales%.
          </p>
        </div>
        <button id="btn-save-rules" disabled
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 text-sm font-medium transition-colors">
          Lưu thay đổi
        </button>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
        <div class="font-semibold">Công thức waterfall:</div>
        <div>① TNDN = Lợi nhuận × 20%</div>
        <div>② Net = Lợi nhuận − TNDN − Com Line − Com Khách</div>
        <div>③ Sales Share = Net × Sales% &nbsp;|&nbsp; LBS Share = Net × (100% − Sales%)</div>
        <div class="pt-1 text-blue-600">Mặc định nếu chưa set: Sales = ${DEFAULT_SALES_PCT}%, LBS = ${100 - DEFAULT_SALES_PCT}%</div>
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
    if (status) status.textContent = 'Đang lưu…';

    const entities = dirtyRows.map((r) => ({
      id:         r.id,
      sales_id:   r.id,
      sales_pct:  r.salesPct != null ? Number(r.salesPct) : null, // null = use default
      updated_at: new Date().toISOString(),
    }));

    try {
      await bulkPut(repo, KIND_COMMISSION_RULES, entities);
      window.dispatchEvent(new CustomEvent('vdg:toast', {
        detail: { type: 'success', message: `Đã lưu ${entities.length} quy tắc hoa hồng` },
      }));
      if (status) status.textContent = `Đã lưu lúc ${new Date().toLocaleTimeString('vi-VN')}`;
      dirtyRows.forEach((r) => { r.dirty = false; });
      await loadData();
    } catch (e) {
      window.dispatchEvent(new CustomEvent('vdg:toast', {
        detail: { type: 'error', message: 'Lỗi khi lưu: ' + e.message },
      }));
      if (btn) btn.disabled = false;
    }
  });
}
