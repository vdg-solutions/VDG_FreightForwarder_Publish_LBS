import { LitElement, html, css } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';
import { navigate } from '../router.js';
import { hasRole, currentRolesResolved } from '../../../ui/core_abstractions/ports/auth/session-roles.js';
import { t } from '../../../kernel/core_abstractions/i18n/index.js';
import { ROLES_RESOLVED_EVENT } from '../../../ui/core_abstractions/roles.js';
import { filterSidebarItems, currentUserRole, currentUserRoles, normalizeRole } from '../../core_abstractions/ports/governance/route-guard.js';
import { SIDEBAR_COLLAPSED_KEY, parseCollapsed, serializeCollapsed, toggleCollapsed, isGroupCollapsed, activeGroupKey, DESKTOP_COLLAPSED_KEY, parseDesktopCollapsed, serializeDesktopCollapsed } from './sidebar-collapse-state.js';
import { V1_ITEMS, V1_GROUPS } from './sidebar-items.js';

const DRAWER_BREAKPOINT_PX = 768;
const LOCALE_CHANGE_EVENT  = 'vdg:locale-changed';
const CHEVRON_EXPANDED     = '▾';
const CHEVRON_COLLAPSED    = '▸';

// Owner 2026-08-28: lookup tables + rare config, real but not hourly — collapsed on first visit
// only; any saved pref (incl. all-expanded) wins over this.
const DEFAULT_COLLAPSED_GROUPS = ['sales_reference', 'admin'];

const ICONS = {
  grid:   '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>',
  alert:  '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  ship:   '<path d="M3 18a9 9 0 0 0 18 0M3 18l1.5-5h15L21 18M6 13V7h12v6M9 7V4h6v3"/>',
  upload: '<path d="M12 3v12m0-12l-4 4m4-4l4 4M5 21h14"/>',
  doc:    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  dollar: '<path d="M12 2v20M17 7H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H7"/>',
  tag:    '<path d="M3 12V3h9l9 9-9 9-9-9z"/><circle cx="7" cy="7" r="1.5"/>',
  quote:  '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>',
  db:     '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
  plus:   '<path d="M12 5v14M5 12h14"/>',
  help:   '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  check:  '<polyline points="20 6 9 17 4 12"/>',
  lock:   '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  bell:   '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
};

class VdgSidebar extends LitElement {
  static styles = css`
    :host { display: block; }
  `;

