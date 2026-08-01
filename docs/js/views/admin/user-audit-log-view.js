// Admin User Audit Log view — F-24-06. Manager-only /admin/users/audit-log: read-only table of
// admin/user-audit-log.jsonl with date-range filter + CSV export. Wired to UserAuditLog (F-24-06
// sync/user-audit-log.js), same DI-off-window convention as users-view.js.

import { isManager } from '../../auth/auth-gate.js';
import { navigate }  from '../../router.js';
import { t }         from '../../i18n/index.js';
import { filterByDateRange, sortByTimestampDesc, buildAuditLogCsv } from '../../operators/manager/user-audit-log-composer.js';

function getUserAuditLog() { return window.__vdg_user_audit_log; }

let _allRecords = [];
let _range      = { from: '', to: '' };

function shellHtml() {
  return `
    <div class="p-6 max-w-[1400px] mx-auto space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="text-lg font-semibold text-slate-900">${t('admin.users.audit_log.title')}</div>
        <button id="btn-export-audit-csv" class="px-3 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
          ${t('admin.users.audit_log.export_button')}
        </button>
      </div>
      <div class="flex gap-3 flex-wrap bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
        <input id="aud-from" type="date" class="border border-slate-300 rounded px-2 py-1 text-xs" aria-label="${t('admin.users.audit_log.filter.date_from')}">
        <input id="aud-to"   type="date" class="border border-slate-300 rounded px-2 py-1 text-xs" aria-label="${t('admin.users.audit_log.filter.date_to')}">
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
      <td class="px-3 py-2 whitespace-nowrap">${(r.ts || '').replace('T', ' ').slice(0, 19)}</td>
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

function applyAndRender(root) {
  const rows = sortByTimestampDesc(filterByDateRange(_allRecords, _range));
  renderTable(root.querySelector('#aud-table-wrap'), rows);
  const countEl = root.querySelector('#aud-count');
  if (countEl) countEl.textContent = `${rows.length} / ${_allRecords.length}`;
}

function handleExportCsv() {
  const rows = sortByTimestampDesc(filterByDateRange(_allRecords, _range));
  const csv  = buildAuditLogCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `vdg-user-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

export async function render(root) {
  if (!isManager()) { navigate('/dashboard'); return; }

  _range = { from: '', to: '' };
  root.innerHTML = shellHtml();

  const log = getUserAuditLog();
  _allRecords = log ? await log.readAll().catch(() => []) : [];
  applyAndRender(root);

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
