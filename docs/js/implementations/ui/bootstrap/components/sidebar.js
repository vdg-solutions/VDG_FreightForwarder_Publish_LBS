import { LitElement, html, css } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';
import { navigate } from '../router.js';
import { hasRole } from '../../../ui/core_abstractions/ports/auth/session-roles.js';
import { t } from '../../../kernel/core_abstractions/i18n/index.js';
import { ROLE_MANAGER, ROLE_ACCOUNTANT, ROLE_SALES_REP, ROLE_SALES_MANAGER, ROLE_CUSTOMER_SERVICE, ROLES_RESOLVED_EVENT } from '../../../ui/core_abstractions/roles.js';
import { filterSidebarItems, currentUserRole, currentUserRoles, normalizeRole } from '../../core_abstractions/ports/governance/route-guard.js';
import { SIDEBAR_COLLAPSED_KEY, parseCollapsed, serializeCollapsed, toggleCollapsed, isGroupCollapsed, activeGroupKey, DESKTOP_COLLAPSED_KEY, parseDesktopCollapsed, serializeDesktopCollapsed } from './sidebar-collapse-state.js';

const DRAWER_BREAKPOINT_PX = 768;
const V1_BUTTON_COUNT      = 5;   // AC-01/02 invariant
const V1_GROUP_COUNT       = 3;   // AC-01 invariant
const LOCALE_CHANGE_EVENT  = 'vdg:locale-changed';
const CHEVRON_EXPANDED     = '▾';
const CHEVRON_COLLAPSED    = '▸';

