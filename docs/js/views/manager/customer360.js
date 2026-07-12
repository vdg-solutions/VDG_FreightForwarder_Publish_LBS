// Manager Customer 360 — F-14-07

import { isManager } from '../../auth/auth-gate.js';
import { navigate }                      from '../../router.js';
import { compose, HEALTH_THRESHOLD_GOOD, HEALTH_THRESHOLD_WATCH, compose360 } from '../../operators/manager/customer360-composer.js';
import { t } from '../../i18n/index.js';

const CUSTOMER360_RE   = /^\/manager\/customers\/([^/]+)$/;
const KIND_CUSTOMER    = 'customers';
const KIND_SHIPMENT    = 'shipment';
const KIND_BILLING     = 'billing';
const KIND_EXCEPTION   = 'exception';
const KIND_QUOTATION   = 'quotation';
const AUDIT_BATCH_SIZE = 50;
const NOTES_NONE_MSG   = 'No notes yet.';
const TAB_MULTIMODAL   = 'multimodal';

let _vm         = null;
let _billing    = [];
let _shipments  = [];
let _exceptions = [];
let _tab        = 'overview';
let _auditOffset = 0;
let _chart      = null;
let _onEntity;

function getRepo() { return window.__vdg_repo; }

function fmtNum(n) { return Number(n ?? 0).toLocaleString('vi-VN'); }

function currentUser() {
  return window.__vdg_auth?.getCurrentUser?.()?.email || 'manager';
}

