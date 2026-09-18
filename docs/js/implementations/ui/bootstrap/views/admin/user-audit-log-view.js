// Admin User Audit Log view — F-24-06. Manager-only /admin/users/audit-log: read-only table of the
// user/role compliance trail, with a date-range filter + CSV export.
//
// The view holds NO rows. It names a range; wasm reads the trail, narrows it, orders it and answers
// with the slice plus the trail's own size. It used to hold the whole trail in `_allRecords` and
// hand it back in for the filter, the order and the export.

import { t, currentLocale, fmtStamp } from '../../../../kernel/core_abstractions/i18n/index.js';
import { mountDateHints } from '../../util/date-input-hint.js';
import { auditLogRows, auditLogCsv } from '../../../core_abstractions/ports/manager/user-audit-log-composer.js';
import { todayLocal } from '../../../../kernel/core_abstractions/util/today-local.js';

const REVOKE_URL_MS = 5_000;

let _range = { from: '', to: '' };

function shellHtml() {
  return `
    <div class="p-6 max-w-[1600px] mx-auto space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="text-lg font-semibold text-slate-900">${t('admin.users.audit_log.title')}</div>
        <button id="btn-export-audit-csv" class="px-3 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
          ${t('admin.users.audit_log.export_button')}
        </button>
      </div>
      <div class="flex gap-3 flex-wrap bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
        <input id="aud-from" type="date" lang="${currentLocale()}" class="border border-slate-300 rounded px-2 py-1 text-xs" aria-label="${t('admin.users.audit_log.filter.date_from')}">
        <input id="aud-to"   type="date" lang="${currentLocale()}" class="border border-slate-300 rounded px-2 py-1 text-xs" aria-label="${t('admin.users.audit_log.filter.date_to')}">
        <span id="aud-count" class="text-xs text-slate-400 self-center"></span>
      </div>
      <div id="aud-table-wrap"></div>
    </div>`;
}

function renderTable(container, rows) {
  if (!rows.length) {
    container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400 border border-slate-200 rounded-lg">—</div>`;
    return;
  }

  const trs = rows.map((r) => {
    const rawAction = r.action || '';
    const localizedAction = rawAction ? t(`admin.users.audit_log.action.${rawAction}`) : '';
    // fallback if missing
    const displayAction = localizedAction.startsWith('admin.users') ? rawAction : localizedAction;

    return `
    <tr class="border-t border-slate-100 text-xs align-top">
      <td class="px-3 py-2 whitespace-nowrap">${fmtStamp(r.ts)}</td>
      <td class="px-3 py-2">${r.actor_email || ''}</td>
      <td class="px-3 py-2">${displayAction}</td>
      <td class="px-3 py-2">${r.target_email || ''}</td>
      <td class="px-3 py-2 font-mono text-[11px] text-slate-500 max-w-[420px] break-words">
        ${JSON.stringify(r.before ?? null)} &rarr; ${JSON.stringify(r.after ?? null)}
      </td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <table class="w-full border border-slate-200 rounded-lg overflow-hidden">
      <thead class="bg-slate-50 text-[11px] text-slate-500 uppercase">
        <tr>
          <th class="px-3 py-2 text-left">${t('admin.users.audit_log.column.timestamp')}</th>
          <th class="px-3 py-2 text-left">${t('admin.users.audit_log.column.actor')}</th>
          <th class="px-3 py-2 text-left">${t('admin.users.audit_log.column.action')}</th>
          <th class="px-3 py-2 text-left">${t('admin.users.audit_log.column.target')}</th>
          <th class="px-3 py-2 text-left">${t('admin.users.audit_log.column.details')}</th>
        </tr>
      </thead>
      <tbody>${trs}</tbody>
    </table>`;
}

async function applyAndRender(root) {
  const reply = await auditLogRows(_range);
  const rows  = reply.ok ? reply.records : [];
  renderTable(root.querySelector('#aud-table-wrap'), rows);
  const countEl = root.querySelector('#aud-count');
  // An unreadable trail says so. Rendering it as `0 / 0` reads as "nobody has touched an account",
  // which is the one answer a compliance screen must never give when it did not run.
  if (countEl) countEl.textContent = reply.ok ? `${rows.length} / ${reply.total}` : t('admin.users.audit_log.read_failed');
}

async function handleExportCsv() {
  const reply = await auditLogCsv(_range);
  if (!reply.ok) {
    window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type: 'error', message: t('admin.users.audit_log.read_failed') } }));
    return;
  }
  const blob = new Blob([reply.csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `vdg-user-audit-log-${todayLocal()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_URL_MS);
}

export async function render(root) {
  _range = { from: '', to: '' };
  root.innerHTML = shellHtml();
  mountDateHints(root);

  await applyAndRender(root);

  root.querySelector('#aud-from')?.addEventListener('change', (e) => {
    _range.from = e.target.value;
    applyAndRender(root);
  });
  root.querySelector('#aud-to')?.addEventListener('change', (e) => {
    _range.to = e.target.value;
    applyAndRender(root);
  });
  root.querySelector('#btn-export-audit-csv')?.addEventListener('click', handleExportCsv);
}
