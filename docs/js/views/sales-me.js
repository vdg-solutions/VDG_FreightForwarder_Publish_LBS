// F-12-09 — Sales personal workspace (daily driver)
// Identity: Google OAuth verified — no self-pick modal

import { currentSalesRepId, isManager } from '../auth/auth-gate.js';
import { overdueFollowupsHtml, sendSalesReminder } from './sales-me-overdue.js';
import { t } from '../i18n/index.js';
import { safeAwait } from '../util/safe-await.js';

const LOAD_TIMEOUT_MS = 12000;

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtVnd(n) {
  if (!n && n !== 0) return '—';
  return Number(n).toLocaleString('vi-VN');
}

function mtdFilter(s) {
  const now  = new Date();
  const year = now.getFullYear();
  const mo   = String(now.getMonth() + 1).padStart(2, '0');
  const pfx  = `${year}-${mo}`;
  const d    = s.etd || s.prep_date || s.date || '';
  return d.startsWith(pfx);
}

function roleBadgeHtml(salesId) {
  const isM  = isManager();
  const cls  = isM
    ? 'bg-purple-100 text-purple-700 border-purple-200'
    : 'bg-blue-100 text-blue-700 border-blue-200';
  const label = isM ? t('sales_me.role.manager') : salesId;
  return `<span class="ml-2 px-2 py-0.5 text-[10px] font-semibold rounded border ${cls}">${label}</span>`;
}

// ── KPI cards ─────────────────────────────────────────────────────────────────

function kpiCardsHtml(stats) {
  const cards = [
    { label: t('sales_me.kpi.shipments'), value: String(stats.shipments), tone: 'blue',  icon: 'ship',   delta: t('sales_me.kpi.delta.month') },
    { label: t('sales_me.kpi.revenue'),   value: fmtVnd(stats.revenue),   tone: 'green', icon: 'dollar', delta: t('sales_me.kpi.delta.vnd') },
    { label: t('sales_me.kpi.margin'),    value: fmtVnd(stats.margin),    tone: 'green', icon: 'dollar', delta: t('sales_me.kpi.delta.vnd') },
    { label: t('sales_me.kpi.ttcn'),      value: fmtVnd(stats.customerRebate),      tone: 'amber', icon: 'dollar', delta: t('sales_me.kpi.delta.vnd') },
  ];
  return `<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    ${cards.map((c) => `
      <kpi-card label="${c.label}" value="${c.value}" delta="${c.delta}" tone="${c.tone}" icon="${c.icon}"></kpi-card>
    `).join('')}
  </div>`;
}

// ── shipment grid ─────────────────────────────────────────────────────────────

function publishBadgeHtml(s) {
  if (s.publish_state === 'draft') {
    return `<span class="ml-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-800">${t('sales_new.badge.draft')}</span>`;
  }
  return '';
}

function shipmentRowHtml(s) {
  const margin   = Number(s.margin || 0);
  const posCls   = margin >= 0 ? 'text-emerald-700' : 'text-red-600';
  const stateCls = 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700';
  const ref = s.shipment_ref || s.ref;
  const editHref   = `#/sales/edit/${encodeURIComponent(ref || '')}`;
  const budgetHref = `#/shipment/${encodeURIComponent(ref || '')}/budget`;
  return `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs">
      <td class="px-3 py-2 font-mono">
        <a href="${editHref}" class="text-blue-600 hover:underline">${ref || '—'}</a>${publishBadgeHtml(s)}
      </td>
      <td class="px-3 py-2">${s.customer || '—'}</td>
      <td class="px-3 py-2 font-mono">${s.pol || '—'} → ${s.pod || '—'}</td>
      <td class="px-3 py-2">${s.etd || '—'}</td>
      <td class="px-3 py-2"><span class="${stateCls}">${s.state || s.status || '—'}</span></td>
      <td class="px-3 py-2 text-right font-semibold ${posCls}">${fmtVnd(margin)}</td>
      <td class="px-3 py-2">
        <a href="${budgetHref}" class="text-xs text-slate-500 hover:text-blue-600" title="${t('sales_me.grid.print_budget')}">⎙</a>
      </td>
    </tr>`;
}

