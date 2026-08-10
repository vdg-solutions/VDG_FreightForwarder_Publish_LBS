// The two overlays the topbar owns but is not about: the account dropdown and the
// service-worker update banner.
//
// Split out of topbar.js at the 350-line cap (backlog/wiki/file-size-doctrine.md). The seam is
// that neither is part of the bar — one hangs below it, one sits above the whole page — and
// neither reads any topbar state beyond what it is handed. They are plain functions rather than
// methods for exactly that reason: passing `host` in makes the dependency on the component
// visible instead of implicit through `this`.

import { html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';
import { t } from '../i18n/index.js';
import { hasRole, ROLE_MANAGER } from '../auth/auth-gate.js';
import { navigate } from '../router.js';

/// `host` is the vdg-topbar element — it owns `_menuOpen`, the file input, and the sign-out
/// handler. Returns an empty template when closed so the caller can interpolate unconditionally.
export function renderUserMenu(host, user, salesId) {
  if (!host._menuOpen) return html``;
  const roleLabel = hasRole(ROLE_MANAGER) ? t('topbar.role.manager') : (salesId || t('topbar.role.sales'));
  return html`
    <div class="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 z-50 py-1"
         @click="${(e) => e.stopPropagation()}">
      <div class="px-4 py-3 border-b border-slate-100">
        <div class="text-xs font-semibold text-slate-900 truncate">${user?.name || '—'}</div>
        <div class="text-[11px] text-slate-500 truncate mt-0.5">${user?.email || ''}</div>
        <div class="mt-1.5 inline-flex px-2 py-0.5 rounded text-[10px] font-medium
                    ${hasRole(ROLE_MANAGER) ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
          ${roleLabel}
        </div>
      </div>
      <button @click="${() => { host._menuOpen = false; navigate('/background-jobs'); }}"
        class="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition flex items-center gap-2">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>
        </svg>
        ${t('bg_jobs.title')}
      </button>

      <button @click="${() => host.querySelector('#data-upload')?.click()}"
        class="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition flex items-center gap-2">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        ${t('topbar.import.menu')}
      </button>
      <input type="file" id="data-upload" accept=".json" class="hidden" @change="${host._handleFileUpload}">

      <button @click="${host._handleSignOut}" data-testid="topbar-signout"
        class="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition flex items-center gap-2 border-t border-slate-100">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        ${t('sign_out')}
      </button>
    </div>`;
}

/// Above the page, not inside the bar — a deploy landed and this client is still on the old code.
export function renderSwBanner(host) {
  if (!host._swUpdate) return html``;
  return html`
    <div class="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white text-xs flex items-center justify-between px-4 py-2">
      <span>${t('topbar.sw_update_body')}</span>
      <div class="flex gap-2">
        <button @click="${host._handleReloadForUpdate}"
                class="px-3 py-1 bg-white text-blue-700 rounded font-medium hover:bg-blue-50">${t('topbar.sw_update_action')}</button>
        <button @click="${host._dismissSwBanner}" class="px-2 py-1 text-blue-100 hover:text-white">✕</button>
      </div>
    </div>`;
}