function healthBadgeCls(score) {
  if (score >= HEALTH_THRESHOLD_GOOD)  return 'bg-emerald-100 text-emerald-700';
  if (score >= HEALTH_THRESHOLD_WATCH) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function healthLabel(score) {
  if (score >= HEALTH_THRESHOLD_GOOD)  return 'Healthy';
  if (score >= HEALTH_THRESHOLD_WATCH) return 'Watch';
  return 'At Risk';
}

function renderHeader(root) {
  if (!_vm) return;
  const { customer, lifetimeRevenue, outstanding, salesRep, healthScore, healthBreakdown } = _vm;
  const toneCls  = outstanding > 0 ? 'amber' : 'green';
  const breakdown = healthBreakdown.join(' | ') || 'No deductions';

  const hdr = root.querySelector('#c360-header');
  if (!hdr) return;
  hdr.innerHTML = `
    <h1 class="text-xl font-bold text-slate-900">${customer.name || customer.id}</h1>
    <div class="flex flex-wrap gap-3 mt-2 items-center">
      <status-badge label="${salesRep}" tone="blue"></status-badge>
      <kpi-card label="Lifetime Revenue" value="${fmtNum(lifetimeRevenue)} VND" tone="blue" icon="dollar"></kpi-card>
      <kpi-card label="Outstanding" value="${fmtNum(outstanding)} VND" tone="${toneCls}" icon="dollar"></kpi-card>
      <span class="px-3 py-1 rounded-full text-xs font-semibold ${healthBadgeCls(healthScore)}"
            title="${breakdown}">
        ${healthLabel(healthScore)} (${healthScore})
      </span>
    </div>`;
}

function renderTabContent(root, tabName, quotations) {
  const content = root.querySelector('#c360-tab-content');
  if (!content || !_vm) return;
  const { customer } = _vm;

  if (tabName === 'overview') {
    content.innerHTML = `<div class="space-y-4 p-4">
      <div class="h-52"><canvas id="rev-chart"></canvas></div>
      <div class="text-xs text-slate-500">Last touch: ${_vm.lastTouchDate?.slice(0, 10) || '—'}</div>
    </div>`;
    // 12-month revenue chart
    queueMicrotask(() => {
      const ctx = root.querySelector('#rev-chart');
      if (!ctx || !window.Chart) return;
      if (_chart) { _chart.destroy(); _chart = null; }
      const now   = new Date();
      const labels = [];
      const data   = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
        const m  = d.getMonth(), y = d.getFullYear();
        const rev = _shipments.filter((s) => {
          const custId = s.customer_id || s.customer || s.Customer || '';
          if (custId !== customer.id) return false;
          const etd = s.etd || s.ETD;
          if (!etd) return false;
          const dd = new Date(etd);
          return dd.getFullYear() === y && dd.getMonth() === m;
        }).reduce((sum, s) => sum + Number(s.selling_vnd ?? 0), 0);
        data.push(rev);
      }
      _chart = new window.Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Revenue', data, borderColor: '#3b82f6', tension: 0.3, fill: false }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
      });
    });
  } else if (tabName === 'shipments') {
    const rows = _shipments.filter((s) => (s.customer_id || s.customer || s.Customer || '') === customer.id);
    const rowHtml = rows.map((s) => `<tr class="hover:bg-slate-50 cursor-pointer" data-ship-id="${s.id}">
      <td class="py-2 px-3 text-xs">${s.shipment_ref || s.id}</td>
      <td class="py-2 px-3 text-xs">${(s.pol||'?')}→${(s.pod||'?')}</td>
      <td class="py-2 px-3 text-xs">${s.etd || '—'}</td>
      <td class="py-2 px-3 text-xs">${s.eta || '—'}</td>
      <td class="py-2 px-3 text-xs">${s.state || '—'}</td>
    </tr>`).join('');
    content.innerHTML = `<table class="w-full text-xs border-collapse"><thead class="bg-slate-50">
      <tr>${['Ref','Lane','ETD','ETA','State'].map((h) => `<th class="py-2 px-3 text-left text-slate-600 font-medium">${h}</th>`).join('')}</tr>
      </thead><tbody>${rowHtml || '<tr><td colspan="5" class="p-4 text-slate-400 text-center">No shipments.</td></tr>'}</tbody></table>`;
    content.addEventListener('click', (e) => {
      const id = e.target.closest('[data-ship-id]')?.dataset.shipId;
      if (id) window.dispatchEvent(new CustomEvent('vdg:open-detail', { detail: { kind: 'shipment', id } }));
    });
  } else if (tabName === 'ar') {
    const rows = _billing.filter((b) => (b.customer_id || b.customer || b.Customer || '') === customer.id);
    const now  = Date.now();
    const rowHtml = rows.map((b) => {
      const days = b.invoice_date ? Math.floor((now - new Date(b.invoice_date).getTime()) / 86_400_000) : 0;
      return `<tr><td class="py-1 px-3 text-xs">${b.id}</td>
        <td class="py-1 px-3 text-xs">${b.invoice_date?.slice(0,10)||'—'}</td>
        <td class="py-1 px-3 text-xs">${b.due_date?.slice(0,10)||'—'}</td>
        <td class="py-1 px-3 text-xs text-right">${fmtNum(b.amount_vnd)}</td>
        <td class="py-1 px-3 text-xs">${b.status||'—'}</td>
        <td class="py-1 px-3 text-xs text-right">${days}d</td></tr>`;
    }).join('');
    content.innerHTML = `<table class="w-full text-xs border-collapse"><thead class="bg-slate-50">
      <tr>${['Invoice ID','Issue Date','Due Date','Amount VND','Status','Days Outstanding'].map((h) => `<th class="py-2 px-3 text-left text-slate-600 font-medium">${h}</th>`).join('')}</tr>
      </thead><tbody>${rowHtml || '<tr><td colspan="6" class="p-4 text-slate-400 text-center">No AR entries.</td></tr>'}</tbody></table>`;
  } else if (tabName === 'quotes') {
    const rows = (quotations || []).filter((q) => (q.customer_id || q.customer || '') === customer.id);
    const rowHtml = rows.map((q) => `<tr class="cursor-pointer hover:bg-slate-50" data-quote-id="${q.id}">
      <td class="py-1 px-3 text-xs">${q.id}</td>
      <td class="py-1 px-3 text-xs">${q.created_at?.slice(0,10)||'—'}</td>
      <td class="py-1 px-3 text-xs text-right">${fmtNum(q.amount)}</td>
      <td class="py-1 px-3 text-xs">${q.state||q.status||'—'}</td></tr>`).join('');
    content.innerHTML = `<table class="w-full text-xs border-collapse"><thead class="bg-slate-50">
      <tr>${['Quote ID','Date','Amount','Status'].map((h) => `<th class="py-2 px-3 text-left text-slate-600 font-medium">${h}</th>`).join('')}</tr>
      </thead><tbody>${rowHtml || '<tr><td colspan="4" class="p-4 text-slate-400 text-center">No quotes.</td></tr>'}</tbody></table>`;
    content.addEventListener('click', (e) => {
      const id = e.target.closest('[data-quote-id]')?.dataset.quoteId;
      if (id) window.dispatchEvent(new CustomEvent('vdg:open-detail', { detail: { kind: 'quote', id } }));
    });
  } else if (tabName === 'documents') {
    const docs = customer.documents || [];
    const rowHtml = docs.map((doc) => `<tr>
      <td class="py-1 px-3 text-xs">${doc.name||'—'}</td>
      <td class="py-1 px-3 text-xs">${doc.type||'—'}</td>
      <td class="py-1 px-3 text-xs"><a href="${doc.url||'#'}" target="_blank" class="text-blue-600 underline">Open</a></td></tr>`).join('');
    content.innerHTML = `<table class="w-full text-xs border-collapse"><thead class="bg-slate-50">
      <tr>${['Name','Type','Link'].map((h) => `<th class="py-2 px-3 text-left text-slate-600 font-medium">${h}</th>`).join('')}</tr>
      </thead><tbody>${rowHtml || '<tr><td colspan="3" class="p-4 text-slate-400 text-center">No documents.</td></tr>'}</tbody></table>`;
  } else if (tabName === 'activity') {
    const entries = (window.__vdg_audit_log || [])
      .filter((e) => e.entity_id?.startsWith?.(customer.id))
      .slice(_auditOffset, _auditOffset + AUDIT_BATCH_SIZE);
    content.innerHTML = `<div class="space-y-2 p-3 text-xs">
      ${entries.map((e) => `<timeline-entry .entry=${JSON.stringify(e)}></timeline-entry>`).join('')}
      ${entries.length === 0 ? '<div class="text-slate-400">No activity entries.</div>' : ''}
    </div>`;
  } else if (tabName === 'notes') {
    renderNotesTab(content, customer);
  } else if (tabName === TAB_MULTIMODAL) {
    const custShips = _shipments.filter((s) => (s.customer_id || s.customer || s.Customer || '') === customer.id);
    renderMultiModal(content, custShips);
  }
}

