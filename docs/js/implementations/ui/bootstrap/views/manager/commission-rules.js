import { bulkPut } from '../../../core_abstractions/ports/cache/bulk-orchestrator.js';
import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { mountAgGrid } from '../../../../kernel/core_abstractions/i18n/ag-grid-locale.js';
import { showConfirm } from '../../helpers/show-confirm.js';
import { openAddModal } from './commission-rules-modal.js';
import { commissionRuleEditorInputs, saveCommissionRule, deleteCommissionRule }
  from '../../../core_abstractions/ports/data/report-reads.js';

const KIND_COMMISSION_RULES = 'commission_rules';

let _users          = [];
const _rules        = new Map();
let _entrySalesIds  = []; // created_by of every commission_entry — commission_rule_block_reason's input
let _gridApi        = null;

function getRepo() { return window.__vdg_repo; }
function wasm() { return window.__vdg_wasm; }

async function loadData() {
  // One read for the whole editor. The author projection used to be `entries.map(e =>
  // e.created_by)` here, which meant every commission-entry row crossed the boundary to produce
  // a list of email addresses.
  const { users, rules, entryAuthors } = await commissionRuleEditorInputs();
  _users = users;
  _rules.clear();
  for (const r of rules) {
    const key = r.sales_id || r.salesId || r.id;
    if (key) _rules.set(key, r);
  }
  _entrySalesIds = entryAuthors;
}

// One row per user PLUS one row per rule with no matching user — a rule is not required to
// stay tied to the fixed user list (F-57-01: a departed rep can still carry an override).
function buildRowData() {
  const seen = new Set();
  const rows = _users.map((u) => {
    const key      = u.email || u.id;
    const existing = _rules.get(key);
    seen.add(key);
    return {
      id:          key,
      email:       u.email || key,
      name:        u.display_name || u.name || '',
      role:        u.role || (Array.isArray(u.roles) ? u.roles[0] : u.roles) || '',
      salesPct:    existing?.sales_pct ?? null,
      hasOverride: existing != null,
      dirty:       false,
    };
  });
  for (const [key, r] of _rules) {
    if (seen.has(key)) continue;
    rows.push({
      id: key, email: key, name: '', role: '',
      salesPct: r.sales_pct ?? null, hasOverride: true, dirty: false,
    });
  }
  return rows;
}

function buildGridCols(onDelete) {
  return [
    { field: 'email',  headerName: t('commission_rules.col.email'), flex: 1, minWidth: 200 },
    { field: 'name',   headerName: t('commission_rules.col.name'), flex: 1, minWidth: 140 },
    { field: 'role',   headerName: t('commission_rules.col.role'), width: 110 },
    {
      headerName: t('commission_rules.col.sales_pct'),
      field: 'salesPct',
      width: 170,
      cellRenderer: (p) => {
        const wrap  = document.createElement('div');
        wrap.className = 'flex items-center gap-2 h-full';

        const input = document.createElement('input');
        input.type  = 'number';
        input.min   = '0';
        input.max   = '100';
        input.step  = '1';
        input.value = p.value ?? '';
        input.className = 'w-24 border border-slate-300 rounded px-2 py-1 text-xs text-right focus:ring focus:ring-blue-200 outline-none';

        const lbsLabel = document.createElement('span');
        lbsLabel.className = 'text-xs text-slate-400 whitespace-nowrap';

        // The default/company-share label always comes from the same Rust rule the save
        // path validates against — never a JS `100 - x`.
        const paintSplit = (pct) => {
          try {
            const split = wasm().commission_rule_split(pct);
            input.placeholder = t('commission_rules.default_suffix', { n: split.sales_pct });
            lbsLabel.textContent = t('commission_rules.lbs_share', { n: split.company_pct });
            input.classList.remove('border-red-400');
            return true;
          } catch {
            lbsLabel.textContent = t('commission_rules.err_invalid_pct');
            input.classList.add('border-red-400');
            return false;
          }
        };
        paintSplit(p.value != null ? Number(p.value) : null);

        input.addEventListener('input', (e) => {
          const raw = e.target.value;
          const pct = raw === '' ? null : Number(raw);
          if (!paintSplit(pct)) return; // invalid — do not mark dirty, Save stays disabled for this edit
          p.data.salesPct = pct;
          p.data.dirty    = true;
          const btn = document.getElementById('btn-save-rules');
          if (btn) btn.disabled = false;
        });

        wrap.appendChild(input);
        wrap.appendChild(lbsLabel);
        return wrap;
      },
    },
    {
      headerName: t('common.col.actions'),
      field: 'actions',
      width: 100,
      cellRenderer: (p) => {
        if (!p.data.hasOverride) return '';
        const btn = document.createElement('button');
        btn.className = 'text-xs text-red-500 hover:underline';
        btn.textContent = t('common.action.delete');
        btn.addEventListener('click', () => onDelete(p.data));
        return btn;
      },
    },
  ];
}

