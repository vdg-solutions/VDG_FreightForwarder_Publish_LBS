// Manager Notifications Center — F-14-14

import {
  NOTIFICATION_TYPES, formatDigestBody, shouldSendDigest, markDigestSent,
} from '../../operators/manager/notification-composer.js';
import { isManager }  from '../../auth/auth-gate.js';
import { navigate }   from '../../router.js';
import { idbGet, idbPut } from '../../cache/idb-cache.js';

const NOTIF_DRAWER_WIDTH_PX = 380;
const NOTIF_STORE           = 'notifications';
const PREFS_META_KEY        = 'preferences';

const EMPTY_STATE_COPY = { notifications: { heading: 'No notifications', cta: null } };

const NOTIF_ICON_MAP = {
  approval_request:          '📋',
  exception_escalated:       '🚨',
  commission_settle_request: '💰',
  credit_state_change:       '💳',
  cutoff_approaching:        '⏰',
  period_close_due:          '📅',
};

let _drawerOpen    = false;
let _settingsOpen  = false;
let _notifications = [];
let _prefs         = {};
let _db            = null;
let _onEntity;
let _onOpenDrawer;

function getRepo()  { return window.__vdg_repo; }
function getDb()    { return window.__vdg_db || null; }

// ── IDB helpers ───────────────────────────────────────────────────────────────

async function _loadFromIdb() {
  const db = getDb();
  if (!db) return [];
  try {
    return await new Promise((res, rej) => {
      const req = db.transaction(NOTIF_STORE, 'readonly').objectStore(NOTIF_STORE).getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror   = () => rej(req.error);
    });
  } catch { return []; }
}

async function _saveNotif(notif) {
  const db = getDb();
  if (!db) return;
  try {
    await new Promise((res, rej) => {
      const req = db.transaction(NOTIF_STORE, 'readwrite').objectStore(NOTIF_STORE).put(notif);
      req.onsuccess = () => res();
      req.onerror   = () => rej(req.error);
    });
  } catch (err) { console.warn('[notifs] idb save:', err.message); } // DEV
}

async function _bulkUpdateNotifs(updates) {
  const db = getDb();
  if (!db) return;
  try {
    const tx = db.transaction(NOTIF_STORE, 'readwrite');
    const st = tx.objectStore(NOTIF_STORE);
    updates.forEach((n) => st.put(n));
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  } catch (err) { console.warn('[notifs] idb bulk update:', err.message); } // DEV
}

function _unreadCount(items) { return items.filter((n) => !n.read && !n.dismissed).length; }

function _emitCount(items) {
  window.dispatchEvent(new CustomEvent('vdg:notif-count', { detail: { count: _unreadCount(items) } }));
}

// ── render helpers ────────────────────────────────────────────────────────────

function _itemHtml(n) {
  const icon = NOTIF_ICON_MAP[n.type] || '🔔';
  const ts   = n.created_at ? new Date(n.created_at).toLocaleString() : '';
  const dot  = !n.read && !n.dismissed
    ? '<span class="w-2 h-2 rounded-full bg-blue-500 shrink-0" aria-label="Unread"></span>'
    : '<span class="w-2 h-2 shrink-0"></span>';
  return `
    <div class="flex items-start gap-2 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 group"
         data-notif-id="${n.id}" role="listitem">
      <span class="text-lg shrink-0">${icon}</span>
      <div class="flex-1 min-w-0">
        <div class="text-xs font-medium text-slate-800 truncate">${n.title}</div>
        <div class="text-[11px] text-slate-400 mt-0.5">${ts}</div>
      </div>
      ${dot}
      <button class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 text-sm ml-1
                     focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-blue-500"
              data-dismiss="${n.id}" aria-label="Dismiss notification">✕</button>
    </div>`;
}

function _settingsHtml(prefs) {
  const settings = prefs?.notification_settings || {};
  const rows = NOTIFICATION_TYPES.map((t) => {
    const enabled = settings[t]?.enabled !== false;
    return `<div class="flex items-center justify-between py-2 border-b border-slate-100">
        <span class="text-xs text-slate-700">${t.replace(/_/g, ' ')}</span>
        <button role="switch" aria-checked="${enabled}" data-toggle-type="${t}"
          class="relative inline-flex h-5 w-9 rounded-full transition-colors
                 ${enabled ? 'bg-blue-600' : 'bg-slate-300'}
                 focus-visible:ring-2 focus-visible:ring-blue-500">
          <span class="absolute inset-y-0.5 ${enabled ? 'left-4' : 'left-0.5'} w-4 h-4 rounded-full bg-white shadow transition-all"></span>
        </button>
      </div>`;
  }).join('');

  const digestEnabled = prefs?.digest_enabled !== false;
  return `
    <div class="px-4 py-3 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">Notification types</div>
    <div class="px-4">${rows}</div>
    <div class="px-4 py-3 border-t border-slate-200">
      <div class="flex items-center justify-between">
        <span class="text-xs text-slate-700">Daily email digest</span>
        <button role="switch" aria-checked="${digestEnabled}" data-toggle-type="digest"
          class="relative inline-flex h-5 w-9 rounded-full transition-colors
                 ${digestEnabled ? 'bg-blue-600' : 'bg-slate-300'}
                 focus-visible:ring-2 focus-visible:ring-blue-500">
          <span class="absolute inset-y-0.5 ${digestEnabled ? 'left-4' : 'left-0.5'} w-4 h-4 rounded-full bg-white shadow transition-all"></span>
        </button>
      </div>
    </div>`;
}

