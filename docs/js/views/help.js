// F-33-01 — In-app user guide, 3 role pages (manager / accountant / sales)

import { isManager } from '../auth/auth-gate.js';
import { currentUserRole, ROLE_MANAGER, ROLE_ACCOUNTANT, ROLE_SALES_REP } from '../operators/manager/route-guard.js';
import { t } from '../i18n/index.js';
import { mdToHtml } from './help-md.js';

const TABS = ['manager', 'accountant', 'sales'];

const TAB_DOC = {
  manager:    '/docs/onboarding/guide-manager.md',
  accountant: '/docs/onboarding/guide-accountant.md',
  sales:      '/docs/onboarding/guide-sales.md',
};

const TAB_LABEL_KEY = {
  manager:    'help.tab.manager',
  accountant: 'help.tab.accountant',
  sales:      'help.tab.sales',
};

const TAB_ACTIVE_CLASSES   = ['border-blue-600', 'text-blue-700'];
const TAB_INACTIVE_CLASSES = ['border-transparent', 'text-slate-500', 'hover:text-slate-700'];
const TAB_STATE_CLASSES_RE = /border-blue-600 text-blue-700|border-transparent text-slate-500 hover:text-slate-700/g;

// role-correct default: isManager() (Drive-ACL role) wins first, then the boot-snapshot role
// (currentUserRole()) — Accountant/SalesRep/anything else falls back to sales.
function resolveDefaultTab() {
  if (isManager()) return 'manager';
  const role = currentUserRole();
  if (role === ROLE_MANAGER) return 'manager';
  if (role === ROLE_ACCOUNTANT) return 'accountant';
  if (role === ROLE_SALES_REP) return 'sales';
  return 'sales';
}

// ── fetch doc ─────────────────────────────────────────────────────────────────

async function fetchDoc(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return `_Could not load ${url} (${res.status})_`;
    return res.text();
  } catch (err) {
    return `_Error loading doc: ${err.message}_`;
  }
}

// ── entry point ───────────────────────────────────────────────────────────────

export async function render(root) {
  const activeTab = resolveDefaultTab();

  const tabsHtml = TABS.map((tab) => `
        <button id="tab-${tab}"
                class="tab-btn px-4 py-2 text-sm font-medium border-b-2 transition
                       ${tab === activeTab ? TAB_ACTIVE_CLASSES.join(' ') : TAB_INACTIVE_CLASSES.join(' ')}">
          ${t(TAB_LABEL_KEY[tab])}
        </button>`).join('');

  root.innerHTML = `
    <div class="p-6 max-w-3xl mx-auto">
      <div class="text-lg font-semibold text-slate-900 mb-4">${t('help.page_title')}</div>

      <div class="flex gap-1 border-b border-slate-200 mb-6">${tabsHtml}</div>

      <div id="doc-content" class="bg-white rounded-xl border border-slate-200 p-6 min-h-[300px]">
        <div class="text-xs text-slate-400">${t('loading')}</div>
      </div>
    </div>`;

  const contentEl = root.querySelector('#doc-content');
  const tabEls    = Object.fromEntries(TABS.map((tab) => [tab, root.querySelector(`#tab-${tab}`)]));

  const _cache = {};

  async function showTab(tab) {
    for (const other of TABS) {
      const el = tabEls[other];
      el.className = el.className.replace(TAB_STATE_CLASSES_RE, '');
      el.classList.add(...(other === tab ? TAB_ACTIVE_CLASSES : TAB_INACTIVE_CLASSES));
    }

    if (!_cache[tab]) {
      contentEl.innerHTML = `<div class="text-xs text-slate-400">${t('loading')}</div>`;
      const md = await fetchDoc(TAB_DOC[tab]);
      _cache[tab] = mdToHtml(md);
    }
    contentEl.innerHTML = _cache[tab];
  }

  for (const tab of TABS) tabEls[tab].addEventListener('click', () => showTab(tab));

  await showTab(activeTab);
}