  static properties = {
    activeRoute:       { type: String, state: true },
    _drawerOpen:       { type: Boolean, state: true },
    _mobile:           { type: Boolean, state: true },
    _collapsed:        { state: true },   // Set<string> of collapsed group keys
    _desktopCollapsed: { type: Boolean, state: true },   // F-43-01 AC-04
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.activeRoute = location.hash.slice(1) || '/dashboard';
    this._drawerOpen = false;
    this._mobile     = window.innerWidth < DRAWER_BREAKPOINT_PX;
    this._collapsed  = new Set(DEFAULT_COLLAPSED_GROUPS);
    this._desktopCollapsed = false;

    this._onNav           = (e) => { this.activeRoute = e.detail.route; if (this._mobile) this._drawerOpen = false; this.requestUpdate(); };
    this._onBreakpt       = (e) => { this._mobile = e.detail.mobile; if (!this._mobile) this._drawerOpen = false; };
    this._onToggle         = () => {
      if (this._mobile) { this._drawerOpen = !this._drawerOpen; return; }
      this._desktopCollapsed = !this._desktopCollapsed;
      try { localStorage.setItem(DESKTOP_COLLAPSED_KEY, serializeDesktopCollapsed(this._desktopCollapsed)); }
      catch { /* private-mode/quota: keep in-memory state, pref just won't persist */ }
    };
    this._onBackdrop      = () => { this._drawerOpen = false; };
    this._onLocaleChanged = () => this.requestUpdate();
    // F-42-05: the menu is role-gated, and this component mounts before sign-in resolves —
    // without this the first (role-less) filter result stuck for the whole session.
    this._onRolesResolved = () => this.requestUpdate();
    this._onGroupToggle   = (key) => {
      this._collapsed = toggleCollapsed(this._collapsed, key);
      try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, serializeCollapsed(this._collapsed)); }
      catch { /* private-mode/quota: keep in-memory state, pref just won't persist */ }
      this.requestUpdate();
    };
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('vdg:navigate',           this._onNav);
    window.addEventListener('vdg:breakpoint-changed', this._onBreakpt);
    window.addEventListener('vdg:sidebar-toggle',     this._onToggle);
    window.addEventListener(LOCALE_CHANGE_EVENT,      this._onLocaleChanged);
    window.addEventListener(ROLES_RESOLVED_EVENT,     this._onRolesResolved);
    try { // no saved pref (first visit) -> tidy default; any saved value, incl. all-expanded, wins
      const raw = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      this._collapsed = raw ? parseCollapsed(raw) : new Set(DEFAULT_COLLAPSED_GROUPS);
    }
    catch { /* storage disabled: fall back to the tidy default */ this._collapsed = new Set(DEFAULT_COLLAPSED_GROUPS); }
    try { this._desktopCollapsed = parseDesktopCollapsed(localStorage.getItem(DESKTOP_COLLAPSED_KEY)); }
    catch { /* storage disabled: default expanded */ this._desktopCollapsed = false; }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('vdg:navigate',           this._onNav);
    window.removeEventListener('vdg:breakpoint-changed', this._onBreakpt);
    window.removeEventListener('vdg:sidebar-toggle',     this._onToggle);
    window.removeEventListener(LOCALE_CHANGE_EVENT,      this._onLocaleChanged);
    window.removeEventListener(ROLES_RESOLVED_EVENT,     this._onRolesResolved);
  }

  // #28: the role SET from the staff table (grants/). A user holding several roles sees the union of
  // their items — a manager who also does sales gets both menus.
  _effectiveRoles() {
    const roles = currentUserRoles();
    if (roles.length) return roles;
    // #15 boot window: the rep's account is stamped as role until the staff table resolves, and it
    // matches no allowRoles list — normalize it so a real rep is not shown an empty menu.
    return [normalizeRole(currentUserRole())];
  }

  _renderItem(item) {
    const isActive = this.activeRoute === item.route;
    const cls = isActive
      ? 'bg-slate-800 text-white border-l-2 border-blue-400'
      : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border-l-2 border-transparent';
    const disabledCls = item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer';
    const text = item.labelKey ? t(item.labelKey) : item.label;
    return html`
      <button
        class="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-medium transition ${cls} ${disabledCls}"
        ?disabled=${item.disabled}
        @click=${() => !item.disabled && navigate(item.route)}
      >
        ${item.sub ? html`
          <span class="w-4"></span>
        ` : html`
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${this._icon(item.icon)}
          </svg>
        `}
        <span class="flex-1 text-left truncate ${item.sub ? 'text-slate-400' : ''}">${text}</span>
        ${item.disabled ? html`<span class="text-[10px] uppercase tracking-wider text-slate-600">${t('sidebar.badge.soon')}</span>` : ''}
      </button>
    `;
  }

  _icon(name) {
    const svg = document.createElement('template');
    svg.innerHTML = ICONS[name] || '';
    return svg.content;
  }

  _renderNav() {
    return html`
      <div class="px-5 pt-6 pb-8">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-bold">V</div>
          <div>
            <div class="font-semibold tracking-tight text-white">VDG Freight</div>
            <div class="text-[11px] text-slate-500 -mt-0.5">NVOCC Console</div>
          </div>
        </div>
      </div>
      <nav class="flex-1 flex flex-col gap-0.5 overflow-y-auto pb-4">
        ${(() => {
          const visible = filterSidebarItems(V1_ITEMS, this._effectiveRoles());
          // No item survives the role filter -- the same fail-closed reading a user with no grant
          // gets. But that reading and "the role probe never got an answer because the backend is
          // unreachable" produce the IDENTICAL empty `visible` array; rendering nothing either way
          // is the exact ambiguity that shipped with no message at all. `currentRolesResolved()`
          // (session_principal.rs's own `resolved()`) is the Rust-decided fact that tells them
          // apart -- never guessed here from a timer or a retry count.
          if (visible.length === 0) {
            const msgKey = currentRolesResolved() ? 'nav.access.denied' : 'nav.access.unreachable';
            return html`<div class="px-4 py-3 text-xs text-slate-400" role="status">${t(msgKey)}</div>`;
          }
          const activeGroup = activeGroupKey(visible, this.activeRoute); // AC-04
          let shown = 0;
          return V1_GROUPS.map((g) => {
            const items = visible.filter((i) => i.group === g.key);
            if (items.length === 0) return ''; // skip empty groups (e.g. masters for non-managers)
            const first = shown === 0;
            shown += 1;
            const collapsed = isGroupCollapsed(this._collapsed, g.key, activeGroup);
            return html`
              <div data-nav-group="${g.key}">
                <button type="button" data-nav-toggle="${g.key}"
                  class="w-full flex items-center justify-between px-4 ${first ? 'pb-2' : 'pt-6 pb-2'} text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300"
                  aria-expanded=${collapsed ? 'false' : 'true'}
                  @click=${() => this._onGroupToggle(g.key)}>
                  <span>${t(g.headingKey)}</span>
                  <span aria-hidden="true">${collapsed ? CHEVRON_COLLAPSED : CHEVRON_EXPANDED}</span>
                </button>
                ${collapsed ? '' : items.map((i) => this._renderItem(i))}
              </div>
            `;
          });
        })()}
      </nav>
      <div class="mt-auto px-4 py-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
        <span>VDG FreightForwarder</span>
        <span class="font-mono whitespace-nowrap" title="build 37751ac4">v0.4.74 (37751ac4)</span>
      </div>
    `;
  }

  render() {
    if (this._mobile) {
      // drawer mode — slides in from left, backdrop closes it
      return html`
        ${this._drawerOpen ? html`
          <div class="fixed inset-0 z-[1000] flex">
            <aside class="w-64 bg-slate-900 text-slate-100 flex flex-col h-full shadow-2xl"
                   data-drawer="true">
              ${this._renderNav()}
            </aside>
            <div class="flex-1 bg-black/40" @click="${this._onBackdrop}"></div>
          </div>` : ''}`;
    }
    if (this._desktopCollapsed) return html``; // F-43-01 AC-04: same "render nothing" idiom as the mobile-closed branch
    return html`
      <aside class="w-60 shrink-0 h-screen bg-slate-900 text-slate-100 flex flex-col">
        ${this._renderNav()}
      </aside>`;
  }
}

customElements.define('vdg-sidebar', VdgSidebar);

// AC-07 test seam — fixture injection for managerOnly gate verification
window._vdgSidebarTest = { v1Items: V1_ITEMS, hasRole };

// F-15-46 v2-restore: previous group blocks rendered inside _renderNav (Finance + Manager).
// Kept verbatim so v2 can re-introduce these groups by unwrapping the comment. No role wrapper
// here on purpose: MANAGER_ITEMS carries its own allowRoles, filterSidebarItems already filters
// it in wasm, and _renderNav's empty-group skip (line 165) hides the header when nothing is left.
// HIDDEN_MANAGER_V2 — admin-only, not in v1 nav (F-15-36)
// { route: '/manager/fx-rates', label: 'FX Rates', icon: 'dollar', sub: true },
// { route: '/manager/settings', label: 'Settings',  icon: 'grid',   sub: true },
/*
<div data-nav-group="finance">
  <div class="px-4 pt-6 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Finance</div>
  ${SECONDARY.map((i) => this._renderItem(i))}
</div>
<div data-nav-group="manager">
  <div class="px-4 pt-6 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Manager</div>
  ${MANAGER_ITEMS.map((i) => this._renderItem(i))}
</div>
*/