// Active v1 menu — 5 items, labelKey resolved via t() at render time.
const V1_ITEMS = [
  // #15: matches the /dashboard route-guard entry (nav-gates KEEP-CONSISTENT-WITH-route-guard)
  { group: 'workspace', route: '/dashboard',           labelKey: 'nav.workspace.dashboard',    icon: 'grid',   allowRoles: [ROLE_MANAGER, ROLE_ACCOUNTANT] },
  { group: 'workspace', route: '/shipments',           labelKey: 'nav.workspace.shipments',    icon: 'ship'   },
  // F-37-03: CS opens a job before a rep is named, so creating one is workspace work and sits with
  // the shipment list rather than in the Sales group. Its allowRoles is the /shipments reader set.
  { group: 'workspace', route: '/shipments/new',       labelKey: 'nav.sales.create_shipment',  icon: 'tag',
    allowRoles: [ROLE_CUSTOMER_SERVICE, ROLE_SALES_REP, ROLE_SALES_MANAGER, ROLE_MANAGER] },

  // F-24-09: allowRoles matches route-guard's /sales prefix map (SalesRep | Manager).
  { group: 'sales',     route: '/sales/me',            labelKey: 'nav.sales.my_shipments',           icon: 'doc',    allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
  // F-42-04: the quote list had no nav entry at all — the topbar's "new quote" button created
  // deals that only a typed URL could find again, and step 1 of the sales flow (quote -> job)
  // was a one-way street. Owner 2026-08-15, on being shown the gap: "không có".
  // F-42-06 (owner: "báo giá là chỉ sales làm nha"): the sales desk only — KEEP-CONSISTENT-WITH
  // access_policy.rs's "/sales/quote" rule. A Manager who also sells holds SalesRep on their user
  // record and gets the entry through that hat, not through being the manager.
  { group: 'sales',     route: '/sales/quote',         labelKey: 'nav.sales.quotes',                 icon: 'quote',  allowRoles: [ROLE_SALES_REP, ROLE_SALES_MANAGER] },
  // F-57-01: was ungated, so filterSidebarItems showed "P&L Report" to every role including
  // ReadOnly — the view's own hasRole(ROLE_MANAGER) check then bounced them to /dashboard with no
  // explanation. A visible menu item that always fails. Now matches the /manager route-guard
  // prefix (nav-gates KEEP-CONSISTENT-WITH-route-guard).
  { group: 'reports',   route: '/manager/reports/pnl', labelKey: 'nav.reports.pnl_report',     icon: 'dollar', managerOnly: true, allowRoles: [ROLE_MANAGER] },
  // F-23-04: accountant ledger browse — reuses the reports group (R-5 minimal change).
  // F-24-05: allowRoles opens this to Accountant too; managerOnly kept for the F-23-04
  // CDP button-count fixture (27-sidebar-v1-trim.js), superseded by allowRoles below.
  { group: 'reports',   route: '/accounting/ledger',   labelKey: 'nav.reports.ledger',    icon: 'doc', managerOnly: true, allowRoles: [ROLE_MANAGER, ROLE_ACCOUNTANT] },
  // F-23-05: financial reports (TB/P&L/BS) — same reports group; F-24-05 opens to Accountant
  { group: 'reports',   route: '/accounting/reports',  labelKey: 'nav.reports.financial', icon: 'doc', managerOnly: true, allowRoles: [ROLE_MANAGER, ROLE_ACCOUNTANT] },
  // #31: finance policy the ACCOUNTANT owns (default P&L currency). Not under /manager — that
  // prefix is Manager-only in access_policy.rs, which would lock out the very role that sets it.
  { group: 'reports',   route: '/accounting/settings', labelKey: 'nav.accounting.settings', icon: 'db', managerOnly: true, allowRoles: [ROLE_MANAGER, ROLE_ACCOUNTANT] },
  { group: 'reports',   route: '/manager/commission-rules', labelKey: 'nav.reports.comm_rules', icon: 'check', managerOnly: true, allowRoles: [ROLE_MANAGER] },
  // F-24-04: manager-only user CRUD — same reports group (R-5 minimal change, precedent above)
  { group: 'reports',   route: '/admin/users',         labelKey: 'nav.admin.users',       icon: 'db',  managerOnly: true },
  // Master data — customer list + future master entities. SalesRep is read-only in the
  // page itself (masters-customers.js gates Add/Edit/Delete behind hasRole(ROLE_MANAGER)), so opening
  // the nav to Sales just lets them find & browse; it doesn't grant CRUD.
  { group: 'masters',   route: '/masters/customers',   labelKey: 'nav.masters.customers', icon: 'db',  allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
  { group: 'masters',   route: '/masters/local-charges',    labelKey: 'nav.masters.local_charges', icon: 'db', allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
  { group: 'masters',   route: '/masters/units-of-measure', labelKey: 'nav.masters.units',         icon: 'db', allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
  // E-26 F-26-04: ocean-carrier master, reachable from Danh mục like local-charges/units
  { group: 'masters',   route: '/masters/ocean-carriers',   labelKey: 'nav.masters.ocean_carriers', icon: 'db', allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
  // F-28-15: ocean-tariff priced kind, carrier-joined view — writers mirror ocean-carriers
  { group: 'masters',   route: '/masters/ocean-tariff',     labelKey: 'nav.masters.ocean_tariff',   icon: 'db', allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
  // F-29-10: FX admin was route-only (no sidebar entry), so the AC-04 no-rate hint
  // pointed nowhere — mirrors the units/ocean-carriers Danh mục entries, Manager-only.
  { group: 'masters',   route: '/manager/fx-rates',         labelKey: 'nav.masters.fx_rates',       icon: 'db', managerOnly: true, allowRoles: [ROLE_MANAGER] },
  // F-18-11: alias-editor only (writers manager-only, Q3) — no browse value for SalesRep.
  { group: 'masters',   route: '/masters/shipment-states',  labelKey: 'nav.masters.shipment_states', icon: 'db', managerOnly: true, allowRoles: [ROLE_MANAGER] },
];

const V1_GROUPS = [
  { key: 'workspace', headingKey: 'nav.group.workspace' },
  { key: 'sales',     headingKey: 'nav.group.sales'     },
  { key: 'masters',   headingKey: 'nav.group.masters'   },
  { key: 'reports',   headingKey: 'nav.group.reports'   },
];

// F-15-46 v2-restore: original WORKSPACE non-v1 entries
// const HIDDEN_WORKSPACE_V2 = [
//   { route: '/upload',    label: 'Excel Import', icon: 'upload' },
//   { route: '/documents', label: 'Documents',    icon: 'doc'    },
// ];

// F-15-46 v2-restore: original SALES non-v1 entries
// const HIDDEN_SALES_V2 = [
//   (quote list promoted to V1_ITEMS by F-42-04 — no longer hidden)
//   { route: '/sales/me',        label: 'My Workspace', icon: 'tag',   disabled: true },
//   { route: '/sales/analytics', label: 'Analytics',    icon: 'dollar', disabled: true },
// ];

// F-15-46 v2-restore: original MANAGER block (minus P&L Report, promoted to v1)
// const HIDDEN_MANAGER_V2 = [
//   { route: '/manager/dashboard',            label: 'Dashboard',          icon: 'grid'   },
//   { route: '/manager/pipeline',             label: 'Pipeline',           icon: 'ship',   sub: true },
//   { route: '/manager/approvals',            label: 'Approvals',          icon: 'alert',  sub: true },
//   { route: '/manager/finance/cash-flow',    label: 'Cash Flow & AR',     icon: 'dollar', sub: true },
//   { route: '/manager/sales',                label: 'Sales & Commission', icon: 'dollar', sub: true },
//   { route: '/manager/finance/commissions',  label: 'Commission Settle',  icon: 'check',  sub: true },
//   { route: '/manager/exceptions',           label: 'Exceptions',         icon: 'alert',  sub: true },
//   { route: '/manager/masters/customers',    label: 'Masters',            icon: 'grid',   sub: true },
//   { route: '/manager/finance/close-period', label: 'Period Close',       icon: 'lock',   sub: true },
//   { route: '/manager/audit',                label: 'Audit Log',          icon: 'doc',    sub: true },
//   { route: '/manager/notifications',        label: 'Notifications',      icon: 'bell',   sub: true },
//   { route: '/manager/errors',               label: 'Error Log',          icon: 'alert',  sub: true },
//   { route: '/manager/backup',               label: 'Backup / DR',        icon: 'doc',    sub: true },
//   { route: '/manager/users',                label: 'Người dùng',         icon: 'db',     sub: true },
// ];

// F-15-46 v2-restore: original FINANCE/SECONDARY group
// const HIDDEN_SECONDARY_V2 = [
//   { route: '/finance',           label: 'Finance',  icon: 'dollar' },
//   { route: '/finance/credit',    label: 'Credit',   icon: 'dollar', sub: true },
//   { route: '/finance/demdet',    label: 'DEM/DET',  icon: 'dollar', sub: true },
//   { route: '/masters/customers', label: 'Masters',  icon: 'db',     managerOnly: true },
//   { route: '/masters/carriers',  label: 'Carriers', icon: 'ship',   sub: true, managerOnly: true },
//   { route: '/masters/services',  label: 'Services', icon: 'doc',    sub: true, managerOnly: true },
//   { route: '/help',              label: 'Help',     icon: 'help'   },
// ];

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
    this._collapsed  = new Set();
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
    try { this._collapsed = parseCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY)); }
    catch { /* storage disabled: default all-expanded */ this._collapsed = new Set(); }
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
    // #15 boot window: the rep prefix is stamped as role until the staff table resolves, and it
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
        <span class="font-mono whitespace-nowrap" title="build 1d574f7-dirty">v0.3.93</span>
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
// Kept verbatim so v2 can re-introduce these groups by unwrapping the comment.
// HIDDEN_MANAGER_V2 — admin-only, not in v1 nav (F-15-36)
// { route: '/manager/fx-rates', label: 'FX Rates', icon: 'dollar', sub: true },
// { route: '/manager/settings', label: 'Settings',  icon: 'grid',   sub: true },
/*
<div data-nav-group="finance">
  <div class="px-4 pt-6 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Finance</div>
  ${SECONDARY.map((i) => this._renderItem(i))}
</div>
${hasRole(ROLE_MANAGER) ? html`
  <div data-nav-group="manager">
    <div class="px-4 pt-6 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Manager</div>
    ${MANAGER_ITEMS.map((i) => this._renderItem(i))}
  </div>
` : ''}
*/
