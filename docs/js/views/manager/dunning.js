// F-15-12 — Dunning manager view (/manager/dunning)

import { isManager }    from '../../auth/auth-gate.js';
import { navigate }     from '../../router.js';
import { pickTemplate, mergeFields } from '../../operators/manager/dunning-ladder.js';
import { classifyOverdue }           from '../../operators/manager/dunning-ladder.js';
import { appendDunning }             from '../../sync/dunning-log.js';
import { showConfirm }               from '../../helpers/show-confirm.js';
import { t }                         from '../../i18n/index.js';
import { agGridLocaleText }          from '../../i18n/ag-grid-locale.js';

const KIND_BILLING   = 'billing';
const KIND_CUSTOMERS = 'customers';
const KIND_TEMPLATES = 'dunning_templates';

let _grid    = null;
let _billing = [];
let _customers = [];
let _templates = [];
let _selectedIds = new Set();

function getRepo() { return window.__vdg_repo; }

function fmtVnd(n) { return Number(n || 0).toLocaleString('vi-VN'); }
function today()   { return Date.now(); }

// ── data ───────────────────────────────────────────────────────────────────────

async function loadData() {
  const repo = getRepo();
  if (!repo) return { rows: [] };

  [_billing, _customers, _templates] = await Promise.all([
    repo.list(KIND_BILLING, null).catch(() => []),
    repo.list(KIND_CUSTOMERS, null).catch(() => []),
    repo.list(KIND_TEMPLATES, null).catch(() => []),
  ]);

  const custMap = new Map(_customers.map((c) => [c.id, c]));
  const now = today();

  // group unpaid billing by customer
  const byCustomer = new Map();
  for (const b of _billing) {
    if (b.status === 'Paid' || b._deleted) continue;
    const cid = b.customer_id || b.customer || '';
    if (!byCustomer.has(cid)) byCustomer.set(cid, []);
    byCustomer.get(cid).push(b);
  }

  const rows = [];
  for (const [cid, bs] of byCustomer) {
    const customer = custMap.get(cid) || { id: cid, name: cid };
    const override = customer.dunning_threshold_days_override ? { reminder_1: customer.dunning_threshold_days_override } : null;

    const maxDays = bs.reduce((max, b) => {
      const inv = b.invoice_date || b.InvoiceDate;
      if (!inv) return max;
      const d = Math.floor((now - new Date(inv).getTime()) / 86_400_000);
      return d > max ? d : max;
    }, 0);

    const stage = classifyOverdue(maxDays, override);
    if (!stage) continue;

    const total = bs.reduce((s, b) => s + Number(b.amount_vnd ?? b.AmountVnd ?? 0), 0);
    rows.push({
      customer_id:   cid,
      customer_name: customer.name || cid,
      email:         customer.email || '',
      stage,
      days_overdue:  maxDays,
      total_outstanding: total,
      invoice_count: bs.length,
      billing_ids:   bs.map((b) => b.id),
    });
  }

  rows.sort((a, b) => b.days_overdue - a.days_overdue);
  return { rows };
}

// ── grid ───────────────────────────────────────────────────────────────────────

function stageCls(stage) {
  const map = { reminder_1: '#3b82f6', reminder_2: '#f59e0b', escalate: '#ef4444', legal: '#7c3aed', blacklist: '#111827' };
  return map[stage] || '#64748b';
}

function mountGrid(container, rows) {
  if (_grid) { try { _grid.destroy(); } catch { /* ignore */ } _grid = null; }
  container.innerHTML = '<div class="ag-theme-quartz" style="height:420px"></div>';
  if (!window.agGrid) return;

  const colDefs = [
    { headerName: '', width: 44, checkboxSelection: true, headerCheckboxSelection: true },
    { field: 'customer_name',      headerName: t('dunning.col.customer'),      flex: 1 },
    { field: 'stage',              headerName: t('dunning.col.stage'),         width: 110,
      cellStyle: (p) => ({ color: stageCls(p.value), fontWeight: '600' }),
      valueFormatter: ({ value }) => t('sales_overdue.stage.' + value) },
    { field: 'days_overdue',       headerName: t('dunning.col.days_overdue'),  width: 120, sort: 'desc' },
    { field: 'total_outstanding',  headerName: t('dunning.col.outstanding'),   width: 150,
      valueFormatter: ({ value }) => fmtVnd(value) },
    { field: 'invoice_count',      headerName: t('dunning.col.invoices'),      width: 100 },
    { field: 'email',              headerName: t('dunning.col.email'),         width: 180 },
  ];

  const opts = {
    columnDefs:    colDefs,
    rowData:       rows,
    rowSelection:  'multiple',
    defaultColDef: { sortable: true, resizable: true },
    onSelectionChanged: (e) => {
      _selectedIds = new Set(e.api.getSelectedRows().map((r) => r.customer_id));
      const bulkBtn = container.closest('.dunning-root')?.querySelector('#btn-bulk-send');
      if (bulkBtn) bulkBtn.disabled = _selectedIds.size === 0;
    },
    localeText: agGridLocaleText(),
  };
  const g = new agGrid.Grid(container.querySelector('.ag-theme-quartz'), opts);
  _grid = g.gridOptions?.api || opts.api;
}

