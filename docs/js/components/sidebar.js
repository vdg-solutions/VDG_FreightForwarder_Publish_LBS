import { LitElement, html, css } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';
import { navigate } from '../router.js';
import { isManager } from '../auth/auth-gate.js';
import { t } from '../i18n/index.js';
import { filterSidebarItems, currentUserRole, ROLE_MANAGER, ROLE_ACCOUNTANT, ROLE_SALES_REP } from '../operators/manager/route-guard.js';

const DRAWER_BREAKPOINT_PX = 768;
const V1_BUTTON_COUNT      = 5;   // AC-01/02 invariant
const V1_GROUP_COUNT       = 3;   // AC-01 invariant
const LOCALE_CHANGE_EVENT  = 'vdg:locale-changed';

// Active v1 menu — 5 items, labelKey resolved via t() at render time.
const V1_ITEMS = [
  { group: 'workspace', route: '/dashboard',           labelKey: 'nav.workspace.dashboard',    icon: 'grid'   },
  { group: 'workspace', route: '/shipments',           labelKey: 'nav.workspace.shipments',    icon: 'ship'   },

  // F-24-09: allowRoles matches route-guard's /sales prefix map (SalesRep | Manager).
  { group: 'sales',     route: '/sales/me/pnl/new',           labelKey: 'nav.sales.create_pnl',       icon: 'tag',    allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
  { group: 'sales',     route: '/sales/me',            labelKey: 'nav.sales.my_pnl',           icon: 'doc',    allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
  { group: 'reports',   route: '/manager/reports/pnl', labelKey: 'nav.reports.pnl_report',     icon: 'dollar' },
  // F-23-04: accountant ledger browse — reuses the reports group (R-5 minimal change).
  // F-24-05: allowRoles opens this to Accountant too; managerOnly kept for the F-23-04
  // CDP button-count fixture (27-sidebar-v1-trim.js), superseded by allowRoles below.
  { group: 'reports',   route: '/accounting/ledger',   labelKey: 'nav.reports.ledger',    icon: 'doc', managerOnly: true, allowRoles: [ROLE_MANAGER, ROLE_ACCOUNTANT] },
  // F-23-05: financial reports (TB/P&L/BS) — same reports group; F-24-05 opens to Accountant
  { group: 'reports',   route: '/accounting/reports',  labelKey: 'nav.reports.financial', icon: 'doc', managerOnly: true, allowRoles: [ROLE_MANAGER, ROLE_ACCOUNTANT] },
  { group: 'reports',   route: '/manager/commission-rules', labelKey: 'nav.reports.comm_rules', icon: 'check', managerOnly: true, allowRoles: [ROLE_MANAGER] },
  // F-24-04: manager-only user CRUD — same reports group (R-5 minimal change, precedent above)
  { group: 'reports',   route: '/admin/users',         labelKey: 'nav.admin.users',       icon: 'db',  managerOnly: true },
  // Master data — customer list + future master entities. SalesRep is read-only in the
  // page itself (masters-customers.js gates Add/Edit/Delete behind isManager()), so opening
  // the nav to Sales just lets them find & browse; it doesn't grant CRUD.
  { group: 'masters',   route: '/masters/customers',   labelKey: 'nav.masters.customers', icon: 'db',  allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
  { group: 'masters',   route: '/masters/local-charges',    labelKey: 'nav.masters.local_charges', icon: 'db', allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
  { group: 'masters',   route: '/masters/units-of-measure', labelKey: 'nav.masters.units',         icon: 'db', allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
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
//   { route: '/sales/quote',     label: 'Quotes',       icon: 'quote', disabled: true },
//   { route: '/sales/quote/new', label: 'New Quote',    icon: 'plus',  disabled: true, sub: true },
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
//   { route: '/manager/dunning',              label: 'AR Dunning',         icon: 'alert',  sub: true },
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
    activeRoute: { type: String, state: true },
    _drawerOpen: { type: Boolean, state: true },
    _mobile:     { type: Boolean, state: true },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.activeRoute = location.hash.slice(1) || '/dashboard';
    this._drawerOpen = false;
    this._mobile     = window.innerWidth < DRAWER_BREAKPOINT_PX;

    this._onNav           = (e) => { this.activeRoute = e.detail.route; if (this._mobile) this._drawerOpen = false; this.requestUpdate(); };
    this._onBreakpt       = (e) => { this._mobile = e.detail.mobile; if (!this._mobile) this._drawerOpen = false; };
    this._onToggle        = () => { this._drawerOpen = !this._drawerOpen; };
    this._onBackdrop      = () => { this._drawerOpen = false; };
    this._onLocaleChanged = () => this.requestUpdate();
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('vdg:navigate',           this._onNav);
    window.addEventListener('vdg:breakpoint-changed', this._onBreakpt);
    window.addEventListener('vdg:sidebar-toggle',     this._onToggle);
    window.addEventListener(LOCALE_CHANGE_EVENT,      this._onLocaleChanged);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('vdg:navigate',           this._onNav);
    window.removeEventListener('vdg:breakpoint-changed', this._onBreakpt);
    window.removeEventListener('vdg:sidebar-toggle',     this._onToggle);
    window.removeEventListener(LOCALE_CHANGE_EVENT,      this._onLocaleChanged);
  }

  // F-24-05: Manager keeps folder-probe isManager() as the source of truth (unchanged);
  // everyone else reads the admin/users.jsonl role populated at boot.
  _effectiveRole() {
    return isManager() ? ROLE_MANAGER : currentUserRole();
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
        ${item.disabled ? html`<span class="text-[10px] uppercase tracking-wider text-slate-600">soon</span>` : ''}
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
          const visible = filterSidebarItems(V1_ITEMS, this._effectiveRole());
          let shown = 0;
          return V1_GROUPS.map((g) => {
            const items = visible.filter((i) => i.group === g.key);
            if (items.length === 0) return ''; // skip empty groups (e.g. masters for non-managers)
            const first = shown === 0;
            shown += 1;
            return html`
              <div data-nav-group="${g.key}">
                <div class="px-4 ${first ? 'pb-2' : 'pt-6 pb-2'} text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  ${t(g.headingKey)}
                </div>
                ${items.map((i) => this._renderItem(i))}
              </div>
            `;
          });
        })()}
      </nav>
      <div class="mt-auto px-4 py-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
        <span>VDG FreightForwarder</span>
        <span class="font-mono whitespace-nowrap" title="build ac9fb89">v0.1.38</span>
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
    return html`
      <aside class="w-60 shrink-0 h-screen bg-slate-900 text-slate-100 flex flex-col">
        ${this._renderNav()}
      </aside>`;
  }
}

customElements.define('vdg-sidebar', VdgSidebar);

// AC-07 test seam — fixture injection for managerOnly gate verification
window._vdgSidebarTest = { v1Items: V1_ITEMS, isManager };

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
${isManager() ? html`
  <div data-nav-group="manager">
    <div class="px-4 pt-6 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Manager</div>
    ${MANAGER_ITEMS.map((i) => this._renderItem(i))}
  </div>
` : ''}
*/