function renderNotesTab(container, customer) {
  const notes = [...(customer.notes || [])].reverse();
  const noteHtml = notes.map((n) => `
    <div class="bg-slate-50 rounded-lg p-3">
      <div class="flex items-center gap-2 text-xs text-slate-500 mb-1">
        <span class="font-medium text-slate-700">${n.author || '?'}</span>
        <span>${n.created_at?.slice(0,16)||''}</span>
      </div>
      <div class="text-xs text-slate-800">${n.text}</div>
    </div>`).join('');
  container.innerHTML = `
    <div class="p-4 space-y-3">
      <div class="flex gap-2">
        <textarea id="note-input" rows="2"
          class="flex-1 border rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Add a note…"></textarea>
        <button id="btn-add-note" disabled
          class="px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">Add</button>
      </div>
      <div id="notes-list" class="space-y-2">${noteHtml || `<div class="text-xs text-slate-400">${NOTES_NONE_MSG}</div>`}</div>
    </div>`;

  const input  = container.querySelector('#note-input');
  const addBtn = container.querySelector('#btn-add-note');
  input.addEventListener('input', () => { addBtn.disabled = !input.value.trim(); });
  addBtn.addEventListener('click', async () => {
    const text = input.value.trim();
    if (!text) return;
    const repo    = getRepo();
    const author  = currentUser().split('@')[0];
    const newNote = { text, author, created_at: new Date().toISOString() };
    const updated = { ...customer, notes: [...(customer.notes || []), newNote] };
    if (repo) await repo.put(KIND_CUSTOMER, customer.id, updated);
    customer.notes = updated.notes;
    input.value    = '';
    addBtn.disabled = true;
    renderNotesTab(container, customer);
  });
}

function renderMultiModal(content, custShipments) {
  const mm = compose360(custShipments);

  if (mm.total === 0) {
    content.innerHTML = `<div class="p-6 text-slate-400 text-sm text-center">${t('c360.no_shipments')}</div>`;
    return;
  }

  const seaRouteHtml = mm.top_routes_sea.map((r) => `<li class="text-xs text-slate-600">${r.lane} <span class="text-slate-400">(${r.count})</span></li>`).join('');
  const airRouteHtml = mm.top_routes_air.map((r) => `<li class="text-xs text-slate-600">${r.lane} <span class="text-slate-400">(${r.count})</span></li>`).join('');

  const summary = t('c360.shipment_summary')
    .replace('{total}', mm.total)
    .replace('{sea}',   mm.sea_count)
    .replace('{air}',   mm.air_count);

  content.innerHTML = `
    <div class="p-4 space-y-4">
      <div class="text-base font-semibold text-slate-800">${summary}</div>
      <div class="grid grid-cols-2 gap-4">
        <div class="rounded-xl border border-slate-200 p-3 cursor-pointer hover:bg-slate-50" data-c360-drill="sea">
          <div class="text-xs font-medium text-blue-700 mb-1">${t('c360.section.sea')} — ${mm.sea_count} (${mm.sea_pct}%)</div>
          <div class="text-xs text-slate-500 mb-2">${t('c360.revenue_split')}: ${fmtNum(mm.revenue_sea)} VND</div>
          <div class="text-xs font-medium text-slate-600 mb-1">${t('c360.top_routes')}:</div>
          <ul class="space-y-0.5">${seaRouteHtml || '<li class="text-xs text-slate-400">—</li>'}</ul>
        </div>
        <div class="rounded-xl border border-slate-200 p-3 cursor-pointer hover:bg-slate-50" data-c360-drill="air">
          <div class="text-xs font-medium text-indigo-700 mb-1">${t('c360.section.air')} — ${mm.air_count} (${mm.air_pct}%)</div>
          <div class="text-xs text-slate-500 mb-2">${t('c360.revenue_split')}: ${fmtNum(mm.revenue_air)} VND</div>
          <div class="text-xs font-medium text-slate-600 mb-1">${t('c360.top_routes')}:</div>
          <ul class="space-y-0.5">${airRouteHtml || '<li class="text-xs text-slate-400">—</li>'}</ul>
        </div>
      </div>
      <div id="c360-drill-list" class="mt-2"></div>
    </div>`;

  content.addEventListener('click', (e) => {
    const drillMode = e.target.closest('[data-c360-drill]')?.dataset.c360Drill;
    if (!drillMode) return;
    const drillList = content.querySelector('#c360-drill-list');
    if (!drillList) return;
    const filtered = custShipments.filter((s) => drillMode === 'air' ? s.mode === 'air' : (s.mode || 'sea') !== 'air');
    drillList.innerHTML = filtered.map((s) => `<div class="text-xs text-slate-700 py-1 border-b border-slate-100">${s.shipment_ref || s.id} · ${(s.pol || s.airport_origin || '?')}→${(s.pod || s.airport_dest || '?')} · ${s.state || '—'}</div>`).join('') || `<div class="text-xs text-slate-400">${t('c360.no_shipments')}</div>`;
  });
}

