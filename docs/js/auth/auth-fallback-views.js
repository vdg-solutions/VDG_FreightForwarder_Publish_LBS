// F-15-19 AC-4 — Fallback views for auth failure modes.
// Used when the Drive role probe times out or the user has no workspace membership.
// Extracted from app.js so the loading-hang recovery path can dynamic-import safely.

import { t } from '../i18n/index.js';

export function renderLoadingBanner(mount) {
  if (!mount) return;
  mount.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="text-xl font-semibold text-slate-700">${t('auth_loading_banner_title')}</div>
      <div class="text-sm text-slate-500">${t('auth_loading_banner_body')}</div>
      <button id="auth-fallback-reauth"
              class="mt-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
        ${t('auth_loading_banner_action')}
      </button>
    </div>`;
  // Reload — user re-clicks Sign in button for fresh tokens
  mount.querySelector('#auth-fallback-reauth')?.addEventListener('click', () => location.reload());
}

export function renderNotProvisioned(mount, user) {
  if (!mount) return;
  mount.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="text-xl font-semibold text-slate-700">${t('auth_not_provisioned_title')}</div>
      <div class="text-sm text-slate-500">${t('auth_not_provisioned_body')}</div>
      <div class="text-xs text-slate-400">${user?.email || ''}</div>
      <button id="btn-signout"
              class="mt-2 px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700">
        ${t('sign_out')}
      </button>
    </div>`;
  mount.querySelector('#btn-signout')?.addEventListener('click', () => {
    window.__vdg_auth?.signOut?.();
    location.reload();
  });
}
