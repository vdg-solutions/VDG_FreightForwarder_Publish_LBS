// topbar-helpers.js — stateless topbar helpers (no `this`).
// Extracted from topbar.js for the 350-line cap.

import { html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';
import { t } from '../../../kernel/core_abstractions/i18n/index.js';

const BADGE_MAX = 99;

// Badge text: null when empty, "99+" past the cap.
export function badgeLabel(count) {
  if (count <= 0) return null;
  return count > BADGE_MAX ? `${BADGE_MAX}+` : String(count);
}

// The red count bubble on the bell. Was written out twice in topbar.js — the same 130-char class
// string for the notification count and the due-soon count — which is what pushed that file over
// the 350-line cap. Falsy label renders nothing.
export function renderBadge(label) {
  if (!label) return '';
  return html`<span class="absolute top-0.5 right-0.5 min-w-[1rem] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none flex items-center justify-center ring-2 ring-white">${label}</span>`;
}

// Persist a preferences patch into the meta store. Non-critical → swallow errors.
export function idbSavePref(patch) {
  const store = window.__vdg_store;
  if (!store) return;
  (async () => {
    const prefs = (await store.cache_get_meta('preferences')) || { key: 'preferences' };
    await store.cache_put_meta('preferences', { ...prefs, ...patch });
  })().catch(() => { /* non-critical: preferences persistence is best-effort */ });
}

// User avatar: picture if present, else initials chip.
export function renderAvatar(user) {
  if (user?.picture) {
    return html`<img src="${user.picture}" alt="${user.name || t('topbar.user_fallback')}"
      class="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200"
      title="${user.name || user.email}" referrerpolicy="no-referrer" />`;
  }
  // Initials from name, else email — a hardcoded placeholder reads as someone's account
  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email ? user.email.slice(0, 2).toUpperCase() : '?');
  return html`<div class="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-white text-xs font-semibold flex items-center justify-center"
    title="${user?.name || user?.email || ''}">${initials}</div>`;
}
