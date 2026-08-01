// sales-me-due-soon.js — "sắp tới hạn thanh toán" list section for sales-me view (F-48-01
// tier 3/4 floor). Sibling to sales-me-overdue.js (deliberately non-overlapping: overdue.js
// is past-due, this is not-yet-due within the warn window). Reuses the SAME
// computeDueSoonRows() the badge/notification tick in due-soon-checker.js calls — no second
// copy of the date-window logic (AC-05d).
import { computeDueSoonRows } from '../sync/due-soon-checker.js';
import { t } from '../i18n/index.js';

function fmtVnd(n) {
  if (!n && n !== 0) return '—';
  return Number(n).toLocaleString('vi-VN');
}

export async function dueSoonHtml(salesId) {
  const rows = await computeDueSoonRows(salesId);
  if (!rows.length) return '';

  const rowsHtml = rows.map((r) => `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs">
      <td class="px-3 py-2">${r.customerId}</td>
      <td class="px-3 py-2">${r.dueDate}</td>
      <td class="px-3 py-2">${r.daysUntilDue}d</td>
      <td class="px-3 py-2">${fmtVnd(r.amountVnd)} VND</td>
    </tr>`).join('');

  return `
    <div class="bg-white rounded-xl border border-blue-200 p-5 mt-4">
      <div class="text-sm font-semibold text-blue-700 mb-3">
        ${t('due_soon.title')}
        <span class="ml-2 text-xs font-normal text-blue-500">${t('due_soon.count', { n: rows.length })}</span>
      </div>
      <div class="overflow-x-auto rounded-lg border border-slate-200">
        <table class="w-full min-w-[420px]">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">${t('due_soon.col.customer')}</th>
              <th class="px-3 py-2 text-left">${t('due_soon.col.due_date')}</th>
              <th class="px-3 py-2 text-left">${t('due_soon.col.days')}</th>
              <th class="px-3 py-2 text-left">${t('due_soon.col.amount')}</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>`;
}