function renderGrid(container, onDelete) {
  if (_gridApi) {
    try { _gridApi.destroy(); } catch { /* ignore */ }
    _gridApi = null;
  }

  container.innerHTML = '<div class="ag-theme-quartz" style="height: 480px;"></div>';
  if (!window.agGrid) {
    container.innerHTML = `<div class="p-4 text-xs text-slate-400">${t('commission_rules.ag_grid_unavailable')}</div>`;
    return;
  }

  const gridOptions = {
    columnDefs:            buildGridCols(onDelete),
    rowData:               buildRowData(),
    defaultColDef:         { sortable: true, resizable: true },
    rowHeight:             48,
    suppressMovableColumns: true,
    onGridReady: (params) => { _gridApi = params.api; },
  };

  _gridApi = mountAgGrid(container.querySelector('.ag-theme-quartz'), gridOptions);
}

export async function render(root) {
  await loadData();
  const defaultSplit = wasm().commission_rule_split(null);

  root.innerHTML = `
    <div class="p-6 space-y-5 max-w-[900px] mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-slate-900">${t('commission_rules.title')}</h1>
          <p class="text-sm text-slate-500 mt-1">
            ${t('commission_rules.subtitle')}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button id="btn-add-rule"
            class="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors">
            + ${t('commission_rules.add_button')}
          </button>
          <button id="btn-save-rules" disabled
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 text-sm font-medium transition-colors">
            ${t('commission_rules.save')}
          </button>
        </div>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
        <div class="font-semibold">${t('commission_rules.waterfall.title')}</div>
        <div>${t('commission_rules.waterfall.line1')}</div>
        <div>${t('commission_rules.waterfall.line2')}</div>
        <div>${t('commission_rules.waterfall.line3')}</div>
        <div class="pt-1 text-blue-600">${t('commission_rules.waterfall.default_note', { sales: defaultSplit.sales_pct, lbs: defaultSplit.company_pct })}</div>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div id="rules-grid"></div>
      </div>

      <div id="save-status" class="text-xs text-slate-500 text-right"></div>
    </div>
  `;

  async function refreshGrid() {
    renderGrid(root.querySelector('#rules-grid'), onDeleteRule);
  }

  async function onDeleteRule(row) {
    const ok = await showConfirm({
      title: t('commission_rules.delete_confirm', { email: row.email }),
      confirmLabel: t('common.action.delete'), cancelLabel: t('common.action.cancel'), destructive: true,
    });
    if (!ok) return;

    const blockReason = wasm().commission_rule_block_reason(row.id, JSON.stringify(_entrySalesIds));
    if (blockReason) {
      window.dispatchEvent(new CustomEvent('vdg:toast', {
        detail: { type: 'error', message: t('commission_rules.delete_blocked') },
      }));
      return;
    }

    await deleteCommissionRule(row.id);
    window.dispatchEvent(new CustomEvent('vdg:toast', {
      detail: { type: 'success', message: t('commission_rules.deleted') },
    }));
    await loadData();
    await refreshGrid();
  }

  await refreshGrid();

  root.querySelector('#btn-add-rule').addEventListener('click', () => {
    openAddModal(root, async (entity) => {
      await saveCommissionRule(entity.id, entity);
      await loadData();
      await refreshGrid();
    });
  });

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
      await refreshGrid();
    } catch (e) {
      window.dispatchEvent(new CustomEvent('vdg:toast', {
        detail: { type: 'error', message: t('commission_rules.save_error', { msg: e.message }) },
      }));
      if (btn) btn.disabled = false;
    }
  });
}
