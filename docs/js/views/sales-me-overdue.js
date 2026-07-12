// sales-me-overdue.js — overdue follow-up section for sales-me view
import { classifyOverdue } from '../operators/manager/dunning-ladder.js';
import { pickTemplate, mergeFields } from '../operators/manager/dunning-ladder.js';
import { appendDunning } from '../sync/dunning-log.js';

function fmtVnd(n) {
  if (!n && n !== 0) return '—';
  return Number(n).toLocaleString('vi-VN');
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
    const cid = b.customer_id || b.customer || '';
    if (!byCustomer.has(cid)) byCustomer.set(cid, []);
    byCustomer.get(cid).push(b);
  }

  const rows = [];
  for (const [cid, bs] of byCustomer) {
    const customer = custMap.get(cid) || { id: cid, name: cid };
    const override = customer.dunning_threshold_days_override
      ? { reminder_1: customer.dunning_threshold_days_override }
      : null;
    const maxDays = bs.reduce((max, b) => {
      const inv = b.invoice_date || b.InvoiceDate;
      if (!inv) return max;
      const d = Math.floor((now - new Date(inv).getTime()) / 86_400_000);
      return d > max ? d : max;
    }, 0);
    const stage = classifyOverdue(maxDays, override);
    if (!stage) continue;
    const total = bs.reduce((s, b) => s + Number(b.amount_vnd ?? b.AmountVnd ?? 0), 0);
    rows.push({ cid, name: customer.name || cid, email: customer.email || '', stage, maxDays, total });
  }

  if (!rows.length) return '';

  const rowsHtml = rows.map((r) => `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs">
      <td class="px-3 py-2">${r.name}</td>
      <td class="px-3 py-2 font-mono text-amber-700">${r.stage}</td>
      <td class="px-3 py-2">${r.maxDays}d</td>
      <td class="px-3 py-2">${fmtVnd(r.total)} VND</td>
      <td class="px-3 py-2">
        <button class="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] hover:bg-blue-100"
                data-send-reminder="${r.cid}"
                data-email="${r.email}"
                data-stage="${r.stage}">
          Send reminder
        </button>
      </td>
    </tr>`).join('');

  return `
    <div class="bg-white rounded-xl border border-amber-200 p-5 mt-4">
      <div class="text-sm font-semibold text-amber-700 mb-3">
        Overdue Follow-ups
        <span class="ml-2 text-xs font-normal text-amber-500">${rows.length} customers need action</span>
      </div>
      <div class="overflow-x-auto rounded-lg border border-slate-200">
        <table class="w-full min-w-[520px]">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">Customer</th>
              <th class="px-3 py-2 text-left">Stage</th>
              <th class="px-3 py-2 text-left">Days</th>
              <th class="px-3 py-2 text-left">Outstanding</th>
              <th class="px-3 py-2 w-28"></th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>`;
}

export function sendSalesReminder(customerId, mailto, stage, locale, billingIds) {
  const tmpl   = pickTemplate(stage, locale, []);
  const merged = mergeFields(tmpl, { name: customerId }, []);
  const subj   = encodeURIComponent(merged.subject);
  const body   = encodeURIComponent(merged.body);
  window.open(`mailto:${mailto}?subject=${subj}&body=${body}`, '_blank');

  const user = window.__vdg_auth?.getCurrentUser?.();
  appendDunning({
    customer_id: customerId,
    stage,
    sent_at:     new Date().toISOString(),
    channel:     'mailto',
    sent_by:     user?.email || 'sales',
    template_id: '',
    billing_ids: billingIds,
  });
}