// ── send reminder ──────────────────────────────────────────────────────────────

function sendReminder(row, locale) {
  const custMap = new Map(_customers.map((c) => [c.id, c]));
  const customer = custMap.get(row.customer_id) || { name: row.customer_name, email: row.email };
  const bs       = _billing.filter((b) => row.billing_ids.includes(b.id));
  const tmpl     = pickTemplate(row.stage, locale, _templates);
  const merged   = mergeFields(tmpl, customer, bs);

  const mailTo   = encodeURIComponent(customer.email || '');
  const subject  = encodeURIComponent(merged.subject);
  const body     = encodeURIComponent(merged.body);
  window.open(`mailto:${mailTo}?subject=${subject}&body=${body}`, '_blank');

  const user = window.__vdg_auth?.getCurrentUser?.();
  appendDunning({
    customer_id: row.customer_id,
    stage:       row.stage,
    sent_at:     new Date().toISOString(),
    channel:     'mailto',
    sent_by:     user?.email || 'manager',
    template_id: '',
    billing_ids: row.billing_ids,
  });
}

// ── render ─────────────────────────────────────────────────────────────────────

export async function render(root) {
  if (!isManager()) { navigate('/dashboard'); return; }

  root.innerHTML = `
    <div class="dunning-root p-6 max-w-[1400px] mx-auto">
      <div class="flex items-center justify-between mb-4">
        <div class="text-lg font-semibold text-slate-900">${t('dunning.title')}</div>
        <div class="flex gap-2">
          <select id="sel-locale" class="border rounded-lg px-3 py-1.5 text-xs">
            <option value="vi">${t('dunning.locale.vi')}</option>
            <option value="en">${t('dunning.locale.en')}</option>
          </select>
          <button id="btn-bulk-send" disabled
                  class="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">
            ${t('dunning.action.bulk_send')}
          </button>
          <a href="#/manager/dunning-templates"
             class="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
            ${t('dunning.link.templates')}
          </a>
          <button id="btn-refresh"
                  class="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
            ${t('dunning.action.refresh')}
          </button>
        </div>
      </div>
      <div id="dunning-grid-container"></div>
      <div id="dunning-status" class="text-xs text-slate-400 mt-2">${t('dunning.status.loading')}</div>
    </div>`;

  let rows = [];

  async function reload() {
    root.querySelector('#dunning-status').textContent = t('dunning.status.loading');
    const data = await loadData();
    rows = data.rows;
    mountGrid(root.querySelector('#dunning-grid-container'), rows);
    root.querySelector('#dunning-status').textContent = t('dunning.status.count', { n: rows.length });
  }

  await reload();

  root.querySelector('#btn-refresh').addEventListener('click', reload);

  root.querySelector('#btn-bulk-send').addEventListener('click', async () => {
    const locale  = root.querySelector('#sel-locale').value || 'vi';
    const selected = rows.filter((r) => _selectedIds.has(r.customer_id));
    if (!selected.length) return;
    const ok = await showConfirm({
      title: t('dunning.confirm.title', { n: selected.length }),
      body:  t('dunning.confirm.body', { L: locale.toUpperCase() }),
      confirmLabel: t('dunning.confirm.ok'),
      cancelLabel:  t('dunning.confirm.cancel'),
    });
    if (!ok) return;
    for (const row of selected) sendReminder(row, locale);
    window.dispatchEvent(new CustomEvent('vdg:toast', {
      detail: { type: 'success', message: t('dunning.toast.sent', { n: selected.length }) },
    }));
  });
}
