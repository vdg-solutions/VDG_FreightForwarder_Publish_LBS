import {
  NOTIFICATION_TYPES
} from "./chunk-NJVBPCWY.js";
import {
  t
} from "./chunk-NJFDQATX.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/notifications.js
var NOTIF_DRAWER_WIDTH_PX = 380;
var PREFS_META_KEY = "preferences";
var NOTIF_TYPE_KEY_PREFIX = "notifications.type.";
var NOTIF_ICON_MAP = {
  approval_request: "\u{1F4CB}",
  exception_escalated: "\u{1F6A8}",
  commission_settle_request: "\u{1F4B0}",
  credit_state_change: "\u{1F4B3}",
  cutoff_approaching: "\u23F0",
  period_close_due: "\u{1F4C5}"
};
var _drawerOpen = false;
var _settingsOpen = false;
var _notifications = [];
var _prefs = {};
var _store = null;
var _onEntity;
var _onOpenDrawer;
function getStore() {
  return window.__vdg_store || null;
}
async function _loadFromIdb() {
  const store = getStore();
  if (!store) return [];
  try {
    return await store.cache_list_notifications();
  } catch {
    return [];
  }
}
async function _saveNotif(notif) {
  const store = getStore();
  if (!store) return;
  try {
    await store.cache_put_notification(notif);
  } catch (err) {
    console.warn("[notifs] save:", err.message);
  }
}
async function _bulkUpdateNotifs(updates) {
  const store = getStore();
  if (!store) return;
  try {
    for (const n of updates) await store.cache_put_notification(n);
  } catch (err) {
    console.warn("[notifs] bulk update:", err.message);
  }
}
function _unreadCount(items) {
  return items.filter((n) => !n.read && !n.dismissed).length;
}
function _emitCount(items) {
  window.dispatchEvent(new CustomEvent("vdg:notif-count", { detail: { count: _unreadCount(items) } }));
}
function _itemHtml(n) {
  const icon = NOTIF_ICON_MAP[n.type] || "\u{1F514}";
  const ts = n.created_at ? new Date(n.created_at).toLocaleString() : "";
  const dot = !n.read && !n.dismissed ? `<span class="w-2 h-2 rounded-full bg-blue-500 shrink-0" aria-label="${t("notifications.aria.unread")}"></span>` : '<span class="w-2 h-2 shrink-0"></span>';
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
              data-dismiss="${n.id}" aria-label="${t("notifications.aria.dismiss")}">\u2715</button>
    </div>`;
}
function _settingsHtml(prefs) {
  const settings = prefs?.notification_settings || {};
  const rows = NOTIFICATION_TYPES.map((nt) => {
    const enabled = settings[nt]?.enabled !== false;
    const label = t(NOTIF_TYPE_KEY_PREFIX + nt);
    return `<div class="flex items-center justify-between py-2 border-b border-slate-100">
        <span class="text-xs text-slate-700">${label}</span>
        <button role="switch" aria-checked="${enabled}" data-toggle-type="${nt}"
          class="relative inline-flex h-5 w-9 rounded-full transition-colors
                 ${enabled ? "bg-blue-600" : "bg-slate-300"}
                 focus-visible:ring-2 focus-visible:ring-blue-500">
          <span class="absolute inset-y-0.5 ${enabled ? "left-4" : "left-0.5"} w-4 h-4 rounded-full bg-white shadow transition-all"></span>
        </button>
      </div>`;
  }).join("");
  return `
    <div class="px-4 py-3 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">${t("notifications.types_header")}</div>
    <div class="px-4">${rows}</div>`;
}
function renderNotifList(container) {
  const visible = _notifications.filter((n) => !n.dismissed);
  if (!visible.length) {
    container.innerHTML = `
      <div class="flex flex-col items-center gap-2 py-12 text-slate-400">
        <span class="text-3xl">\u{1F514}</span>
        <div class="text-sm">${t("notifications.empty")}</div>
      </div>`;
    return;
  }
  container.innerHTML = `<div role="list">${visible.map(_itemHtml).join("")}</div>`;
}
async function render(root) {
  if (_onEntity) window.removeEventListener("vdg:entity-changed", _onEntity);
  if (_onOpenDrawer) window.removeEventListener("vdg:open-notif-drawer", _onOpenDrawer);
  _store = getStore();
  _notifications = await _loadFromIdb();
  _drawerOpen = false;
  _settingsOpen = false;
  if (_store) {
    try {
      const meta = await _store.cache_get_meta(PREFS_META_KEY);
      _prefs = meta || {};
    } catch {
      _prefs = {};
    }
  }
  _emitCount(_notifications);
  root.innerHTML = `
    <div class="p-6 max-w-[860px] mx-auto">
      <div class="flex items-center justify-between mb-4">
        <div class="text-sm font-semibold text-slate-900">${t("notifications.title")}</div>
        <button id="btn-mark-all" class="text-xs text-blue-600 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="${t("notifications.mark_all_read")}">${t("notifications.mark_all_read")}</button>
      </div>

      <!-- Loading skeleton -->
      <div id="notif-skeleton" class="space-y-3">
        ${[1, 2, 3].map(() => '<div class="h-14 bg-slate-200 animate-pulse rounded-lg"></div>').join("")}
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
         aria-label="${t("notifications.aria.drawer")}">
      <div class="h-16 border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        <span class="text-sm font-semibold text-slate-900">${t("notifications.title")}</span>
        <div class="flex gap-2">
          <button id="btn-drawer-settings" aria-label="${t("notifications.aria.settings")}"
                  class="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600
                         focus-visible:ring-2 focus-visible:ring-blue-500">\u2699</button>
          <button id="btn-drawer-close"    aria-label="${t("notifications.aria.close")}"
                  class="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600
                         focus-visible:ring-2 focus-visible:ring-blue-500">\u2715</button>
        </div>
      </div>
      <div id="drawer-settings-panel" class="hidden border-b border-slate-200 overflow-y-auto max-h-64"></div>
      <div class="flex-1 overflow-y-auto" id="drawer-items"></div>
      <div class="px-4 py-3 border-t border-slate-200 shrink-0">
        <button id="btn-drawer-mark-all" class="text-xs text-blue-600 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="${t("notifications.mark_all_read")}">${t("notifications.mark_all_read")}</button>
      </div>
    </div>
    <div id="notif-overlay" class="hidden fixed inset-0 z-[199]"></div>`;
  const skeleton = root.querySelector("#notif-skeleton");
  const listEl = root.querySelector("#notif-list");
  const itemsEl = root.querySelector("#notif-items");
  skeleton.classList.add("hidden");
  listEl.classList.remove("hidden");
  renderNotifList(itemsEl);
  const drawerEl = root.querySelector("#notif-drawer");
  const drawerItems = root.querySelector("#drawer-items");
  const overlayEl = root.querySelector("#notif-overlay");
  function openDrawer() {
    _drawerOpen = true;
    renderNotifList(drawerItems);
    drawerEl.classList.remove("translate-x-full");
    drawerEl.classList.add("translate-x-0");
    overlayEl.classList.remove("hidden");
  }
  function closeDrawer() {
    _drawerOpen = false;
    drawerEl.classList.add("translate-x-full");
    drawerEl.classList.remove("translate-x-0");
    overlayEl.classList.add("hidden");
  }
  const _onKey = (e) => {
    if (e.key === "Escape" && _drawerOpen) closeDrawer();
  };
  window.addEventListener("keydown", _onKey);
  overlayEl.addEventListener("click", closeDrawer);
  root.querySelector("#btn-drawer-close").addEventListener("click", closeDrawer);
  root.querySelector("#btn-drawer-settings").addEventListener("click", () => {
    _settingsOpen = !_settingsOpen;
    const panel = root.querySelector("#drawer-settings-panel");
    if (_settingsOpen) {
      panel.innerHTML = _settingsHtml(_prefs);
      panel.classList.remove("hidden");
    } else {
      panel.classList.add("hidden");
    }
  });
  async function markAllRead() {
    _notifications = _notifications.map((n) => ({ ...n, read: true }));
    await _bulkUpdateNotifs(_notifications);
    _emitCount(_notifications);
    renderNotifList(itemsEl);
    if (_drawerOpen) renderNotifList(drawerItems);
  }
  root.querySelector("#btn-mark-all").addEventListener("click", markAllRead);
  root.querySelector("#btn-drawer-mark-all").addEventListener("click", markAllRead);
  function handleListClick(e) {
    const dismissBtn = e.target.closest("[data-dismiss]");
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
    const toggleBtn = e.target.closest("[data-toggle-type]");
    if (toggleBtn) _handleToggle(toggleBtn);
  }
  itemsEl.addEventListener("click", handleListClick);
  root.querySelector("#drawer-items").addEventListener("click", handleListClick);
  root.querySelector("#drawer-settings-panel").addEventListener("click", handleListClick);
  async function _handleToggle(btn) {
    const type = btn.dataset.toggleType;
    const enabled = btn.getAttribute("aria-checked") !== "true";
    const ns = { ..._prefs.notification_settings || {} };
    ns[type] = { ...ns[type] || {}, enabled };
    _prefs = { ..._prefs, notification_settings: ns };
    if (_store) {
      try {
        const meta = await _store.cache_get_meta(PREFS_META_KEY) || { key: PREFS_META_KEY };
        await _store.cache_put_meta(PREFS_META_KEY, { ...meta, ..._prefs });
      } catch (err) {
        console.warn("[notifs] prefs save:", err.message);
      }
    }
    const panel = root.querySelector("#drawer-settings-panel");
    if (panel && _settingsOpen) panel.innerHTML = _settingsHtml(_prefs);
  }
  _onOpenDrawer = () => openDrawer();
  window.addEventListener("vdg:open-notif-drawer", _onOpenDrawer);
  _onEntity = (e) => {
    const { kind } = e.detail || {};
    if (!kind) return;
    _loadFromIdb().then((rows) => {
      _notifications = rows;
      _emitCount(rows);
    }).catch(() => {
    });
  };
  window.addEventListener("vdg:entity-changed", _onEntity);
  root._notifCleanup = () => {
    window.removeEventListener("vdg:entity-changed", _onEntity);
    window.removeEventListener("vdg:open-notif-drawer", _onOpenDrawer);
    window.removeEventListener("keydown", _onKey);
  };
}
export {
  render
};
