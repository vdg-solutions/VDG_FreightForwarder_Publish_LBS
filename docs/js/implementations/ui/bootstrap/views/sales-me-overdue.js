// sales-me-overdue.js — overdue follow-up section for sales-me view
// F-48-01: rewritten off billing.due_date (was invoice_date); dunning-ladder/dunning-log
// dependencies dropped along with the auto-dunning subsystem removal. Stage bucketing kept
// as a small local day-threshold classifier — display only, no template ladder, no
// per-customer override (dunning_threshold_days_override field removed).
import { t } from '../../../kernel/core_abstractions/i18n/index.js';

const STAGE_THRESHOLDS_DAYS = { reminder_1: 7, reminder_2: 14, escalate: 30, legal: 60, blacklist: 95 };
const STAGE_ORDER = ['reminder_1', 'reminder_2', 'escalate', 'legal', 'blacklist'];

function fmtVnd(n) {
  if (!n && n !== 0) return '—';
  return Number(n).toLocaleString('vi-VN');
}

function daysOverdue(dueDate, now) {
  if (!dueDate) return 0;
  return Math.floor((now - new Date(dueDate).getTime()) / 86_400_000);
}

function classifyStage(days) {
  let stage = null;
  for (const s of STAGE_ORDER) if (days >= STAGE_THRESHOLDS_DAYS[s]) stage = s;
  return stage;
}

export async function overdueFollowupsHtml(salesId) {
  const repo = window.__vdg_repo;
  if (!repo) return '';

  const [billing, customers] = await Promise.all([
    repo.list('billing', null).catch(() => []),
    repo.list('customers', null).catch(() => []),
  ]).catch(() => [[], []]);

  const custMap = new Map((customers || []).map((c) => [c.id, c]));
  const now     = Date.now();

  const byCustomer = new Map();
  for (const b of billing) {
    if (b.status === 'Paid' || b._deleted) continue;
    const rep = (b.sales_rep || '').toLowerCase();
    if (rep && rep !== salesId.toLowerCase()) continue;
    const due = b.due_date || b.DueDate;
    if (daysOverdue(due, now) <= 0) continue;
    const cid = b.customer_id || b.customer || '';
    if (!byCustomer.has(cid)) byCustomer.set(cid, []);
    byCustomer.get(cid).push(b);
  }

  const rows = [];
  for (const [cid, bs] of byCustomer) {
    const customer = custMap.get(cid) || { id: cid, name: cid };
    const maxDays = bs.reduce((max, b) => {
      const d = daysOverdue(b.due_date || b.DueDate, now);
      return d > max ? d : max;
    }, 0);
    const stage = classifyStage(maxDays);
    if (!stage) continue;
    const total = bs.reduce((s, b) => s + Number(b.amount_vnd ?? b.AmountVnd ?? 0), 0);
    rows.push({ cid, name: customer.name || cid, email: customer.email || '', stage, maxDays, total });
  }

  if (!rows.length) return '';

  const rowsHtml = rows.map((r) => `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs">
      <td class="px-3 py-2">${r.name}</td>
      <td class="px-3 py-2 font-mono text-amber-700">${t('sales_overdue.stage.' + r.stage)}</td>
      <td class="px-3 py-2">${r.maxDays}d</td>
      <td class="px-3 py-2">${fmtVnd(r.total)} VND</td>
      <td class="px-3 py-2">
        <button class="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] hover:bg-blue-100"
                data-send-reminder="${r.cid}"
                data-email="${r.email}">
          ${t('sales_overdue.send')}
        </button>
      </td>
    </tr>`).join('');

  return `
    <div class="bg-white rounded-xl border border-amber-200 p-5 mt-4">
      <div class="text-sm font-semibold text-amber-700 mb-3">
        ${t('sales_overdue.title')}
        <span class="ml-2 text-xs font-normal text-amber-500">${t('sales_overdue.count', { n: rows.length })}</span>
      </div>
      <div class="overflow-x-auto rounded-lg border border-slate-200">
        <table class="w-full min-w-[520px]">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">${t('sales_overdue.col.customer')}</th>
              <th class="px-3 py-2 text-left">${t('sales_overdue.col.stage')}</th>
              <th class="px-3 py-2 text-left">${t('sales_overdue.col.days')}</th>
              <th class="px-3 py-2 text-left">${t('sales_overdue.col.outstanding')}</th>
              <th class="px-3 py-2 w-28"></th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>`;
}

// Plain mailto — no template ladder, no dunning-log write.
export function sendSalesReminder(customerId, mailto) {
  window.open(`mailto:${mailto}?subject=${encodeURIComponent(t('sales_overdue.mail.subject'))}`, '_blank');
}
