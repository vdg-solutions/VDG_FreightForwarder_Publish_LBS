// F-15-19 AC-4 — Fallback views for auth failure modes.
// Used when the server role probe times out or the user has no workspace membership.
// Extracted from app.js so the loading-hang recovery path can dynamic-import safely.

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import {
  roleCacheKey, sessionTokenKey, idTokenKey, profileKey,
} from '../../../../storage/core_abstractions/identity-cache-keys.js';

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
  // Reload — user re-clicks Sign in button for fresh tokens. These used to be the wrong keys
  // entirely ('vdg.role-cache' with a hyphen, 'vdg.auth.user' — neither ever matched a real slot,
  // so this button never actually cleared anything); now the real, tenant-namespaced ones.
  mount.querySelector('#auth-fallback-reauth')?.addEventListener('click', () => {
    try {
      localStorage.removeItem(roleCacheKey());
      sessionStorage.removeItem(sessionTokenKey());
      localStorage.removeItem(idTokenKey());
      localStorage.removeItem(profileKey());
    } catch { /* storage-less context (InPrivate, blocked site data) — the reload below is the real remedy */ }
    window.__vdg_auth?.signOut?.();
    location.reload();
  });
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
