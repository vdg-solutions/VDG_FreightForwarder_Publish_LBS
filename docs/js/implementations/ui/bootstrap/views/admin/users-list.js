// users-list.js — table + filter bar rendering for the admin Users view (F-24-04).
// Pure DOM rendering, no repo/Drive calls — users-view.js owns state + wiring.
// F-46-03/E-37: GET /api/users answers {email, display_name, roles, active} — `active` is derived
// server-side from `roles` being non-empty (never a stored bit of its own), so this view renders
// it as a status badge + a muted row, and the filter bar's status dropdown is the same
// active/inactive/all vocabulary `manager_users_filter` (wasm) already spoke before this screen
// had any inactive rows to show it.

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { ROLE_VALUES, ROLE_LABEL_KEYS } from '../../../core_abstractions/ports/manager/users-view-composer.js';

const SKELETON_ROWS = 4;
const STATUS_FILTER_ACTIVE = 'active';
const STATUS_FILTER_INACTIVE = 'inactive';

function roleLabel(role) { return t(ROLE_LABEL_KEYS[role] || role); }

// #24: the full role SET rides in the cell — the store projects one `roles` array (there is no
// extra_roles field), so the primary reads as text and every further role as a badge.
function roleCell(user) {
  const [primary, ...rest] = (Array.isArray(user.roles) ? user.roles : []).filter(Boolean);
  if (!primary) return '—';
  return roleLabel(primary) + rest
    .map((r) => `<span class="ml-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px]">${roleLabel(r)}</span>`)
    .join('');
}

function statusCell(user) {
  return user.active
    ? `<span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px]">${t('admin.users.status.active')}</span>`
    : `<span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">${t('admin.users.status.inactive')}</span>`;
}

export function filterBarHtml(filter) {
  const roleOptions = ROLE_VALUES.map((r) => `<option value="${r}" ${filter.role === r ? 'selected' : ''}>${roleLabel(r)}</option>`).join('');
  return `
    <div class="flex gap-3 flex-wrap">
      <input id="usr-search" placeholder="${t('admin.users.filter.search_placeholder')}" value="${filter.search}"
             class="border rounded-lg px-3 py-1.5 text-xs w-56 text-slate-700" />
      <select id="usr-role" class="border rounded-lg px-3 py-1.5 text-xs text-slate-700">
        <option value="">${t('admin.users.filter.role_all')}</option>
        ${roleOptions}
      </select>
      <select id="usr-status" class="border rounded-lg px-3 py-1.5 text-xs text-slate-700">
        <option value="" ${filter.activeFilter === '' ? 'selected' : ''}>${t('admin.users.filter.active_all')}</option>
        <option value="${STATUS_FILTER_ACTIVE}" ${filter.activeFilter === STATUS_FILTER_ACTIVE ? 'selected' : ''}>${t('admin.users.status.active')}</option>
        <option value="${STATUS_FILTER_INACTIVE}" ${filter.activeFilter === STATUS_FILTER_INACTIVE ? 'selected' : ''}>${t('admin.users.status.inactive')}</option>
      </select>
      <span id="usr-count" class="text-xs text-slate-400 self-center"></span>
    </div>`;
}

/// #26: shown while the GET /api/users round trip is in flight, so the grid never reads as an
/// empty workspace mid-load.
export function renderUsersSkeleton(container) {
  if (!container) return;
  container.innerHTML = `
    <div aria-busy="true" aria-live="polite" aria-label="${t('admin.users.loading')}">
      <div class="h-10 bg-slate-200 animate-pulse rounded-t-lg"></div>
      ${Array.from({ length: SKELETON_ROWS }, () => '<div class="h-9 mt-px bg-slate-100 animate-pulse"></div>').join('')}
      <div class="h-9 mt-px bg-slate-100 animate-pulse rounded-b-lg"></div>
    </div>`;
}

export function renderUsersTable(container, users) {
  if (!users.length) {
    container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400 border border-slate-200 rounded-lg">—</div>`;
    return;
  }

  const rows = users.map((u) => `
    <tr class="border-t border-slate-100 text-xs ${u.active ? '' : 'opacity-60'}" data-user-email="${u.email}">
      <td class="px-3 py-2">${u.email}</td>
      <td class="px-3 py-2">${u.display_name || ''}</td>
      <td class="px-3 py-2">${roleCell(u)}</td>
      <td class="px-3 py-2">${statusCell(u)}</td>
      <td class="px-3 py-2">
        <div class="flex gap-1">
          ${u.active ? `
            <button data-act="edit" class="px-2 py-0.5 text-[11px] rounded bg-slate-50 text-slate-700 hover:bg-slate-100">${t('admin.users.action.edit')}</button>
            <button data-act="deactivate" class="px-2 py-0.5 text-[11px] rounded bg-red-50 text-red-700 hover:bg-red-100">${t('admin.users.action.deactivate')}</button>
          ` : `
            <button data-act="reactivate" class="px-2 py-0.5 text-[11px] rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100">${t('admin.users.action.reactivate')}</button>
          `}
        </div>
      </td>
    </tr>`).join('');

  container.innerHTML = `
    <table class="w-full border border-slate-200 rounded-lg overflow-hidden">
      <thead class="bg-slate-50 text-[11px] text-slate-500 uppercase">
        <tr>
          <th class="px-3 py-2 text-left">${t('admin.users.column.email')}</th>
          <th class="px-3 py-2 text-left">${t('admin.users.column.display_name')}</th>
          <th class="px-3 py-2 text-left">${t('admin.users.column.role')}</th>
          <th class="px-3 py-2 text-left">${t('admin.users.column.active')}</th>
          <th class="px-3 py-2 text-left">${t('admin.users.column.actions')}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/// Delegated click handling — handlers = { onEdit(user), onDeactivate(user), onReactivate(user) }.
export function bindRowActions(container, users, handlers) {
  container.querySelectorAll('tr[data-user-email]').forEach((tr) => {
    const user = users.find((u) => u.email === tr.dataset.userEmail);
    if (!user) return;
    tr.querySelector('[data-act="edit"]')?.addEventListener('click', () => handlers.onEdit(user));
    tr.querySelector('[data-act="deactivate"]')?.addEventListener('click', () => handlers.onDeactivate(user));
    tr.querySelector('[data-act="reactivate"]')?.addEventListener('click', () => handlers.onReactivate(user));
  });
}
