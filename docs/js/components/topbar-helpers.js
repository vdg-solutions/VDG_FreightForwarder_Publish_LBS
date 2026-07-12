// topbar-helpers.js — stateless topbar helpers (no `this`).
// Extracted from topbar.js for the 350-line cap.

import { html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';

const BADGE_MAX = 99;

// Badge text: null when empty, "99+" past the cap.
export function badgeLabel(count) {
  if (count <= 0) return null;
  return count > BADGE_MAX ? `${BADGE_MAX}+` : String(count);
}

// Persist a preferences patch into the `meta` IDB store. Non-critical → swallow errors.
export function idbSavePref(patch) {
  const db = window.__vdg_db;
  if (!db) return;
  try {
    const tx = db.transaction('meta', 'readwrite');
    const st = tx.objectStore('meta');
    const gr = st.get('preferences');
    gr.onsuccess = () => { st.put({ ...(gr.result || { key: 'preferences' }), ...patch }); };
  } catch { /* non-critical: preferences persistence is best-effort */ }
}

// User avatar: picture if present, else initials chip.
export function renderAvatar(user) {
  if (user?.picture) {
    return html`<img src="${user.picture}" alt="${user.name || 'User'}"
      class="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200"
      title="${user.name || user.email}" referrerpolicy="no-referrer" />`;
  }
  const initials = user?.name ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : 'VU';
  return html`<div class="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-white text-xs font-semibold flex items-center justify-center"
    title="${user?.name || user?.email || ''}">${initials}</div>`;
}