function renderNotifList(container) {
  const visible = _notifications.filter((n) => !n.dismissed);
  if (!visible.length) {
    container.innerHTML = `
      <div class="flex flex-col items-center gap-2 py-12 text-slate-400">
        <span class="text-3xl">🔔</span>
        <div class="text-sm">${EMPTY_STATE_COPY.notifications.heading}</div>
      </div>`;
    return;
  }
  container.innerHTML = `<div role="list">${visible.map(_itemHtml).join('')}</div>`;
}

// ── main render ───────────────────────────────────────────────────────────────

export async function render(root) {
  if (!isManager()) { navigate('/dashboard'); return; }

  if (_onEntity)     window.removeEventListener('vdg:entity-changed', _onEntity);
  if (_onOpenDrawer) window.removeEventListener('vdg:open-notif-drawer', _onOpenDrawer);

  _db            = getDb();
  _notifications = await _loadFromIdb();
  _drawerOpen    = false;
  _settingsOpen  = false;

  // Load prefs
  if (_db) {
    try {
      const meta = await idbGet(_db, 'meta', PREFS_META_KEY);
      _prefs = meta || {};
    } catch { _prefs = {}; }
  }

  // Check digest
  if (_prefs?.digest_enabled !== false && shouldSendDigest()) {
    const repo = getRepo();
    if (repo) {
      const body = formatDigestBody(_notifications);
      const user = window.__vdg_auth?.getCurrentUser?.();
      if (user?.email) {
        window.location.href = `mailto:${user.email}?subject=VDG+Daily+Digest&body=${encodeURIComponent(body)}`;
        markDigestSent();
      }
    }
  }

  _emitCount(_notifications);

  root.innerHTML = `
    <div class="p-6 max-w-[860px] mx-auto">
      <div class="flex items-center justify-between mb-4">
        <div class="text-sm font-semibold text-slate-900">Notifications</div>
        <button id="btn-mark-all" class="text-xs text-blue-600 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Mark all read">Mark all read</button>
      </div>

      <!-- Loading skeleton -->
      <div id="notif-skeleton" class="space-y-3">
        ${[1, 2, 3].map(() => '<div class="h-14 bg-slate-200 animate-pulse rounded-lg"></div>').join('')}
      </div>

      <!-- Notification list -->
      <div id="notif-list" class="hidden bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div id="notif-items"></div>
      </div>
    </div>

    <!-- Drawer (fixed right panel) -->
    <div id="notif-drawer"
         style="width:${NOTIF_DRAWER_WIDTH_PX}px"
         class="fixed top-0 right-0 h-full bg-white border-l border-slate-200 shadow-2xl z-[200]
                transition-transform duration-200 translate-x-full flex flex-col"
         aria-label="Notifications drawer">
      <div class="h-16 border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        <span class="text-sm font-semibold text-slate-900">Notifications</span>
        <div class="flex gap-2">
          <button id="btn-drawer-settings" aria-label="Notification settings"
                  class="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600
                         focus-visible:ring-2 focus-visible:ring-blue-500">⚙</button>
          <button id="btn-drawer-close"    aria-label="Close notifications"
                  class="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600
                         focus-visible:ring-2 focus-visible:ring-blue-500">✕</button>
        </div>
      </div>
      <div id="drawer-settings-panel" class="hidden border-b border-slate-200 overflow-y-auto max-h-64"></div>
      <div class="flex-1 overflow-y-auto" id="drawer-items"></div>
      <div class="px-4 py-3 border-t border-slate-200 shrink-0">
        <button id="btn-drawer-mark-all" class="text-xs text-blue-600 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Mark all read">Mark all read</button>
      </div>
    </div>
    <div id="notif-overlay" class="hidden fixed inset-0 z-[199]"></div>`;

  // Show real content
  const skeleton = root.querySelector('#notif-skeleton');
  const listEl   = root.querySelector('#notif-list');
  const itemsEl  = root.querySelector('#notif-items');

  skeleton.classList.add('hidden');
  listEl.classList.remove('hidden');
  renderNotifList(itemsEl);

  const drawerEl    = root.querySelector('#notif-drawer');
  const drawerItems = root.querySelector('#drawer-items');
  const overlayEl   = root.querySelector('#notif-overlay');

  function openDrawer() {
    _drawerOpen = true;
    renderNotifList(drawerItems);
    drawerEl.classList.remove('translate-x-full');
    drawerEl.classList.add('translate-x-0');
    overlayEl.classList.remove('hidden');
  }
  function closeDrawer() {
    _drawerOpen = false;
    drawerEl.classList.add('translate-x-full');
    drawerEl.classList.remove('translate-x-0');
    overlayEl.classList.add('hidden');
  }

  // Keyboard Esc
  const _onKey = (e) => { if (e.key === 'Escape' && _drawerOpen) closeDrawer(); };
  window.addEventListener('keydown', _onKey);

  overlayEl.addEventListener('click', closeDrawer);

  root.querySelector('#btn-drawer-close').addEventListener('click', closeDrawer);

  root.querySelector('#btn-drawer-settings').addEventListener('click', () => {
    _settingsOpen = !_settingsOpen;
    const panel = root.querySelector('#drawer-settings-panel');
    if (_settingsOpen) { panel.innerHTML = _settingsHtml(_prefs); panel.classList.remove('hidden'); }
    else               { panel.classList.add('hidden'); }
  });

  async function markAllRead() {
    _notifications = _notifications.map((n) => ({ ...n, read: true }));
    await _bulkUpdateNotifs(_notifications);
    _emitCount(_notifications);
    renderNotifList(itemsEl);
    if (_drawerOpen) renderNotifList(drawerItems);
  }

  root.querySelector('#btn-mark-all').addEventListener('click', markAllRead);
  root.querySelector('#btn-drawer-mark-all').addEventListener('click', markAllRead);

  // Delegated events in list/drawer
  function handleListClick(e) {
    const dismissBtn = e.target.closest('[data-dismiss]');
    if (dismissBtn) {
      const id = dismissBtn.dataset.dismiss;
      const idx = _notifications.findIndex((n) => n.id === id);
      if (idx >= 0) {
        _notifications[idx] = { ..._notifications[idx], dismissed: true };
        _saveNotif(_notifications[idx]);
        _emitCount(_notifications);
        renderNotifList(itemsEl);
        if (_drawerOpen) renderNotifList(drawerItems);
      }
    }
    // Toggle settings
    const toggleBtn = e.target.closest('[data-toggle-type]');
    if (toggleBtn) _handleToggle(toggleBtn);
  }
  itemsEl.addEventListener('click', handleListClick);
  root.querySelector('#drawer-items').addEventListener('click', handleListClick);
  root.querySelector('#drawer-settings-panel').addEventListener('click', handleListClick);

  async function _handleToggle(btn) {
    const type    = btn.dataset.toggleType;
    const enabled = btn.getAttribute('aria-checked') !== 'true';

    if (type === 'digest') {
      _prefs = { ..._prefs, digest_enabled: enabled };
    } else {
      const ns = { ...(_prefs.notification_settings || {}) };
      ns[type] = { ...(ns[type] || {}), enabled };
      _prefs = { ..._prefs, notification_settings: ns };
    }

    if (_db) {
      try {
        const meta = (await idbGet(_db, 'meta', PREFS_META_KEY)) || { key: PREFS_META_KEY };
        await idbPut(_db, 'meta', { ...meta, ..._prefs });
      } catch (err) { console.warn('[notifs] prefs save:', err.message); } // DEV
    }

    // re-render settings panel
    const panel = root.querySelector('#drawer-settings-panel');
    if (panel && _settingsOpen) panel.innerHTML = _settingsHtml(_prefs);
  }

  // Live event: open drawer from topbar bell
  _onOpenDrawer = () => openDrawer();
  window.addEventListener('vdg:open-notif-drawer', _onOpenDrawer);

  // Entity changes → new notification candidate
  _onEntity = (e) => {
    const { kind } = e.detail || {};
    if (!kind) return;
    // In real system: computeFromEvent would map entity → Notification
    // Here we trigger a recount from IDB
    _loadFromIdb().then((rows) => {
      _notifications = rows;
      _emitCount(rows);
    }).catch(() => {});
  };
  window.addEventListener('vdg:entity-changed', _onEntity);

  // cleanup on next navigation
  root._notifCleanup = () => {
    window.removeEventListener('vdg:entity-changed',      _onEntity);
    window.removeEventListener('vdg:open-notif-drawer',   _onOpenDrawer);
    window.removeEventListener('keydown',                 _onKey);
  };
}