function shipmentTableHtml(shipments, emptyMsg) {
  if (!shipments.length) {
    return `<div class="text-xs text-slate-400 py-4 text-center">${emptyMsg}</div>`;
  }
  return `
    <div class="overflow-x-auto rounded-lg border border-slate-200">
      <table class="w-full min-w-[640px]">
        <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-3 py-2 text-left">${t('sales_me.grid.ref')}</th>
            <th class="px-3 py-2 text-left">${t('sales_me.grid.customer')}</th>
            <th class="px-3 py-2 text-left">${t('sales_me.grid.route')}</th>
            <th class="px-3 py-2 text-left">${t('sales_me.grid.etd')}</th>
            <th class="px-3 py-2 text-left">${t('sales_me.grid.state')}</th>
            <th class="px-3 py-2 text-right">${t('sales_me.grid.margin_vnd')}</th>
            <th class="px-3 py-2 w-8"></th>
          </tr>
        </thead>
        <tbody>${shipments.map(shipmentRowHtml).join('')}</tbody>
      </table>
    </div>`;
}

// ── commission section ────────────────────────────────────────────────────────

function commissionHtml(stats) {
  const gross  = stats.salesCommission;
  const net    = gross - stats.advances;
  const netCls = net >= 0 ? 'text-emerald-700' : 'text-red-600';
  const now    = new Date();
  const mo     = String(now.getMonth() + 1).padStart(2, '0');
  const year   = now.getFullYear();
  const monthStr = `(Tháng ${mo}/${year})`;
  return `
    <div class="bg-white rounded-xl border border-slate-200 p-5">
      <div class="text-sm font-semibold text-slate-900 mb-3">${t('sales_me.commission.title').replace('(MTD)', monthStr)}</div>
      <dl class="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
        <div>
          <dt class="text-slate-400">${t('sales_me.commission.margin_total')}</dt>
          <dd class="font-medium text-slate-900">${fmtVnd(stats.margin)} VND</dd>
        </div>
        <div>
          <dt class="text-slate-400">${t('sales_me.commission.sales_share')}</dt>
          <dd class="font-semibold text-emerald-700">${fmtVnd(gross)} VND</dd>
        </div>
        <div>
          <dt class="text-slate-400">${t('sales_me.commission.advances')}</dt>
          <dd class="font-medium text-slate-900">${fmtVnd(stats.advances)} VND</dd>
        </div>
        <div>
          <dt class="text-slate-400">${t('sales_me.commission.net_payable')}</dt>
          <dd class="font-semibold ${netCls}">${fmtVnd(net)} VND</dd>
        </div>
      </dl>
      <div class="mt-3 text-[10px] text-slate-400">${t('sales_me.commission.rate_note')}</div>
    </div>`;
}

// ── data aggregation ──────────────────────────────────────────────────────────

const EMPTY_DATA = { all: [], mtd: [], pending: [], stats: { shipments: 0, revenue: 0, margin: 0, salesCommission: 0, advances: 0 } };

async function loadMyData(salesId) {
  const repo = window.__vdg_repo;
  if (!repo) return EMPTY_DATA;

  const [allShipments, allLines, allCashFlows, allCommEntries] = await Promise.all([
    repo.list('shipment', (s) => (s.sales_rep || '').toLowerCase() === salesId.toLowerCase()),
    repo.list('pnl_line').catch(() => []),
    repo.list('cash_flow_entry').catch(() => []),
    repo.list('commission_entry').catch(() => []),
  ]);

  const mtd = allShipments.filter(mtdFilter);
  const mtdRefs = new Set(mtd.map(s => s.shipment_ref || s.ref));

  // SalesShare commission MTD (from commission_entry persisted by WASM engine)
  const salesCommission = allCommEntries
    .filter(e => e.kind === 'SalesShare' && mtdRefs.has(e.shipment_ref))
    .reduce((s, e) => s + Number(e.net_amount?.amount ?? e.net_amount ?? 0), 0);

  const linesByRef = {};
  for (const l of allLines) {
    const r = l.shipment_ref;
    if (!linesByRef[r]) linesByRef[r] = [];
    linesByRef[r].push(l);
  }

  const pending = allShipments.filter((s) => {
    const ref   = s.shipment_ref || s.ref;
    const lines = linesByRef[ref] || [];
    return !lines.some((l) => Number(l.sell_amt || l.selling_vnd_collect || 0) > 0);
  });

  let revenue = 0, margin = 0;
  for (const s of mtd) {
    const ref   = s.shipment_ref || s.ref;
    const lines = linesByRef[ref] || [];
    for (const l of lines) {
      revenue += Number(l.sell_amt || l.selling_vnd_collect || 0);
      margin  += Number(l.sell_amt || l.selling_vnd_collect || 0)
               - Number(l.buy_amt  || l.buying_vnd_pay      || 0);
    }
  }

  // F-20-03: advances from CashFlowEntry source=salesId MTD
  const advances = allCashFlows
    .filter((c) => (c.source || '').toLowerCase() === salesId.toLowerCase() && mtdFilter(c))
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);

  for (const s of allShipments) {
    const ref   = s.shipment_ref || s.ref;
    const lines = linesByRef[ref] || [];
    s.margin = lines.reduce((acc, l) =>
      acc + (Number(l.sell_amt || l.selling_vnd_collect || 0))
          - (Number(l.buy_amt  || l.buying_vnd_pay      || 0)), 0);
  }

  return {
    all:   allShipments,
    mtd,
    pending,
    stats: { shipments: mtd.length, revenue, margin, salesCommission, advances },
  };
}

