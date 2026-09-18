// not-found.js — what an unknown hash resolves to.
//
// It used to resolve to the role's home view with the URL left untouched, so `#/admin/audit`
// painted the dashboard and said nothing anywhere: the address bar claimed one screen, the page
// showed another, and a wrong guess at a route was indistinguishable from a working one.

import { t } from '../../../kernel/core_abstractions/i18n/index.js';
import { navigate } from '../router.js';
import { currentUserRole, currentUserRoles, normalizeRole, homeRouteForRole } from '../../core_abstractions/ports/governance/route-guard.js';

function homeRoute() {
  const roles = currentUserRoles();
  return homeRouteForRole(roles.length ? roles : [normalizeRole(currentUserRole())]);
}

export function render(root, route = '') {
  root.innerHTML = `
    <div class="flex flex-col items-center justify-center gap-4 py-24 px-6 text-center">
      <div class="text-sm font-semibold text-slate-700">${t('route.not_found.title')}</div>
      <p class="text-xs text-slate-400 max-w-sm leading-relaxed">${t('route.not_found.body')}</p>
      <code class="text-[11px] font-mono text-slate-500 bg-slate-100 rounded px-2 py-1">#${route}</code>
      <button type="button" id="btn-not-found-home"
        class="px-4 py-2 text-xs font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors">
        ${t('route.not_found.go_home')}
      </button>
    </div>`;
  root.querySelector('#btn-not-found-home')?.addEventListener('click', () => navigate(homeRoute()));
}