export async function render(root, param) {
  if (!isManager()) { navigate('/dashboard'); return; }
  if (_onEntity) window.removeEventListener('vdg:entity-changed', _onEntity);
  if (_chart) { _chart.destroy(); _chart = null; }
  _auditOffset = 0;

  const route     = param?.route || location.hash.slice(1);
  const match     = CUSTOMER360_RE.exec(route);
  const customerId = match?.[1] || param?.id || '';

  const repo = getRepo();
  let customers = [], quotations = [];
  if (repo) {
    [customers, _shipments, _billing, _exceptions, quotations] = await Promise.all([
      repo.list(KIND_CUSTOMER, null),
      repo.list(KIND_SHIPMENT, null),
      repo.list(KIND_BILLING, null),
      repo.list(KIND_EXCEPTION, null),
      repo.list(KIND_QUOTATION, null),
    ]);
  }

  _vm = compose(customerId, customers, _shipments, _billing, _exceptions);

  if (!_vm) {
    root.innerHTML = `<div class="p-6 space-y-3">
      <div class="text-slate-500 text-sm">Customer not found.</div>
      <a href="#/manager/masters/customers" class="text-xs text-blue-600 underline">← Back to masters</a>
    </div>`;
    return;
  }

  const tabs = ['overview','shipments','ar','quotes','documents','activity','notes', TAB_MULTIMODAL];
  const tabLabels = ['Overview','Shipments','AR/Payments','Quotes','Documents','Activity','Notes', t('c360.tab.multimodal')];
  const hashTab = (location.hash.match(/#tab=(\w+)/)?.[1]) || 'overview';
  _tab = tabs.includes(hashTab) ? hashTab : 'overview';

  root.innerHTML = `
    <div class="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div id="c360-header" class="space-y-2"></div>
      <div class="flex gap-1 border-b border-slate-200 overflow-x-auto">
        ${tabs.map((t, i) => `<button data-c360-tab="${t}"
          class="px-4 py-2 text-xs font-medium whitespace-nowrap ${t === _tab ? 'text-blue-700 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}">${tabLabels[i]}</button>`).join('')}
      </div>
      <div id="c360-tab-content" class="bg-white rounded-xl border border-slate-200 min-h-[300px] overflow-auto"></div>
    </div>`;

  renderHeader(root);
  renderTabContent(root, _tab, quotations);

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-c360-tab]');
    if (!btn) return;
    _tab = btn.dataset.c360Tab;
    location.hash = location.hash.replace(/#tab=\w+/, '') + `#tab=${_tab}`;
    root.querySelectorAll('[data-c360-tab]').forEach((b) => {
      const active = b.dataset.c360Tab === _tab;
      b.className = `px-4 py-2 text-xs font-medium whitespace-nowrap ${active ? 'text-blue-700 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`;
    });
    renderTabContent(root, _tab, quotations);
  });

  _onEntity = async (e) => {
    const kind = e.detail?.kind;
    if (![KIND_CUSTOMER, KIND_SHIPMENT, KIND_BILLING, KIND_EXCEPTION].includes(kind)) return;
    if (repo) {
      [customers, _shipments, _billing, _exceptions] = await Promise.all([
        repo.list(KIND_CUSTOMER, null), repo.list(KIND_SHIPMENT, null),
        repo.list(KIND_BILLING, null),  repo.list(KIND_EXCEPTION, null),
      ]);
    }
    _vm = compose(customerId, customers, _shipments, _billing, _exceptions);
    renderHeader(root);
    renderTabContent(root, _tab, quotations);
  };
  window.addEventListener('vdg:entity-changed', _onEntity);
}