// ── entry point ───────────────────────────────────────────────────────────────

export async function render(root) {
  const user    = window.__vdg_auth?.getCurrentUser?.();
  const salesId = currentSalesRepId();

  if (!user || !salesId) {
    root.innerHTML = `<div class="p-6 text-red-600 text-sm">${t('sales_me.not_authenticated')}</div>`;
    return;
  }

  root.innerHTML = `
    <div class="p-6 max-w-[1200px] mx-auto">
      <div class="text-lg font-semibold text-slate-900">
        ${t('sales_me.title')} — ${user.name || salesId}${roleBadgeHtml(salesId)}
      </div>
      <div id="me-loading" class="text-xs text-slate-500 mt-2">${t('loading')}</div>
      <div id="me-body" class="hidden"></div>
    </div>`;

  await populateView(root, salesId, user);
}

async function populateView(root, salesId, user) {
  const loadingEl = root.querySelector('#me-loading');
  const bodyEl    = root.querySelector('#me-body');

  const { ok, value: data, error } = await safeAwait(
    loadMyData(salesId),
    LOAD_TIMEOUT_MS,
    () => {},
    'sales-me:loadMyData',
  );

  if (!ok) {
    console.warn('[sales-me] load failed:', error?.message); // DEV
    if (loadingEl) {
      const msg = t('sales_me.load_failed').replace('{s}', String(LOAD_TIMEOUT_MS / 1000));
      loadingEl.innerHTML = `<span class="text-amber-700">${msg}</span>
        <button id="me-retry" class="ml-2 underline text-blue-600">${t('sales_me.retry')}</button>`;
      loadingEl.querySelector('#me-retry')?.addEventListener('click', () => populateView(root, salesId, user));
    }
    return;
  }

  const { all, pending, stats } = data;
  const activeShipments = all.filter((s) =>
    !['Closed', 'Delivered'].includes(s.state || s.status || '')
  );

  const emptyActive = `${t('sales_me.empty_active')} <a href="#/sales/me/pnl/new" class="text-blue-500 hover:underline">${t('sales_me.quick_add')}</a>`;

  if (bodyEl) {
    bodyEl.innerHTML = `
      <div class="mt-1 mb-4 flex items-center justify-between">
        <div class="text-xs text-slate-500">
          ${t('sales_me.signed_in_as')} <span class="font-semibold text-slate-800">${user.email}</span>
        </div>
        <a href="#/sales/me/pnl/new?sales=${encodeURIComponent(salesId)}"
          class="px-4 py-2 bg-blue-600 text-white text-xs rounded-lg font-semibold hover:bg-blue-700 transition">
          ${t('sales_me.quick_add')}
        </a>
      </div>

      ${kpiCardsHtml(stats)}

      <div class="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <div class="text-sm font-semibold text-slate-900 mb-3">
          ${t('sales_me.active_shipments')}
          <span class="ml-2 text-xs font-normal text-slate-400">${t('sales_me.total_suffix').replace('{n}', activeShipments.length)}</span>
        </div>
        ${shipmentTableHtml(activeShipments, emptyActive)}
      </div>

      <div class="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <div class="text-sm font-semibold text-slate-900 mb-3">
          ${t('sales_me.pending_pnl')}
          ${pending.length === 0 
            ? `<span class="ml-2 text-xs font-normal text-emerald-600">${t('sales_me.pending_zero')}</span>`
            : `<span class="ml-2 text-xs font-normal text-amber-600">${t('sales_me.pending_suffix').replace('{n}', pending.length)}</span>`
          }
        </div>
        ${shipmentTableHtml(pending, t('sales_me.empty_pending'))}
        ${pending.length ? `<div class="mt-2 text-[11px] text-amber-700">${t('sales_me.pending_hint')}</div>` : ''}
      </div>

      ${commissionHtml(stats)}

      ${await overdueFollowupsHtml(salesId)}`;

    bodyEl.classList.remove('hidden');
  }

  if (loadingEl) loadingEl.textContent = '';

  root.querySelector('#me-body')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-send-reminder]');
    if (!btn) return;
    const cid    = btn.dataset.sendReminder;
    const mailto = btn.dataset.email || '';
    const stage  = btn.dataset.stage || 'reminder_1';
    sendSalesReminder(cid, mailto, stage, 'vi', []);
  });
}
