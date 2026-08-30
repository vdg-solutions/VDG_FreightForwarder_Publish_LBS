import {
  bindLedgerRepo,
  ledgerRepo
} from "./chunk-IBTSRPFB.js";
import {
  bindNoteLines
} from "./chunk-SZYDA4BO.js";
import "./chunk-2X6PKTEY.js";
import {
  bindAirInvoiceComposer
} from "./chunk-PQJILZSQ.js";
import {
  bindLedgerComposer,
  bindLedgerPoster,
  bindLedgerReconciler,
  bindLedgerRepost,
  bindPeriodOpeningBalance
} from "./chunk-BRDPRF6R.js";
import {
  bindLedgerAggregator
} from "./chunk-FZUKIDAT.js";
import {
  bindDefaultCurrencyLock
} from "./chunk-CHLQ7LZW.js";
import {
  bindUserAuditLogComposer
} from "./chunk-GRBWOHUK.js";
import {
  jobTracker
} from "./chunk-K3L3PCZY.js";
import {
  bindManifestComposer
} from "./chunk-3FXNTAAE.js";
import {
  bindShipmentStateMigrator
} from "./chunk-NM5PQAZF.js";
import {
  bindUserProvisioning
} from "./chunk-RIGQBLAR.js";
import {
  freshViewRoot,
  markViewSuperseded
} from "./chunk-2PLULDG2.js";
import {
  bindAwbRepo
} from "./chunk-LEXYJ5I6.js";
import {
  bindAuditLog
} from "./chunk-VHCRHQI5.js";
import {
  bindNotificationComposer
} from "./chunk-NJVBPCWY.js";
import {
  LicenseReadOnlyError,
  PeriodLockedError,
  bindPeriodLockRegistry,
  bindWriteGate
} from "./chunk-XF5P4IGN.js";
import {
  bindCommissionCalculator,
  bindCommissionComposer
} from "./chunk-PJCMTW4C.js";
import {
  bindExceptionComposer
} from "./chunk-WZEL26N6.js";
import {
  bindBulkOrchestrator
} from "./chunk-U4F5HOXH.js";
import {
  bindErrorLogStore
} from "./chunk-PGOTV4PU.js";
import {
  bindBackupExporter
} from "./chunk-HNTJLHIX.js";
import {
  bindJobTracker
} from "./chunk-T3Z2RENW.js";
import {
  bindDashboardComposer
} from "./chunk-6Z6QDIFV.js";
import {
  MODE_LS_KEY,
  readMode,
  renderModeToggle
} from "./chunk-RE24EIGD.js";
import {
  bindAirPnlComposer,
  bindPnlComposer
} from "./chunk-V4KY2AGW.js";
import {
  bindArComposer
} from "./chunk-64ESJPEU.js";
import {
  bindPeriodClose
} from "./chunk-QL3VBJTQ.js";
import {
  bindDemDetComposer
} from "./chunk-A4QUGFDN.js";
import {
  bindDueSoon
} from "./chunk-REGXU2BV.js";
import {
  statusBadgeLabel
} from "./chunk-VRYVVURA.js";
import {
  bindSalesAnalyticsCompute
} from "./chunk-7472JIPV.js";
import {
  bindQuoteVoidDelete
} from "./chunk-RNW6UNLW.js";
import {
  bindRepoQuery
} from "./chunk-EPS4ANRF.js";
import {
  bindMasterDeduper
} from "./chunk-ENSWK7L6.js";
import {
  bindUserDirectory,
  listUsers
} from "./chunk-XVWG4BTC.js";
import {
  bindBillingPublish
} from "./chunk-SXXIG76D.js";
import {
  ROLE_CACHE_KEY,
  bindFsmAutoAdvance,
  bindIdentityProvider,
  bindJobNoGen,
  bindPnlCommit,
  bindPnlLineId,
  bindQuoteTotals,
  bindRepCodeRegistry,
  bindWmaEngine,
  bindWmaStore,
  getCurrentUser,
  loadKindWmaState,
  onEvent,
  pnlLineId,
  rebuildSessionFromStoredToken,
  saveKindWmaState,
  signOut,
  wasPreviouslySignedIn
} from "./chunk-JAUWUVEL.js";
import {
  bindPnlGate
} from "./chunk-Z6T6WECV.js";
import {
  bindUsersViewComposer
} from "./chunk-P5SY6HRX.js";
import {
  bindAirRateCalculator
} from "./chunk-WKFYYEZM.js";
import {
  bindWorkspaceSettings
} from "./chunk-IIUQ3SOM.js";
import {
  toLocalDateStr,
  todayLocal
} from "./chunk-7INC2TTZ.js";
import {
  bindSalesRepDerivation
} from "./chunk-BDMZBHS4.js";
import {
  bindQuoteOrchestrator
} from "./chunk-5UHUC2YB.js";
import {
  UNKNOWN_USER_ID,
  bindRouteGuard,
  currentUserEmail,
  currentUserRole,
  currentUserRoles,
  filterSidebarItems,
  homeRouteForRole,
  normalizeRole,
  routeGuard
} from "./chunk-M3ODLRBG.js";
import {
  ROLES_RESOLVED_EVENT,
  ROLE_ACCOUNTANT,
  ROLE_AUDITOR,
  ROLE_CUSTOMER_SERVICE,
  ROLE_MANAGER,
  ROLE_READ_ONLY,
  ROLE_SALES_MANAGER,
  ROLE_SALES_REP
} from "./chunk-NGKBNKFN.js";
import {
  bindShipmentVoidDelete
} from "./chunk-44LRVLWO.js";
import {
  bindActionGuard,
  can
} from "./chunk-GOIBPTZO.js";
import {
  bindFsmIngest,
  rehydrateFsmStates
} from "./chunk-VTRTBWKI.js";
import {
  initRouter,
  navigate
} from "./chunk-H2H4WJDI.js";
import {
  bindShipmentStateAliases
} from "./chunk-FJ72A4AS.js";
import {
  bindWasmLoader
} from "./chunk-EJWPNW2L.js";
import {
  bindDocumentBoardComposer
} from "./chunk-KRST3G4J.js";
import {
  bindAuthGate,
  requireAuth
} from "./chunk-2LU3BLTO.js";
import {
  API_BASE,
  activeWorkspaceName
} from "./chunk-O35WEKMP.js";
import {
  bindFxRateRepo,
  fxRateRepo
} from "./chunk-KQNTGIY5.js";
import {
  bindCustomer360Composer
} from "./chunk-TE5ZYPE3.js";
import {
  KIND_SHIPMENT,
  REVENUE_SEEN,
  bindShipmentRepo,
  deleteShipment,
  putEnvelope,
  putShipment
} from "./chunk-U4BJYZQA.js";
import {
  bindSalesRegistry
} from "./chunk-YFN2XPGT.js";
import {
  bindMasterRegistry
} from "./chunk-T2XEYG3A.js";
import {
  bindSessionRoles,
  currentRoles,
  currentRolesResolved,
  currentSalesRepId,
  hasRole
} from "./chunk-NQTRREKJ.js";
import {
  bindGrid
} from "./chunk-7DW526V3.js";
import {
  SAFE_AWAIT_DEFAULT_MS,
  SafeAwaitTimeoutError,
  bindLog,
  bindTimer,
  safeAwait,
  startInterval,
  stopInterval
} from "./chunk-JAZY43GR.js";
import "./chunk-HKNQBDY4.js";
import {
  bindAppEvents,
  bindClock,
  bindHttp,
  bindWasmFormat,
  currentLocale,
  fmtDate,
  loadLocale,
  nowMs,
  t
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/ui/bootstrap/components/sidebar.js
import { LitElement, html, css } from "https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm";

// output/web/js.tmp/implementations/ui/bootstrap/components/sidebar-collapse-state.js
var SIDEBAR_COLLAPSED_KEY = "vdg.sidebar.collapsed";
function parseCollapsed(raw) {
  if (!raw) return /* @__PURE__ */ new Set();
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return /* @__PURE__ */ new Set();
    return new Set(arr.filter((k) => typeof k === "string"));
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
function serializeCollapsed(set) {
  return JSON.stringify([...set]);
}
function toggleCollapsed(set, key) {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}
function isGroupCollapsed(collapsedSet, groupKey, activeGroupKey2) {
  return collapsedSet.has(groupKey) && groupKey !== activeGroupKey2;
}
function activeGroupKey(items, activeRoute) {
  const match = items.find((i) => i.route === activeRoute);
  return match ? match.group : null;
}
var DESKTOP_COLLAPSED_KEY = "vdg.sidebar.desktop_collapsed";
function parseDesktopCollapsed(raw) {
  return raw === "true";
}
function serializeDesktopCollapsed(collapsed) {
  return String(!!collapsed);
}

// output/web/js.tmp/implementations/ui/bootstrap/components/sidebar-items.js
var V1_ITEMS = [
  // #15: matches the /dashboard route-guard entry (nav-gates KEEP-CONSISTENT-WITH-route-guard)
  { group: "workspace", route: "/dashboard", labelKey: "nav.workspace.dashboard", icon: "grid", allowRoles: [ROLE_MANAGER, ROLE_ACCOUNTANT] },
  // #57: matches the /shipments route-guard entry (nav-gates KEEP-CONSISTENT-WITH-route-guard).
  // Was unrestricted here — Accountant/Auditor/ReadOnly all saw a menu item that access_policy.rs
  // now denies them, the exact "visible item that always fails" shape F-57-01 already fixed once.
  {
    group: "workspace",
    route: "/shipments",
    labelKey: "nav.workspace.shipments",
    icon: "ship",
    allowRoles: [ROLE_CUSTOMER_SERVICE, ROLE_AUDITOR, ROLE_SALES_REP, ROLE_SALES_MANAGER, ROLE_MANAGER, ROLE_AUDITOR]
  },
  // F-14-09 (owner 2026-08-28, international-standard derivation): exception-driven ops is a
  // daily screen in CargoWise/Magaya — past-ETD/missing-doc/overdue-milestone triage, the
  // highest-value of the eight deferred Manager screens. Ordered above "create shipment" — a
  // continuous triage view gets more daily touches than a per-job one-off action. No narrower
  // rule exists for "/manager/exceptions" in access_policy.rs, so it falls to the broad "/manager"
  // rule; allowRoles matches that exactly.
  { group: "workspace", route: "/manager/exceptions", labelKey: "nav.manager.exceptions", icon: "alert", allowRoles: [ROLE_MANAGER] },
  // F-37-03: CS opens a job before a rep is named, so creating one is workspace work and sits with
  // the shipment list rather than in the Sales group. Its allowRoles is the /shipments reader set.
  {
    group: "workspace",
    route: "/shipments/new",
    labelKey: "nav.sales.create_shipment",
    icon: "tag",
    allowRoles: [ROLE_CUSTOMER_SERVICE, ROLE_SALES_REP, ROLE_SALES_MANAGER, ROLE_MANAGER]
  },
  // F-24-09: allowRoles matches route-guard's /sales prefix map (SalesRep | Manager).
  { group: "sales", route: "/sales/me", labelKey: "nav.sales.my_shipments", icon: "doc", allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
  // F-42-04: the quote list had no nav entry at all — the topbar's "new quote" button created
  // deals that only a typed URL could find again, and step 1 of the sales flow (quote -> job)
  // was a one-way street. Owner 2026-08-15, on being shown the gap: "không có".
  // F-42-06 (owner: "báo giá là chỉ sales làm nha"): the sales desk only — KEEP-CONSISTENT-WITH
  // access_policy.rs's "/sales/quote" rule. A Manager who also sells holds SalesRep on their user
  // record and gets the entry through that hat, not through being the manager.
  { group: "sales", route: "/sales/quote", labelKey: "nav.sales.quotes", icon: "quote", allowRoles: [ROLE_SALES_REP, ROLE_SALES_MANAGER, ROLE_AUDITOR] },
  // F-14-03 (owner 2026-08-28: "duyệt giá" must reach the UI) — price-override queue existed since
  // E-14 (FSM + quote.rs OVERRIDE_THRESHOLD_PCT), URL-only. allowRoles = access_policy.rs's rule.
  { group: "sales", route: "/manager/approvals", labelKey: "nav.manager.approvals", icon: "alert", allowRoles: [ROLE_SALES_MANAGER] },
  // F-41 (owner 2026-08-28) — team leaderboard restricted to SalesManager+Accountant; never had a nav entry.
  { group: "sales", route: "/sales/analytics", labelKey: "nav.sales.analytics", icon: "dollar", allowRoles: [ROLE_SALES_MANAGER, ROLE_ACCOUNTANT] },
  // F-57-01: was ungated, so filterSidebarItems showed "P&L Report" to every role including
  // ReadOnly — the view's own manager-only check then bounced them to /dashboard with no
  // explanation. A visible menu item that always fails. Now matches the /manager route-guard
  // prefix (nav-gates KEEP-CONSISTENT-WITH-route-guard).
  { group: "reports", route: "/manager/reports/pnl", labelKey: "nav.reports.pnl_report", icon: "dollar", managerOnly: true, allowRoles: [ROLE_MANAGER] },
  // F-23-04: accountant ledger browse — reuses the reports group (R-5 minimal change).
  // F-24-05: allowRoles opens this to Accountant too; managerOnly kept for the F-23-04
  // CDP button-count fixture (27-sidebar-v1-trim.js), superseded by allowRoles below.
  { group: "reports", route: "/accounting/ledger", labelKey: "nav.reports.ledger", icon: "doc", managerOnly: true, allowRoles: [ROLE_MANAGER, ROLE_ACCOUNTANT, ROLE_AUDITOR] },
  // F-23-05: financial reports (TB/P&L/BS) — same reports group; F-24-05 opens to Accountant
  { group: "reports", route: "/accounting/reports", labelKey: "nav.reports.financial", icon: "doc", managerOnly: true, allowRoles: [ROLE_MANAGER, ROLE_ACCOUNTANT, ROLE_AUDITOR] },
  // F-14-05 / F1 (owner 2026-08-28) — AR/AP + FX revaluation summary had no nav entry; Manager only,
  // matching the /manager route-guard prefix (Accountant gap flagged, out of scope tonight).
  { group: "reports", route: "/manager/finance/cash-flow", labelKey: "nav.manager.cash_flow", icon: "dollar", allowRoles: [ROLE_MANAGER] },
  // F-14-08 (owner 2026-08-28, international-standard derivation): commission accrues per
  // shipment, then a monthly payout run settles it — standard practice. Ordered before period
  // close: settlement runs, then the books lock. Owner doctrine (2026-08-29): settling posts to
  // the ledger, so access_policy.rs's "/manager/finance/commissions" rule now also admits
  // Accountant; allowRoles matches that exactly.
  { group: "reports", route: "/manager/finance/commissions", labelKey: "nav.manager.commissions", icon: "check", allowRoles: [ROLE_MANAGER, ROLE_ACCOUNTANT] },
  // F-14-11 (owner 2026-08-28, international-standard derivation): period close is a mandatory
  // accounting function, and the F1 period-end FX revaluation hooks into exactly this operation —
  // a feature with no way to reach it is not shipped. Ordered last in the monthly close workflow,
  // after commission settlement. No narrower rule for "/manager/finance/close-period" — falls to
  // the broad "/manager" rule; allowRoles matches that exactly.
  { group: "reports", route: "/manager/finance/close-period", labelKey: "nav.manager.close_period", icon: "lock", allowRoles: [ROLE_MANAGER] },
  // #31: finance policy the ACCOUNTANT owns (default P&L currency). Not under /manager — that
  // prefix is Manager-only in access_policy.rs, which would lock out the very role that sets it.
  { group: "reports", route: "/accounting/settings", labelKey: "nav.accounting.settings", icon: "db", managerOnly: true, allowRoles: [ROLE_MANAGER, ROLE_ACCOUNTANT] },
  // Owner 2026-08-28: "masters" grouped these by CODE MODULE, not who uses them together — a rep
  // checks a rate WHILE quoting, not "goes to do masters". Moved beside that workflow, collapsed
  // by default (a lookup, not hourly); SalesRep stays read-only (writes still gated in-page).
  { group: "sales_reference", route: "/masters/customers", labelKey: "nav.masters.customers", icon: "db", allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
  { group: "sales_reference", route: "/masters/local-charges", labelKey: "nav.masters.local_charges", icon: "db", allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
  // E-26 F-26-04: ocean-carrier master, looked up when quoting like local-charges/units
  { group: "sales_reference", route: "/masters/ocean-carriers", labelKey: "nav.masters.ocean_carriers", icon: "db", allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
  // F-28-15: ocean-tariff priced kind, carrier-joined view — writers mirror ocean-carriers
  { group: "sales_reference", route: "/masters/ocean-tariff", labelKey: "nav.masters.ocean_tariff", icon: "db", allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
  { group: "sales_reference", route: "/masters/units-of-measure", labelKey: "nav.masters.units", icon: "db", allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
  // Manager-only config, touched rarely — administering the workspace (role.rs) is a different
  // job from running or pricing the sales team above.
  { group: "admin", route: "/manager/commission-rules", labelKey: "nav.reports.comm_rules", icon: "check", managerOnly: true, allowRoles: [ROLE_MANAGER] },
  // F-24-04: manager-only user CRUD
  { group: "admin", route: "/admin/users", labelKey: "nav.admin.users", icon: "db", managerOnly: true },
  // F-29-10: FX admin was route-only (no sidebar entry) — Manager-only config, not a sales lookup.
  { group: "admin", route: "/manager/fx-rates", labelKey: "nav.masters.fx_rates", icon: "db", managerOnly: true, allowRoles: [ROLE_MANAGER] },
  // F-18-11: alias-editor only (writers manager-only, Q3) — no browse value for SalesRep.
  { group: "admin", route: "/masters/shipment-states", labelKey: "nav.masters.shipment_states", icon: "db", managerOnly: true, allowRoles: [ROLE_MANAGER] },
  // F-14-12 (owner 2026-08-28, international-standard derivation): standard compliance
  // requirement, but low frequency — belongs behind the collapsed Administration group rather
  // than competing with daily work, so it sits last. No narrower rule for "/manager/audit" in
  // access_policy.rs — falls to the broad "/manager" rule; allowRoles matches that exactly.
  { group: "admin", route: "/manager/audit", labelKey: "nav.manager.audit", icon: "doc", allowRoles: [ROLE_MANAGER] }
];
var V1_GROUPS = [
  { key: "workspace", headingKey: "nav.group.workspace" },
  { key: "sales", headingKey: "nav.group.sales" },
  { key: "sales_reference", headingKey: "nav.group.sales_reference" },
  { key: "reports", headingKey: "nav.group.reports" },
  { key: "admin", headingKey: "nav.group.admin" }
];

// output/web/js.tmp/implementations/ui/bootstrap/components/sidebar.js
var DRAWER_BREAKPOINT_PX = 768;
var LOCALE_CHANGE_EVENT = "vdg:locale-changed";
var CHEVRON_EXPANDED = "\u25BE";
var CHEVRON_COLLAPSED = "\u25B8";
var DEFAULT_COLLAPSED_GROUPS = ["sales_reference", "admin"];
var ICONS = {
  grid: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>',
  alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  ship: '<path d="M3 18a9 9 0 0 0 18 0M3 18l1.5-5h15L21 18M6 13V7h12v6M9 7V4h6v3"/>',
  upload: '<path d="M12 3v12m0-12l-4 4m4-4l4 4M5 21h14"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  dollar: '<path d="M12 2v20M17 7H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H7"/>',
  tag: '<path d="M3 12V3h9l9 9-9 9-9-9z"/><circle cx="7" cy="7" r="1.5"/>',
  quote: '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>',
  db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'
};
var VdgSidebar = class extends LitElement {
  static styles = css`
    :host { display: block; }
  `;
  static properties = {
    activeRoute: { type: String, state: true },
    _drawerOpen: { type: Boolean, state: true },
    _mobile: { type: Boolean, state: true },
    _collapsed: { state: true },
    // Set<string> of collapsed group keys
    _desktopCollapsed: { type: Boolean, state: true }
    // F-43-01 AC-04
  };
  createRenderRoot() {
    return this;
  }
  constructor() {
    super();
    this.activeRoute = location.hash.slice(1) || "/dashboard";
    this._drawerOpen = false;
    this._mobile = window.innerWidth < DRAWER_BREAKPOINT_PX;
    this._collapsed = new Set(DEFAULT_COLLAPSED_GROUPS);
    this._desktopCollapsed = false;
    this._onNav = (e) => {
      this.activeRoute = e.detail.route;
      if (this._mobile) this._drawerOpen = false;
      this.requestUpdate();
    };
    this._onBreakpt = (e) => {
      this._mobile = e.detail.mobile;
      if (!this._mobile) this._drawerOpen = false;
    };
    this._onToggle = () => {
      if (this._mobile) {
        this._drawerOpen = !this._drawerOpen;
        return;
      }
      this._desktopCollapsed = !this._desktopCollapsed;
      try {
        localStorage.setItem(DESKTOP_COLLAPSED_KEY, serializeDesktopCollapsed(this._desktopCollapsed));
      } catch {
      }
    };
    this._onBackdrop = () => {
      this._drawerOpen = false;
    };
    this._onLocaleChanged = () => this.requestUpdate();
    this._onRolesResolved = () => this.requestUpdate();
    this._onGroupToggle = (key) => {
      this._collapsed = toggleCollapsed(this._collapsed, key);
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, serializeCollapsed(this._collapsed));
      } catch {
      }
      this.requestUpdate();
    };
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("vdg:navigate", this._onNav);
    window.addEventListener("vdg:breakpoint-changed", this._onBreakpt);
    window.addEventListener("vdg:sidebar-toggle", this._onToggle);
    window.addEventListener(LOCALE_CHANGE_EVENT, this._onLocaleChanged);
    window.addEventListener(ROLES_RESOLVED_EVENT, this._onRolesResolved);
    try {
      const raw = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      this._collapsed = raw ? parseCollapsed(raw) : new Set(DEFAULT_COLLAPSED_GROUPS);
    } catch {
      this._collapsed = new Set(DEFAULT_COLLAPSED_GROUPS);
    }
    try {
      this._desktopCollapsed = parseDesktopCollapsed(localStorage.getItem(DESKTOP_COLLAPSED_KEY));
    } catch {
      this._desktopCollapsed = false;
    }
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("vdg:navigate", this._onNav);
    window.removeEventListener("vdg:breakpoint-changed", this._onBreakpt);
    window.removeEventListener("vdg:sidebar-toggle", this._onToggle);
    window.removeEventListener(LOCALE_CHANGE_EVENT, this._onLocaleChanged);
    window.removeEventListener(ROLES_RESOLVED_EVENT, this._onRolesResolved);
  }
  // #28: the role SET from the staff table (grants/). A user holding several roles sees the union of
  // their items — a manager who also does sales gets both menus.
  _effectiveRoles() {
    const roles = currentUserRoles();
    if (roles.length) return roles;
    return [normalizeRole(currentUserRole())];
  }
  _renderItem(item) {
    const isActive = this.activeRoute === item.route;
    const cls = isActive ? "bg-slate-800 text-white border-l-2 border-blue-400" : "text-slate-400 hover:text-white hover:bg-slate-800/60 border-l-2 border-transparent";
    const disabledCls = item.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer";
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
        <span class="flex-1 text-left truncate ${item.sub ? "text-slate-400" : ""}">${text}</span>
        ${item.disabled ? html`<span class="text-[10px] uppercase tracking-wider text-slate-600">${t("sidebar.badge.soon")}</span>` : ""}
      </button>
    `;
  }
  _icon(name) {
    const svg2 = document.createElement("template");
    svg2.innerHTML = ICONS[name] || "";
    return svg2.content;
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
      if (visible.length === 0) {
        const msgKey = currentRolesResolved() ? "nav.access.denied" : "nav.access.unreachable";
        return html`<div class="px-4 py-3 text-xs text-slate-400" role="status">${t(msgKey)}</div>`;
      }
      const activeGroup = activeGroupKey(visible, this.activeRoute);
      let shown = 0;
      return V1_GROUPS.map((g) => {
        const items = visible.filter((i) => i.group === g.key);
        if (items.length === 0) return "";
        const first = shown === 0;
        shown += 1;
        const collapsed = isGroupCollapsed(this._collapsed, g.key, activeGroup);
        return html`
              <div data-nav-group="${g.key}">
                <button type="button" data-nav-toggle="${g.key}"
                  class="w-full flex items-center justify-between px-4 ${first ? "pb-2" : "pt-6 pb-2"} text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300"
                  aria-expanded=${collapsed ? "false" : "true"}
                  @click=${() => this._onGroupToggle(g.key)}>
                  <span>${t(g.headingKey)}</span>
                  <span aria-hidden="true">${collapsed ? CHEVRON_COLLAPSED : CHEVRON_EXPANDED}</span>
                </button>
                ${collapsed ? "" : items.map((i) => this._renderItem(i))}
              </div>
            `;
      });
    })()}
      </nav>
      <div class="mt-auto px-4 py-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
        <span>VDG FreightForwarder</span>
        <span class="font-mono whitespace-nowrap" title="build 43e446a3">v0.4.38 (43e446a3)</span>
      </div>
    `;
  }
  render() {
    if (this._mobile) {
      return html`
        ${this._drawerOpen ? html`
          <div class="fixed inset-0 z-[1000] flex">
            <aside class="w-64 bg-slate-900 text-slate-100 flex flex-col h-full shadow-2xl"
                   data-drawer="true">
              ${this._renderNav()}
            </aside>
            <div class="flex-1 bg-black/40" @click="${this._onBackdrop}"></div>
          </div>` : ""}`;
    }
    if (this._desktopCollapsed) return html``;
    return html`
      <aside class="w-60 shrink-0 h-screen bg-slate-900 text-slate-100 flex flex-col">
        ${this._renderNav()}
      </aside>`;
  }
};
customElements.define("vdg-sidebar", VdgSidebar);
window._vdgSidebarTest = { v1Items: V1_ITEMS, hasRole };

// output/web/js.tmp/implementations/ui/bootstrap/components/topbar.js
import { LitElement as LitElement2, html as html4 } from "https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm";

// output/web/js.tmp/implementations/storage/core_abstractions/profile-cache.js
var PROFILE_KEY = "vdg.auth.profile";
var _impl = null;
function bindProfileCache(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("storage/profile-cache: no adapter bound (the storage bootstrap binds it)");
  return _impl;
}
var readCachedProfile = (...a) => _i().readCachedProfile(...a);
var writeCachedProfile = (...a) => _i().writeCachedProfile(...a);

// output/web/js.tmp/implementations/ui/bootstrap/components/breadcrumb-resolver.js
var I18N_ROUTES = [
  { pattern: /^(#\/?)?$/, group: "nav.group.workspace", viewKey: "nav.workspace.dashboard" },
  { pattern: /^#\/dashboard$/, group: "nav.group.workspace", viewKey: "nav.workspace.dashboard" },
  { pattern: /^#\/shipments$/, group: "nav.group.workspace", viewKey: "nav.workspace.shipments" },
  { pattern: /^#\/sales\/new$/, group: "nav.group.sales", viewKey: "nav.sales.create_shipment" },
  { pattern: /^#\/sales\/me$/, group: "nav.group.sales", viewKey: "nav.sales.my_shipments" },
  // F-37-03: creating a shipment belongs to the workspace, not to a rep's corner of it — CS opens
  // this screen too, and the old /sales/:salesId/pnl/new said the job was already somebody's.
  { pattern: /^#\/shipments\/new$/, group: "nav.group.workspace", viewKey: "nav.sales.create_shipment" },
  { pattern: /^#\/sales\/edit\/(.+)$/, group: "nav.group.sales", viewKey: "nav.sales.edit_shipment", paramKey: "ref" },
  { pattern: /^#\/masters\/customers$/, group: "nav.group.masters", viewKey: "nav.masters.customers" },
  { pattern: /^#\/masters\/ocean-carriers$/, group: "nav.group.masters", viewKey: "nav.masters.ocean_carriers" },
  { pattern: /^#\/manager\/reports\/pnl$/, group: "nav.group.reports", viewKey: "nav.reports.pnl_report" },
  // Same shape as the P&L route above (group 'nav.group.reports' = "Kế toán") — viewKey reuses
  // ledger-viewer.js's own page-heading key rather than nav.reports.ledger, which is a single
  // pre-combined "Kế toán / Sổ cái" string for the sidebar's one-line label, not a group/view pair.
  { pattern: /^#\/accounting\/ledger$/, group: "nav.group.reports", viewKey: "ledger.title" },
  { pattern: /^#\/manager\/fx-rates$/, group: "nav.group.manager", viewKey: "nav.manager.fx_rates" },
  { pattern: /^#\/manager\/settings$/, group: "nav.group.manager", viewKey: "nav.manager.settings" },
  { pattern: /^#\/manager\/awb$/, group: "nav.group.manager", viewKey: "awb.admin.title" }
];
var STATIC_ROUTES = [
  { pattern: /^#\/upload$/, group: "nav.group.workspace", viewKey: "nav.workspace.excel_import" },
  { pattern: /^#\/sales\/quote\/new$/, group: "nav.group.sales", viewKey: "nav.sales.new_quote" },
  { pattern: /^#\/sales\/quote$/, group: "nav.group.sales", viewKey: "nav.sales.quotations" },
  { pattern: /^#\/masters\/customers$/, group: "nav.group.masters", viewKey: "nav.masters.customers" },
  { pattern: /^#\/masters\/carriers$/, group: "nav.group.masters", viewKey: "nav.masters.carriers" },
  { pattern: /^#\/masters\/services$/, group: "nav.group.masters", viewKey: "nav.masters.services" },
  { pattern: /^#\/masters\/airports$/, group: "nav.group.masters", viewKey: "nav.masters.airports" },
  { pattern: /^#\/masters\/flights$/, group: "nav.group.masters", viewKey: "nav.masters.flights" },
  { pattern: /^#\/masters\/airline-carriers$/, group: "nav.group.masters", viewKey: "nav.masters.airline_carriers" },
  { pattern: /^#\/masters\/uld-types$/, group: "nav.group.masters", viewKey: "nav.masters.uld_types" },
  { pattern: /^#\/masters\/air-rates$/, group: "nav.group.masters", viewKey: "nav.masters.air_rates" },
  { pattern: /^#\/quotes\/air-calc$/, group: "nav.group.quotes", viewKey: "nav.quotes.air_calc" },
  { pattern: /^#\/manager\/manifest$/, group: "nav.group.manager", viewKey: "nav.manager.manifest" },
  { pattern: /^#\/manager\/air-invoice$/, group: "nav.group.manager", viewKey: "nav.manager.air_invoice" },
  { pattern: /^#\/help$/, group: "nav.group.workspace", viewKey: "nav.workspace.help" },
  { pattern: /^#\/manager\/dashboard$/, group: "nav.group.manager", viewKey: "nav.manager.workspace" },
  { pattern: /^#\/manager\/pipeline$/, group: "nav.group.manager", viewKey: "nav.manager.pipeline" },
  { pattern: /^#\/manager\/approvals$/, group: "nav.group.manager", viewKey: "nav.manager.approvals" },
  { pattern: /^#\/manager\/finance\/cash-flow$/, group: "nav.group.manager", viewKey: "nav.manager.cash_flow" },
  { pattern: /^#\/manager\/finance\/close-period$/, group: "nav.group.manager", viewKey: "nav.manager.close_period" },
  { pattern: /^#\/manager\/audit$/, group: "nav.group.manager", viewKey: "nav.manager.audit" },
  { pattern: /^#\/manager\/notifications$/, group: "nav.group.manager", viewKey: "nav.manager.notifications" },
  { pattern: /^#\/manager\/sales$/, group: "nav.group.manager", viewKey: "nav.manager.sales_perf" },
  { pattern: /^#\/manager\/finance\/commissions$/, group: "nav.group.manager", viewKey: "nav.manager.commissions" },
  { pattern: /^#\/manager\/exceptions$/, group: "nav.group.manager", viewKey: "nav.manager.exceptions" },
  { pattern: /^#\/manager\/masters\/customers$/, group: "nav.group.manager", viewKey: "nav.manager.customer_master" },
  { pattern: /^#\/manager\/masters\/carriers$/, group: "nav.group.manager", viewKey: "nav.manager.carrier_master" },
  { pattern: /^#\/manager\/masters\/users$/, group: "nav.group.manager", viewKey: "nav.manager.user_master" },
  { pattern: /^#\/manager\/errors$/, group: "nav.group.manager", viewKey: "nav.manager.errors" }
];
var ROUTES = [...I18N_ROUTES, ...STATIC_ROUTES];
var FALLBACK_GROUP = "nav.group.workspace";
var FALLBACK_VIEW = "nav.workspace.dashboard";
function resolveBreadcrumb(hash, _locale, t2) {
  const h = (hash == null ? "" : String(hash)).split("?")[0];
  for (const route of ROUTES) {
    const m = h.match(route.pattern);
    if (m) {
      let view = t2(route.viewKey);
      if (route.paramKey && m[1]) view = view.replace(`{${route.paramKey}}`, m[1]);
      return { group: t2(route.group), view };
    }
  }
  return { group: t2(FALLBACK_GROUP), view: t2(FALLBACK_VIEW) };
}

// output/web/js.tmp/implementations/ui/bootstrap/components/topbar-sync-chip.js
var SYNC_STUCK_NOTIFY_MS = 5 * 6e4;
var DOT_CLASS = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  backing_up: "bg-amber-400",
  orange: "bg-orange-500",
  red: "bg-red-500",
  pending: "bg-slate-400",
  // F-50-01 — calm, distinct from red: expected structural wait, not a failure
  quarantined: "bg-rose-700",
  // a decided, permanent refusal (outbox.rs::quarantine_group) —
  // its own shade, never the plain 'red' used for an ordinary
  // offline/reconnect wait that resolves on its own
  unreachable: "bg-red-500"
  // H4-b: the server cannot be reached at all — as alarming as
  // offline, but its own STATE key so decideChipAction/tooltip
  // never reuse the signin/reconnect wording 'red' carries
};
var STATE_TO_LABEL_KEY = {
  green: "healthy",
  yellow: "flushing",
  backing_up: "backing_up",
  orange: "retrying",
  red: "offline",
  pending: "auth_pending",
  // F-50-01 AC-10 — distinct key, never reuses offline/healthy
  quarantined: "quarantined",
  unreachable: "unreachable"
  // H4-b — own key, never folded into 'offline' or 'retrying'
};
function buildAriaLabel(state, outboxCount, t2, serverBacklog = 0) {
  const key = STATE_TO_LABEL_KEY[state] ?? "healthy";
  let suffix = "";
  if (outboxCount > 0) {
    suffix = ` (${t2("topbar.sync.tooltip.pending").replace("{n}", outboxCount)})`;
  } else if (state === "backing_up" && serverBacklog > 0) {
    suffix = ` (${serverBacklog})`;
  }
  return `${t2("topbar.sync.label")} \u2014 ${t2(`topbar.sync.state.${key}`)}${suffix}`;
}
function computeChipState({
  pending,
  syncFailed,
  unreachable = false,
  quarantined,
  backoff429,
  offline,
  signedOut,
  lastSyncMs,
  now,
  authReconnect,
  authPending,
  serverBacklog = 0,
  serverOldestPendingAgeMs = null,
  serverProvider = "Google Drive"
}) {
  if (authReconnect) return "red";
  if (offline || signedOut) return "red";
  if (pending > 0 && lastSyncMs > 0 && now - lastSyncMs > SYNC_STUCK_NOTIFY_MS) return "red";
  if (quarantined) return "quarantined";
  if (authPending) return "pending";
  if (unreachable) return "unreachable";
  if (serverOldestPendingAgeMs !== null && serverOldestPendingAgeMs !== void 0 && serverOldestPendingAgeMs > 3e5) {
    return "orange";
  }
  if (backoff429) return "orange";
  if (syncFailed) return "orange";
  if (pending > 0 && lastSyncMs === 0) return "yellow";
  if (pending > 0) return "yellow";
  if (serverBacklog > 0) return "backing_up";
  return "green";
}
function displayLastSyncMs(pushMs, pullMs) {
  return Math.max(pushMs || 0, pullMs || 0);
}
function formatLastSyncAgo(lastSyncMs, now) {
  if (!lastSyncMs) return null;
  const s = Math.round((now - lastSyncMs) / 1e3);
  if (s < 60) return `${s}s`;
  return `${Math.round(s / 60)}m`;
}
function shouldFireStuckNotification({ now, lastSyncMs, pending, lastNotifiedStuckEpisode, permission }) {
  if (permission !== "granted") return false;
  if (pending <= 0) return false;
  if (!lastSyncMs || now - lastSyncMs <= SYNC_STUCK_NOTIFY_MS) return false;
  return lastSyncMs !== lastNotifiedStuckEpisode;
}
function buildChipTitle({
  state,
  ago,
  lastError,
  t: t2,
  user,
  online,
  authReconnect,
  popupBlocked,
  quarantinedCount = 0,
  serverBacklog = 0,
  serverOldestPendingAgeMs = null,
  serverProvider = "Google Drive"
}) {
  if (state === "red" && popupBlocked) return t2("auth.popup_blocked");
  if (state === "red" && authReconnect) return t2("topbar.sync.tooltip.reconnect");
  if (state === "red" && !user) return t2("topbar.sync.tooltip.click_to_signin");
  if (state === "red" && !online) return t2("topbar.sync.tooltip.waiting_network");
  if (state === "quarantined") return t2("topbar.sync.tooltip.quarantined").replace("{n}", String(quarantinedCount));
  if (state === "pending") return t2("topbar.sync.tooltip.auth_pending");
  if (state === "backing_up") {
    return t2("topbar.sync.tooltip.backing_up").replace("{provider}", serverProvider || "Google Drive").replace("{n}", String(serverBacklog));
  }
  if (state === "orange" && serverOldestPendingAgeMs !== null && serverOldestPendingAgeMs !== void 0 && serverOldestPendingAgeMs > 3e5) {
    return t2("topbar.sync.tooltip.backup_retry").replace("{provider}", serverProvider || "Google Drive");
  }
  const stateKey = STATE_TO_LABEL_KEY[state] ?? "healthy";
  const stateText = t2(`topbar.sync.state.${stateKey}`);
  if (state === "green") {
    if (serverProvider) {
      return t2("topbar.sync.tooltip.healthy_secondary").replace("{provider}", serverProvider);
    }
    return ago ? t2("topbar.sync.tooltip.lastSync").replace("{ago}", ago) : t2("topbar.sync.tooltip.lastSync.never");
  }
  if (lastError && (state === "orange" || state === "red" || state === "unreachable")) {
    return `${stateText} \u2014 ${lastError}`;
  }
  return stateText;
}
function renderSyncChip({
  html: html12,
  state,
  pending,
  lastSyncMs,
  now,
  online,
  ariaLabel,
  labelText,
  lastError,
  t: t2,
  onSyncNow,
  user,
  authReconnect,
  popupBlocked,
  quarantinedCount = 0,
  serverBacklog = 0,
  serverOldestPendingAgeMs = null,
  serverProvider = "Google Drive",
  syncing = false
  // vdg:sync-started (charter_event_bridge.rs) — a pass is in flight even with no backlog
}) {
  const dotClass = DOT_CLASS[state] ?? DOT_CLASS.green;
  const isFlushing = state === "yellow" || syncing;
  const hasPending = pending > 0;
  const pulseClass = hasPending || syncing ? "animate-pulse" : "";
  const ago = formatLastSyncAgo(lastSyncMs, now);
  const titleText = buildChipTitle({
    state,
    ago,
    lastError,
    t: t2,
    user,
    online,
    authReconnect,
    popupBlocked,
    quarantinedCount,
    serverBacklog,
    serverOldestPendingAgeMs,
    serverProvider
  });
  return html12`
    <button type="button"
            data-sync-chip
            class="sync-chip hidden md:inline-flex h-9 items-center gap-1.5 px-2.5 rounded-md
                   text-[11px] font-medium text-slate-600 hover:bg-slate-100
                   focus-visible:ring-2 focus-visible:ring-blue-500 transition"
            role="button"
            tabindex="0"
            aria-label="${ariaLabel}"
            aria-busy="${isFlushing ? "true" : "false"}"
            title="${titleText}"
            @click="${onSyncNow}">
      ${authReconnect ? html12`<svg class="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>` : html12`<span class="w-2 h-2 rounded-full ${dotClass} ${pulseClass}" aria-hidden="true"></span>`}
      <span class="${authReconnect ? "text-red-600 font-semibold" : ""}">${labelText}</span>
    </button>`;
}
var CHIP_ACTION = {
  NOOP: "noop",
  SIGNIN: "signin",
  WAITING_NETWORK: "waiting_network",
  FORCE_RETRY: "force_retry",
  RECONNECT: "reconnect",
  SYNC_NOW: "sync_now"
};
function decideChipAction({ state, user, online, lastError, authReconnect }) {
  if (state === "yellow") return CHIP_ACTION.NOOP;
  if (state === "backing_up") return CHIP_ACTION.NOOP;
  if (state === "pending") return CHIP_ACTION.NOOP;
  if (state === "quarantined") return CHIP_ACTION.NOOP;
  if (state === "red" && authReconnect) return CHIP_ACTION.SIGNIN;
  if (state === "red" && !user) return CHIP_ACTION.SIGNIN;
  if (state === "red" && !online) return CHIP_ACTION.WAITING_NETWORK;
  if (state === "unreachable") return CHIP_ACTION.FORCE_RETRY;
  if (state === "orange" && lastError) return CHIP_ACTION.FORCE_RETRY;
  return CHIP_ACTION.SYNC_NOW;
}

// output/web/js.tmp/implementations/ui/bootstrap/components/topbar-helpers.js
import { html as html2 } from "https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm";
var BADGE_MAX = 99;
function badgeLabel(count) {
  if (count <= 0) return null;
  return count > BADGE_MAX ? `${BADGE_MAX}+` : String(count);
}
function renderBadge(label) {
  if (!label) return "";
  return html2`<span class="absolute top-0.5 right-0.5 min-w-[1rem] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none flex items-center justify-center ring-2 ring-white">${label}</span>`;
}
function savePref(patch) {
  const store = window.__vdg_store;
  if (!store) return;
  (async () => {
    const prefs = await store.cache_get_meta("preferences") || { key: "preferences" };
    await store.cache_put_meta("preferences", { ...prefs, ...patch });
  })().catch(() => {
  });
}
function renderAvatar(user) {
  if (user?.picture) {
    return html2`<img src="${user.picture}" alt="${user.name || t("topbar.user_fallback")}"
      class="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200"
      title="${user.name || user.email}" referrerpolicy="no-referrer" />`;
  }
  const initials = user?.name ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : user?.email ? user.email.slice(0, 2).toUpperCase() : "?";
  return html2`<div class="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-white text-xs font-semibold flex items-center justify-center"
    title="${user?.name || user?.email || ""}">${initials}</div>`;
}

// output/web/js.tmp/implementations/ui/bootstrap/components/topbar-menus.js
import { html as html3 } from "https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm";
function renderUserMenu(host, user, salesId) {
  if (!host._menuOpen) return html3``;
  const isManagerBadge = currentRoles().includes(ROLE_MANAGER);
  const roleLabel = isManagerBadge ? t("topbar.role.manager") : salesId || t("topbar.role.sales");
  return html3`
    <div class="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 z-50 py-1"
         @click="${(e) => e.stopPropagation()}">
      <div class="px-4 py-3 border-b border-slate-100">
        <div class="text-xs font-semibold text-slate-900 truncate">${user?.name || "\u2014"}</div>
        <div class="text-[11px] text-slate-500 truncate mt-0.5">${user?.email || ""}</div>
        <div class="mt-1.5 inline-flex px-2 py-0.5 rounded text-[10px] font-medium
                    ${isManagerBadge ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}">
          ${roleLabel}
        </div>
      </div>
      <button @click="${() => {
    host._menuOpen = false;
    navigate("/background-jobs");
  }}"
        class="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition flex items-center gap-2">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>
        </svg>
        ${t("bg_jobs.title")}
      </button>

      <button @click="${() => host.querySelector("#data-upload")?.click()}"
        class="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition flex items-center gap-2">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        ${t("topbar.import.menu")}
      </button>
      <input type="file" id="data-upload" accept=".json" class="hidden" @change="${host._handleFileUpload}">

      <button @click="${host._handleSignOut}" data-testid="topbar-signout"
        class="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition flex items-center gap-2 border-t border-slate-100">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        ${t("sign_out")}
      </button>
    </div>`;
}
function renderSwBanner(host) {
  if (!host._swUpdate) return html3``;
  return html3`
    <div class="w-full bg-blue-600 text-white text-xs flex items-center justify-between px-4 py-2">
      <span>${t("topbar.sw_update_body")}</span>
      <div class="flex gap-2">
        <button @click="${host._handleReloadForUpdate}"
                class="px-3 py-1 bg-white text-blue-700 rounded font-medium hover:bg-blue-50">${t("topbar.sw_update_action")}</button>
        <button @click="${host._dismissSwBanner}" class="px-2 py-1 text-blue-100 hover:text-white">✕</button>
      </div>
    </div>`;
}

// output/web/js.tmp/implementations/ui/bootstrap/components/topbar-import.js
async function handleFileUpload(host, e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const repo3 = window.__vdg_repo;
  if (!repo3) return;
  window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { type: "info", message: t("topbar.import.processing") } }));
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("Invalid JSON format, expected array.");
    let count = 0;
    for (const item of data) {
      if (!item?.id) throw new Error('Import item missing "id" field.');
      await putEnvelope(repo3, item.id, item);
      count++;
      if (count % 500 === 0) {
        window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { type: "info", message: t("topbar.import.progress", { count, total: data.length }) } }));
      }
    }
    window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { type: "success", message: t("topbar.import.success", { count }) } }));
    setTimeout(() => window.location.reload(), 1500);
  } catch (err) {
    window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { type: "error", message: t("topbar.import.error", { error: err.message }) } }));
  }
  e.target.value = "";
  host._menuOpen = false;
}

// output/web/js.tmp/implementations/ui/bootstrap/components/topbar-sync-state.js
var STUCK_RECHECK_INTERVAL_MS = 3e4;
function createSyncHandlers(host) {
  return {
    // vdg:sync-started (charter_event_bridge.rs: SyncEvent::SyncStarted/ResyncStarted) — a pass
    // just began; cleared by whichever of sync-complete/sync-error ends it (below).
    onSyncStarted: () => {
      host._syncing = true;
    },
    onSyncComplete: (e) => {
      host._lastSyncMs = e.detail?.ts ?? Date.now();
      host._retryStreak = 0;
      host._retrying = false;
      host._lastError = null;
      host._lastNotifiedStuckEpisode = 0;
      host._syncing = false;
      if (e.detail?.quarantined !== void 0) host._quarantinedCount = e.detail.quarantined;
    },
    // Pull heartbeat only — must NOT clear retry/error state (those are push-side signals)
    onDeltaSynced: (e) => {
      host._lastPullMs = e.detail?.ts ?? Date.now();
    },
    onSyncError: (e) => {
      host._retryStreak++;
      host._retrying = true;
      host._syncing = false;
      host._lastError = e.detail?.reason === "max_retries" ? t("topbar.sync.tooltip.max_retries_reason") : e.detail?.reason === "rate_budget" ? t("topbar.sync.tooltip.rate_budget_reason") : e.detail?.error ?? null;
      if (e.detail?.reason === "record_skipped") {
        window.__vdg_repo?.outbox_snapshot?.().then((snap) => {
          if (snap) host._quarantinedCount = snap.quarantined ?? host._quarantinedCount;
        }).catch(() => {
        });
      }
    },
    onServerHealth: (e) => {
      if (e.detail?.backlog_depth !== void 0) host._serverBacklog = Number(e.detail.backlog_depth) || 0;
      if (e.detail?.oldest_pending_age_ms !== void 0) host._serverOldestPendingAgeMs = e.detail.oldest_pending_age_ms;
      if (e.detail?.provider) host._serverProvider = e.detail.provider;
      if (e.detail?.sync_tick_calls !== void 0) {
        host._lastError = t("topbar.sync.tooltip.high_volume_reason", { n: e.detail.sync_tick_calls });
      }
      host.requestUpdate();
    }
  };
}
function recomputeAndMaybeNotify(host) {
  const now = Date.now();
  const perm = typeof Notification !== "undefined" ? Notification.permission : void 0;
  if (shouldFireStuckNotification({
    now,
    lastSyncMs: host._lastSyncMs,
    pending: host._outboxCount,
    lastNotifiedStuckEpisode: host._lastNotifiedStuckEpisode,
    permission: perm
  })) {
    const body = t("topbar.sync.stuck.body").replace("{n}", String(host._outboxCount));
    new Notification(t("topbar.sync.stuck.title"), { body });
    host._lastNotifiedStuckEpisode = host._lastSyncMs;
  }
  host.requestUpdate();
}
function attachSyncListeners(host) {
  window.addEventListener("vdg:sync-started", host._syncHandlers.onSyncStarted);
  window.addEventListener("vdg:sync-complete", host._syncHandlers.onSyncComplete);
  window.addEventListener("vdg:delta-synced", host._syncHandlers.onDeltaSynced);
  window.addEventListener("vdg:sync-error", host._syncHandlers.onSyncError);
  window.addEventListener("vdg:server-health", host._syncHandlers.onServerHealth);
  host._stuckTickId = setInterval(() => recomputeAndMaybeNotify(host), STUCK_RECHECK_INTERVAL_MS);
}
function detachSyncListeners(host) {
  window.removeEventListener("vdg:sync-started", host._syncHandlers.onSyncStarted);
  window.removeEventListener("vdg:sync-complete", host._syncHandlers.onSyncComplete);
  window.removeEventListener("vdg:delta-synced", host._syncHandlers.onDeltaSynced);
  window.removeEventListener("vdg:sync-error", host._syncHandlers.onSyncError);
  window.removeEventListener("vdg:server-health", host._syncHandlers.onServerHealth);
  clearInterval(host._stuckTickId);
}

// output/web/js.tmp/implementations/ui/bootstrap/components/topbar.js
function canQuote() {
  return can("quote.create");
}
var SW_DISMISS_KEY = "vdg.sw.update.dismissed";
var SUPPORTED_LOCALES = ["vi", "en"];
var VdgTopbar = class extends LitElement2 {
  static properties = {
    route: { type: String, state: true },
    _exceptionCount: { type: Number, state: true },
    _approvalCount: { type: Number, state: true },
    _notifCount: { type: Number, state: true },
    _dueSoonCount: { type: Number, state: true },
    // F-48-01
    _menuOpen: { type: Boolean, state: true },
    _outboxCount: { type: Number, state: true },
    _swUpdate: { type: Boolean, state: true },
    _locale: { type: String, state: true },
    _mobile: { type: Boolean, state: true },
    _quotaWarn: { type: Boolean, state: true },
    _lastSyncMs: { type: Number, state: true },
    _lastPullMs: { type: Number, state: true },
    _retrying: { type: Boolean, state: true },
    _retryStreak: { type: Number, state: true },
    _backoff429: { type: Boolean, state: true },
    _online: { type: Boolean, state: true },
    _lastError: { type: String, state: true },
    _lastNotifiedStuckEpisode: { type: Number, state: true },
    _breadcrumb: { type: Object, state: true },
    _managerMode: { type: String, state: true },
    _authReconnect: { type: Boolean, state: true },
    _popupBlocked: { type: Boolean, state: true },
    _authPending: { type: Boolean, state: true },
    // F-49-01 ad-blocker hint + F-50-01 calm pending
    _serverBacklog: { type: Number, state: true },
    _serverOldestPendingAgeMs: { type: Number, state: true },
    _serverProvider: { type: String, state: true },
    _syncing: { type: Boolean, state: true },
    // vdg:sync-started (charter_event_bridge.rs)
    _quarantinedCount: { type: Number, state: true }
    // outbox.rs's own decided, permanent refusal count
  };
  createRenderRoot() {
    return this;
  }
  constructor() {
    super();
    this.route = location.hash.slice(1) || "/dashboard";
    this._exceptionCount = 0;
    this._approvalCount = 0;
    this._notifCount = 0;
    this._menuOpen = false;
    this._outboxCount = 0;
    this._dueSoonCount = 0;
    this._swUpdate = false;
    this._locale = currentLocale();
    this._mobile = window.innerWidth < 768;
    this._quotaWarn = false;
    this._lastSyncMs = 0;
    this._lastPullMs = 0;
    this._retrying = false;
    this._retryStreak = 0;
    this._backoff429 = false;
    this._online = navigator.onLine;
    this._lastError = null;
    this._lastNotifiedStuckEpisode = 0;
    this._stuckTickId = null;
    this._breadcrumb = { group: "", view: "" };
    this._managerMode = readMode();
    this._authReconnect = false;
    this._popupBlocked = false;
    this._authPending = false;
    this._serverBacklog = 0;
    this._serverOldestPendingAgeMs = null;
    this._serverProvider = "Google Drive";
    this._syncing = false;
    this._quarantinedCount = 0;
    this._onNav = (e) => {
      this.route = e.detail.route;
    };
    this._syncHandlers = createSyncHandlers(this);
    this._onException = (e) => {
      this._exceptionCount = e.detail.count;
    };
    this._onApproval = (e) => {
      this._approvalCount = e.detail?.count ?? 0;
    };
    this._onNotifCount = (e) => {
      this._notifCount = e.detail?.count ?? 0;
    };
    this._onDueSoonCount = (e) => {
      this._dueSoonCount = e.detail?.count ?? 0;
    };
    this._onDocClick = (e) => {
      if (!this.contains(e.target)) this._menuOpen = false;
    };
    this._onOutbox = (e) => {
      this._outboxCount = e.detail?.count ?? 0;
      if (e.detail?.quarantined !== void 0) this._quarantinedCount = e.detail.quarantined;
    };
    this._onSwUpdate = () => {
      if (!sessionStorage.getItem(SW_DISMISS_KEY)) this._swUpdate = true;
    };
    this._onLocaleChanged = (e) => {
      this._locale = e.detail?.locale ?? currentLocale();
      this._computeBreadcrumb();
    };
    this._onRolesResolved = () => this.requestUpdate();
    this._onHashChange = () => {
      this._computeBreadcrumb();
    };
    this._onBreakpt = (e) => {
      this._mobile = e.detail.mobile;
    };
    this._onQuotaWarn = () => {
      this._quotaWarn = true;
    };
    this._onOnline = () => {
      this._online = true;
      recomputeAndMaybeNotify(this);
    };
    this._onOffline = () => {
      this._online = false;
      recomputeAndMaybeNotify(this);
    };
    this._onNeedsReconnect = () => {
      this._authReconnect = true;
      this._authPending = false;
    };
    this._onReconnected = () => {
      this._authReconnect = false;
      this._popupBlocked = false;
      this._authPending = false;
    };
    this._onPopupBlocked = () => {
      this._popupBlocked = true;
      this._authReconnect = true;
    };
    this._onAuthPending = () => {
      this._authPending = true;
    };
  }
  _computeBreadcrumb() {
    this._breadcrumb = resolveBreadcrumb(location.hash, this._locale, t);
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("vdg:navigate", this._onNav);
    window.addEventListener("vdg:exceptions", this._onException);
    window.addEventListener("vdg:approval-count", this._onApproval);
    window.addEventListener("vdg:notif-count", this._onNotifCount);
    window.addEventListener("vdg:due-soon-count", this._onDueSoonCount);
    window.addEventListener("vdg:outbox-changed", this._onOutbox);
    window.addEventListener("vdg:sw-update-available", this._onSwUpdate);
    window.addEventListener("vdg:locale-changed", this._onLocaleChanged);
    window.addEventListener(ROLES_RESOLVED_EVENT, this._onRolesResolved);
    window.addEventListener("hashchange", this._onHashChange);
    window.addEventListener("vdg:breakpoint-changed", this._onBreakpt);
    window.addEventListener("vdg:quota-warning", this._onQuotaWarn);
    attachSyncListeners(this);
    window.addEventListener("online", this._onOnline);
    window.addEventListener("offline", this._onOffline);
    window.addEventListener("vdg:auth-needs-reconnect", this._onNeedsReconnect);
    window.addEventListener("vdg:auth-reconnected", this._onReconnected);
    window.addEventListener("vdg:auth-popup-blocked", this._onPopupBlocked);
    window.addEventListener("vdg:auth-refresh-pending", this._onAuthPending);
    document.addEventListener("click", this._onDocClick);
    this._computeBreadcrumb();
    window.__vdg_repo?.outbox_snapshot?.().then((snap) => {
      if (snap) {
        this._quarantinedCount = snap.quarantined ?? 0;
      }
    }).catch(() => {
    });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("vdg:navigate", this._onNav);
    window.removeEventListener("vdg:exceptions", this._onException);
    window.removeEventListener("vdg:approval-count", this._onApproval);
    window.removeEventListener("vdg:notif-count", this._onNotifCount);
    window.removeEventListener("vdg:due-soon-count", this._onDueSoonCount);
    window.removeEventListener("vdg:outbox-changed", this._onOutbox);
    window.removeEventListener("vdg:sw-update-available", this._onSwUpdate);
    window.removeEventListener("vdg:locale-changed", this._onLocaleChanged);
    window.removeEventListener(ROLES_RESOLVED_EVENT, this._onRolesResolved);
    window.removeEventListener("hashchange", this._onHashChange);
    window.removeEventListener("vdg:breakpoint-changed", this._onBreakpt);
    window.removeEventListener("vdg:quota-warning", this._onQuotaWarn);
    detachSyncListeners(this);
    window.removeEventListener("online", this._onOnline);
    window.removeEventListener("offline", this._onOffline);
    window.removeEventListener("vdg:auth-needs-reconnect", this._onNeedsReconnect);
    window.removeEventListener("vdg:auth-reconnected", this._onReconnected);
    window.removeEventListener("vdg:auth-popup-blocked", this._onPopupBlocked);
    window.removeEventListener("vdg:auth-refresh-pending", this._onAuthPending);
    document.removeEventListener("click", this._onDocClick);
  }
  _handleSignOut() {
    window.__vdg_auth?.signOut?.();
    location.reload();
  }
  _handleReloadForUpdate() {
    window.dispatchEvent(new CustomEvent("vdg:sw-update-accept"));
  }
  _dismissSwBanner() {
    sessionStorage.setItem(SW_DISMISS_KEY, "1");
    this._swUpdate = false;
  }
  _handleBellClick() {
    window.dispatchEvent(new CustomEvent("vdg:open-notif-drawer"));
    const roles = currentRoles();
    const dest = roles.includes(ROLE_MANAGER) ? "/manager/notifications" : roles.includes(ROLE_SALES_MANAGER) ? "/manager/approvals" : "/sales/me";
    navigate(dest);
  }
  async _handleLocale(locale) {
    await loadLocale(locale);
    this._locale = locale;
    savePref({ locale });
    window.dispatchEvent(new CustomEvent("vdg:locale-changed", { detail: { locale } }));
  }
  _handleHamburger() {
    window.dispatchEvent(new CustomEvent("vdg:sidebar-toggle"));
  }
  _handleModeSelect(mode) {
    localStorage.setItem(MODE_LS_KEY, mode);
    this._managerMode = mode;
    window.dispatchEvent(new CustomEvent("vdg:mode-change", { detail: { mode } }));
  }
  // F-29-13 AC-06: chip click routed through the pure decision fn (unit-testable branch)
  _onChipClick(state) {
    const user = window.__vdg_auth?.getCurrentUser?.();
    const action = decideChipAction({
      state,
      user,
      online: this._online,
      lastError: this._lastError,
      authReconnect: this._authReconnect
    });
    if (action === CHIP_ACTION.NOOP) return;
    if (action === CHIP_ACTION.SIGNIN) {
      window.dispatchEvent(new CustomEvent("vdg:auth-signin-request"));
      return;
    }
    if (action === CHIP_ACTION.WAITING_NETWORK) {
      window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { type: "warn", message: t("topbar.sync.action.waiting_network") } }));
      return;
    }
    if (action === CHIP_ACTION.RECONNECT) {
      window.dispatchEvent(new CustomEvent("vdg:auth-reconnect-request"));
      return;
    }
    if (action === CHIP_ACTION.FORCE_RETRY) {
      window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { type: "info", message: t("topbar.sync.action.retrying") } }));
      window.dispatchEvent(new CustomEvent("vdg:sync-force-retry"));
      return;
    }
    window.dispatchEvent(new CustomEvent("vdg:sync-now"));
  }
  // Bulk JSON import — extracted to topbar-import.js (350-line cap), kept as a bound method
  // here since topbar-menus.js wires it in as `host._handleFileUpload`.
  _handleFileUpload(e) {
    return handleFileUpload(this, e);
  }
  render() {
    const badge = badgeLabel(this._exceptionCount + this._approvalCount);
    const notifBadge = badgeLabel(this._notifCount + this._dueSoonCount);
    const profile = readCachedProfile();
    const user = window.__vdg_auth?.getCurrentUser?.() || (profile?.email || currentUserEmail() ? {
      email: profile?.email || currentUserEmail(),
      name: profile?.name || "",
      picture: profile?.picture || "",
      sub: "",
      id_token: null
    } : null);
    const salesId = currentSalesRepId();
    const now = Date.now();
    const syncFailed = (window.__vdg_repo?.sync_failed_kinds?.() ?? []).length > 0;
    const unreachable = !!window.__vdg_repo?.sync_server_unreachable?.();
    const state = computeChipState({
      pending: this._outboxCount,
      syncFailed,
      unreachable,
      quarantined: this._quarantinedCount > 0,
      backoff429: this._backoff429,
      offline: !this._online,
      signedOut: !user,
      lastSyncMs: this._lastSyncMs,
      now,
      authReconnect: this._authReconnect,
      authPending: this._authPending,
      serverBacklog: this._serverBacklog,
      serverOldestPendingAgeMs: this._serverOldestPendingAgeMs,
      serverProvider: this._serverProvider
    });
    const ariaLabel = buildAriaLabel(state, this._outboxCount, t, this._serverBacklog);
    const labelText = state === "red" && this._authReconnect ? t("topbar.sync.label.signin") : state === "red" && !this._online ? t("topbar.sync.state.offline") : state === "unreachable" ? t("topbar.sync.state.unreachable") : state === "backing_up" ? t("topbar.sync.state.backing_up") : state === "quarantined" ? t("topbar.sync.state.quarantined") : state === "orange" ? t("topbar.sync.state.retrying") : t("topbar.sync.label");
    return html4`
      ${renderSwBanner(this)}
      <header class="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-6 shrink-0">
        <div class="flex items-center gap-3">
          <button @click="${() => this._handleHamburger()}" aria-label="${t("topbar.aria.open_menu")}"
                  class="w-11 h-11 border-0 box-border flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div>
            <span class="text-xs text-slate-400">${this._breadcrumb.group}</span>
            <span class="mx-1 text-slate-300">/</span>
            <span class="text-xs text-slate-700 font-medium">${this._breadcrumb.view}</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          ${this._quotaWarn ? html4`<a href="https://one.google.com/storage" target="_blank" rel="noreferrer" class="hidden md:inline-flex h-9 py-0 border-0 box-border items-center gap-1 px-2.5 rounded-md text-[11px] font-medium text-red-700 hover:bg-red-50 ring-1 ring-red-200" title="${t("topbar.quota.title")}">⚠ ${t("topbar.quota.label")}</a>` : ""}
          ${renderSyncChip({
      html: html4,
      state,
      pending: this._outboxCount,
      lastSyncMs: displayLastSyncMs(this._lastSyncMs, this._lastPullMs),
      now,
      online: this._online,
      ariaLabel,
      labelText,
      lastError: this._lastError,
      t,
      user,
      authReconnect: this._authReconnect,
      popupBlocked: this._popupBlocked,
      quarantinedCount: this._quarantinedCount,
      serverBacklog: this._serverBacklog,
      serverOldestPendingAgeMs: this._serverOldestPendingAgeMs,
      serverProvider: this._serverProvider,
      syncing: this._syncing,
      onSyncNow: () => this._onChipClick(state)
    })}
          <!-- route-guard.js already restricts "/manager/*" to Manager — no second role check here. -->
          ${this.route.startsWith("/manager/") ? renderModeToggle({ html: html4, currentMode: this._managerMode, t, onSelect: (m) => this._handleModeSelect(m) }) : ""}
          ${canQuote() ? html4`
            <button @click="${() => navigate("/sales/quote/new")}"
                    class="hidden md:inline-flex h-9 py-0 border-0 box-border items-center gap-1.5 px-3 text-[13px] font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transition">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
              ${t("topbar.new_quote")}
            </button>
          ` : ""}
          <button @click="${() => navigate("/help")}"
                  class="hidden md:inline-flex h-9 py-0 border-0 box-border items-center px-3 text-[13px] font-medium rounded-md text-slate-600 hover:bg-slate-100 transition">
            ${t("help")}
          </button>
          <div class="hidden md:flex h-9 items-center rounded-md ring-1 ring-slate-200 overflow-hidden text-[11px] font-semibold">
            ${SUPPORTED_LOCALES.map((loc) => html4`
              <button @click="${() => this._handleLocale(loc)}"
                      class="h-full px-2.5 border-0 box-border flex items-center transition ${this._locale === loc ? "bg-slate-50 text-slate-900 underline underline-offset-4 decoration-2" : "text-slate-500 hover:bg-slate-50"}">
                ${loc.toUpperCase()}
              </button>`)}
          </div>
          <button @click="${() => this._handleBellClick()}"
                  title="${t("topbar.aria.notif_title", { n: this._notifCount + this._dueSoonCount })}"
                  aria-label="${t("topbar.aria.notif_label", { n: this._notifCount + this._dueSoonCount })}"
                  class="relative w-9 h-9 py-0 border-0 box-border rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500 transition">
            <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
            </svg>
            ${renderBadge(notifBadge || badge)}
          </button>
          <div class="relative flex items-center h-9 pl-3 ml-1 border-l border-slate-200">
            <button @click="${() => {
      this._menuOpen = !this._menuOpen;
    }}"
                    class="flex items-center justify-center h-9 w-9 border-0 box-border rounded-full overflow-hidden hover:ring-2 hover:ring-slate-200 transition focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label="${t("topbar.aria.user_menu")}">
              ${renderAvatar(user)}
            </button>
            ${renderUserMenu(this, user, salesId)}
          </div>
        </div>
      </header>`;
  }
};
customElements.define("vdg-topbar", VdgTopbar);

// output/web/js.tmp/implementations/ui/bootstrap/components/wizard-stepper.js
import { LitElement as LitElement3, html as html5, css as css2 } from "https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm";
var VdgWizardStepper = class extends LitElement3 {
  static properties = {
    steps: { type: Array },
    current: { type: Number },
    completed: { type: Object }
    // Set<number>
  };
  static styles = css2`
    :host { display: block; }
  `;
  // Use light DOM so Tailwind applies
  createRenderRoot() {
    return this;
  }
  constructor() {
    super();
    this.steps = [];
    this.current = 0;
    this.completed = /* @__PURE__ */ new Set();
  }
  _clickStep(idx) {
    if (!this.completed.has(idx) && idx !== this.current) return;
    this.dispatchEvent(new CustomEvent("vdg:step-click", { bubbles: true, detail: { step: idx } }));
  }
  render() {
    return html5`
      <nav class="flex items-center gap-0" aria-label="progress">
        ${this.steps.map((label, idx) => this._renderStep(label, idx))}
      </nav>
    `;
  }
  _renderStep(label, idx) {
    const done = this.completed.has(idx);
    const active = idx === this.current;
    const clickable = done && !active;
    const isLast = idx === this.steps.length - 1;
    const circleCls = active ? "bg-blue-600 text-white ring-2 ring-blue-300" : done ? "bg-emerald-500 text-white cursor-pointer hover:bg-emerald-600" : "bg-slate-200 text-slate-400";
    const labelCls = active ? "text-blue-700 font-semibold" : done ? "text-emerald-700 cursor-pointer" : "text-slate-400";
    const connectorCls = done ? "bg-emerald-400" : "bg-slate-200";
    return html5`
      <div class="flex items-center">
        <button
          class="flex flex-col items-center gap-1 group"
          ?disabled=${!clickable}
          @click=${() => this._clickStep(idx)}
        >
          <span class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${circleCls}">
            ${done && !active ? html5`<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>` : idx + 1}
          </span>
          <span class="text-[10px] whitespace-nowrap ${labelCls}">${label}</span>
        </button>
        ${!isLast ? html5`
          <div class="h-0.5 w-8 sm:w-12 mx-1 mb-5 rounded ${connectorCls}"></div>
        ` : ""}
      </div>
    `;
  }
};
customElements.define("vdg-wizard-stepper", VdgWizardStepper);

// output/web/js.tmp/implementations/ui/bootstrap/components/status-badge.js
import { LitElement as LitElement4, html as html6 } from "https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm";
var SHIPMENT_COLOR = {
  Created: ["bg-slate-100", "text-slate-700"],
  BookingConfirmed: ["bg-blue-100", "text-blue-700"],
  InTransit: ["bg-amber-100", "text-amber-700"],
  Arrived: ["bg-emerald-100", "text-emerald-700"],
  Delivered: ["bg-teal-100", "text-teal-700"],
  Closed: ["bg-slate-800", "text-white"],
  Cancelled: ["bg-red-100", "text-red-700"]
};
var DOCUMENT_COLOR = {
  Draft: ["bg-slate-100", "text-slate-700"],
  PendingApproval: ["bg-amber-100", "text-amber-700"],
  Issued: ["bg-emerald-100", "text-emerald-700"],
  Surrendered: ["bg-purple-100", "text-purple-700"],
  Released: ["bg-teal-100", "text-teal-700"],
  Cancelled: ["bg-red-100", "text-red-700"]
};
var BILLING_COLOR = {
  DraftCosts: ["bg-slate-100", "text-slate-700"],
  PendingInvoice: ["bg-amber-100", "text-amber-700"],
  Billed: ["bg-blue-100", "text-blue-700"],
  PartiallyPaid: ["bg-indigo-100", "text-indigo-700"],
  Paid: ["bg-emerald-100", "text-emerald-700"]
};
var EXCEPTION_COLOR = {
  Low: ["bg-yellow-100", "text-yellow-700"],
  Medium: ["bg-orange-100", "text-orange-700"],
  High: ["bg-red-100", "text-red-700"],
  Critical: ["bg-red-700", "text-white"]
};
var FAMILIES = {
  shipment: SHIPMENT_COLOR,
  document: DOCUMENT_COLOR,
  billing: BILLING_COLOR,
  exception: EXCEPTION_COLOR
};
var VdgStatusBadge = class extends LitElement4 {
  static properties = {
    state: { type: String },
    fsm: { type: String }
  };
  createRenderRoot() {
    return this;
  }
  constructor() {
    super();
    this.state = "";
    this.fsm = "shipment";
  }
  render() {
    const family = FAMILIES[this.fsm] || SHIPMENT_COLOR;
    const [bg, fg] = family[this.state] || ["bg-slate-100", "text-slate-600"];
    return html6`
      <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium tracking-tight ${bg} ${fg}">
        <span class="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
        ${statusBadgeLabel(this.fsm, this.state)}
      </span>
    `;
  }
};
customElements.define("status-badge", VdgStatusBadge);

// output/web/js.tmp/implementations/ui/bootstrap/components/info-tip.js
import { LitElement as LitElement5, html as html7 } from "https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm";
var _seq = 0;
var VdgInfoTip = class extends LitElement5 {
  static properties = {
    text: { type: String },
    open: { type: Boolean, state: true }
  };
  createRenderRoot() {
    return this;
  }
  constructor() {
    super();
    this.text = "";
    this.open = false;
    this._id = `info-tip-${++_seq}`;
    this._onDocClick = this._onDocClick.bind(this);
    this._onKeydown = this._onKeydown.bind(this);
  }
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this._onDocClick);
    document.addEventListener("keydown", this._onKeydown);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this._onDocClick);
    document.removeEventListener("keydown", this._onKeydown);
  }
  _onDocClick(e) {
    if (this.open && !this.contains(e.target)) this.open = false;
  }
  _onKeydown(e) {
    if (this.open && e.key === "Escape") {
      this.open = false;
      this.querySelector("button")?.focus();
    }
  }
  _toggle(e) {
    e.stopPropagation();
    this.open = !this.open;
  }
  render() {
    return html7`
      <span class="relative inline-flex">
        <button type="button" @click=${this._toggle}
          aria-expanded=${this.open ? "true" : "false"} aria-describedby=${this._id}
          aria-label=${this.text}
          class="info-tip-btn w-[15px] h-[15px] inline-flex items-center justify-center rounded-full
                 border border-slate-300 bg-white text-slate-400 text-[10px] font-semibold leading-none
                 transition-colors hover:text-slate-600 hover:border-slate-400
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >i</button>
        <span id=${this._id} role="tooltip"
          class="absolute z-30 left-1/2 -translate-x-1/2 top-[22px] w-60 max-w-[80vw] rounded-lg
                 bg-slate-800 text-slate-100 text-[11px] font-normal normal-case tracking-normal
                 leading-relaxed text-left px-3 py-2 shadow-xl ring-1 ring-black/5
                 transition-opacity duration-150 ${this.open ? "opacity-100" : "opacity-0 pointer-events-none"}"
        >${this.text}</span>
      </span>
    `;
  }
};
customElements.define("info-tip", VdgInfoTip);

// output/web/js.tmp/implementations/ui/bootstrap/components/kpi-card.js
import { LitElement as LitElement6, html as html8, svg } from "https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm";
var TONES = {
  blue: { dot: "bg-blue-500", ring: "ring-blue-100", text: "text-blue-600" },
  amber: { dot: "bg-amber-500", ring: "ring-amber-100", text: "text-amber-600" },
  red: { dot: "bg-red-500", ring: "ring-red-100", text: "text-red-600" },
  green: { dot: "bg-emerald-500", ring: "ring-emerald-100", text: "text-emerald-600" }
};
var ICONS2 = {
  ship: svg`<path d="M3 18a9 9 0 0 0 18 0M3 18l1.5-5h15L21 18M6 13V7h12v6M9 7V4h6v3"/>`,
  doc: svg`<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>`,
  alert: svg`<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.5"/>`,
  dollar: svg`<path d="M12 2v20M17 7H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H7"/>`
};
var VdgKpiCard = class extends LitElement6 {
  static properties = {
    label: { type: String },
    value: { type: String },
    delta: { type: String },
    tone: { type: String },
    icon: { type: String },
    tooltip: { type: String }
  };
  createRenderRoot() {
    return this;
  }
  constructor() {
    super();
    this.tone = "blue";
    this.icon = "ship";
  }
  render() {
    const tone = TONES[this.tone] || TONES.blue;
    const iconContent = ICONS2[this.icon] || ICONS2.ship;
    return html8`
      <div class="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
            <span>${this.label}</span>
            ${this.tooltip ? html8`<info-tip text="${this.tooltip}"></info-tip>` : ""}
          </div>
          <div class="w-9 h-9 rounded-lg ring-4 ${tone.ring} ${tone.dot} bg-opacity-10 flex items-center justify-center">
            <svg class="w-4 h-4 ${tone.text}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${iconContent}
            </svg>
          </div>
        </div>
        <div class="mt-3 text-3xl font-bold tracking-tight text-slate-900">${this.value}</div>
        <div class="mt-1 text-xs ${tone.text} font-medium">${this.delta}</div>
      </div>
    `;
  }
};
customElements.define("kpi-card", VdgKpiCard);

// output/web/js.tmp/implementations/ui/bootstrap/components/upload-zone.js
import { LitElement as LitElement7, html as html9 } from "https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm";
var MOBILE_BREAKPOINT_PX = 768;
function isMobileTouch() {
  return navigator.maxTouchPoints > 0 && window.innerWidth < MOBILE_BREAKPOINT_PX;
}
var VdgUploadZone = class extends LitElement7 {
  static properties = {
    accept: { type: String },
    hover: { type: Boolean, state: true },
    file: { type: Object, state: true }
  };
  createRenderRoot() {
    return this;
  }
  constructor() {
    super();
    this.accept = ".xlsx";
    this.hover = false;
    this.file = null;
  }
  _dispatch(file) {
    this.file = file;
    this.dispatchEvent(new CustomEvent("vdg:file", { detail: { file }, bubbles: true }));
  }
  _onDrop(e) {
    e.preventDefault();
    this.hover = false;
    const f = e.dataTransfer.files?.[0];
    if (f) this._validateAndDispatch(f);
  }
  _onPicker(e) {
    const f = e.target.files?.[0];
    if (f) this._validateAndDispatch(f);
  }
  _validateAndDispatch(file) {
    const name = file.name.toLowerCase();
    const ok = name.endsWith(".xlsx") || name.endsWith(".xls");
    if (!ok) {
      this.dispatchEvent(new CustomEvent("vdg:file-rejected", {
        detail: { reason: "unsupported-format", name: file.name },
        bubbles: true,
        composed: true
      }));
      return;
    }
    this._dispatch(file);
  }
  render() {
    if (isMobileTouch()) {
      return html9`
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
          <div class="text-sm font-medium text-slate-700 mb-3">
            ${this.file ? this.file.name : t("upload_zone.choose_file")}
          </div>
          <label class="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm rounded-lg cursor-pointer">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            ${t("upload_zone.browse")}
            <input type="file" accept="${this.accept}" class="hidden" @change=${(e) => this._onPicker(e)} />
          </label>
          ${this.file ? html9`
            <div class="mt-2 text-xs text-slate-500">${t("upload_zone.ready_mobile", { kb: (this.file.size / 1024).toFixed(1) })}</div>` : ""}
        </div>`;
    }
    const cls = this.hover ? "border-blue-400 bg-blue-50/60" : "border-slate-300 bg-white hover:border-slate-400";
    return html9`
      <label
        class="block rounded-xl border-2 border-dashed ${cls} p-10 text-center cursor-pointer transition"
        @dragover=${(e) => {
      e.preventDefault();
      this.hover = true;
    }}
        @dragleave=${() => {
      this.hover = false;
    }}
        @drop=${(e) => this._onDrop(e)}
      >
        <input type="file" accept=${this.accept} class="hidden" @change=${(e) => this._onPicker(e)} />
        <div class="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div class="mt-4 text-sm font-medium text-slate-800">
          ${this.file ? this.file.name : t("upload_zone.drop_hint")}
        </div>
        <div class="mt-1 text-xs text-slate-500">
          ${this.file ? t("upload_zone.ready", { kb: (this.file.size / 1024).toFixed(1) }) : t("upload_zone.local_note")}
        </div>
      </label>`;
  }
};
customElements.define("upload-zone", VdgUploadZone);

// output/web/js.tmp/implementations/ui/bootstrap/components/cutoff-timer.js
import { LitElement as LitElement8, html as html10 } from "https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm";
var VdgCutoffTimer = class extends LitElement8 {
  static properties = {
    deadline: { type: String },
    label: { type: String },
    now: { type: Number, state: true }
  };
  createRenderRoot() {
    return this;
  }
  constructor() {
    super();
    this.deadline = new Date(Date.now() + 6 * 3600 * 1e3).toISOString();
    this.label = "Cutoff";
    this.now = Date.now();
  }
  connectedCallback() {
    super.connectedCallback();
    this._timer = setInterval(() => {
      this.now = Date.now();
    }, 30 * 1e3);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._timer);
  }
  _format(ms) {
    if (ms <= 0) return "Expired";
    const h = Math.floor(ms / 36e5);
    const m = Math.floor(ms % 36e5 / 6e4);
    if (h >= 24) {
      const d = Math.floor(h / 24);
      return `${d}d ${h % 24}h`;
    }
    return `${h}h ${m}m`;
  }
  _tone(ms) {
    if (ms <= 0) return "text-slate-400 line-through";
    if (ms < 4 * 3600 * 1e3) return "text-red-600 font-semibold";
    if (ms < 24 * 3600 * 1e3) return "text-amber-600 font-medium";
    return "text-emerald-600";
  }
  render() {
    const ms = new Date(this.deadline).getTime() - this.now;
    return html10`
      <div class="inline-flex items-center gap-2 text-xs">
        <span class="text-slate-500">${this.label}</span>
        <span class="${this._tone(ms)} font-mono">${this._format(ms)}</span>
      </div>
    `;
  }
};
customElements.define("cutoff-timer", VdgCutoffTimer);

// output/web/js.tmp/implementations/ui/bootstrap/components/offline-banner.js
var LIT_CDN_URL = "https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm";
var BANNER_MSG = "Working offline \u2014 changes saved locally, will sync when reconnected";
var BANNER_Z = 50;
var DISMISS_DELAY_MS = 2e3;
async function _defineOfflineBanner() {
  if (customElements.get("vdg-offline-banner")) return;
  const { LitElement: LitElement10, html: html12 } = await import(LIT_CDN_URL);
  class VdgOfflineBanner extends LitElement10 {
    static properties = {
      _offline: { type: Boolean, state: true },
      _visible: { type: Boolean, state: true }
    };
    createRenderRoot() {
      return this;
    }
    constructor() {
      super();
      this._offline = !navigator.onLine;
      this._visible = !navigator.onLine;
      this._onOnline = () => this._handleOnline();
      this._onOffline = () => this._handleOffline();
      this._hideTimer = null;
    }
    connectedCallback() {
      super.connectedCallback();
      window.addEventListener("online", this._onOnline);
      window.addEventListener("offline", this._onOffline);
    }
    disconnectedCallback() {
      super.disconnectedCallback();
      window.removeEventListener("online", this._onOnline);
      window.removeEventListener("offline", this._onOffline);
      clearTimeout(this._hideTimer);
    }
    _handleOffline() {
      clearTimeout(this._hideTimer);
      this._offline = true;
      this._visible = true;
    }
    _handleOnline() {
      this._offline = false;
      this._hideTimer = setTimeout(() => {
        this._visible = false;
      }, DISMISS_DELAY_MS);
    }
    render() {
      if (!this._visible) return html12``;
      const isOffline = this._offline;
      return html12`
        <div
          role="status"
          aria-live="polite"
          style="z-index:${BANNER_Z}"
          class="fixed top-0 left-0 right-0 flex items-center justify-center gap-2.5 px-4 py-2 text-sm font-medium pointer-events-none
                 ${isOffline ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"}"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-white/70 ${isOffline ? "animate-pulse" : ""}"></span>
          ${isOffline ? BANNER_MSG : "Back online \u2014 syncing\u2026"}
        </div>
      `;
    }
  }
  customElements.define("vdg-offline-banner", VdgOfflineBanner);
}
if (typeof customElements !== "undefined") {
  _defineOfflineBanner().catch((e) => console.error("[offline-banner] Lit load failed:", e));
}
var RETRY_BTN_ID = "view-mount-retry-btn";
var RETRY_BTN_TESTID = "view-mount-retry";
var RELOAD_BTN_ID = "view-mount-reload-btn";
var RELOAD_BTN_TESTID = "view-mount-reload";
function renderViewMountRecovery(root, { route, offline, exhausted, reason, onRetry, onReload }) {
  const bodyKey = offline ? "view_mount_failed_offline" : reason === "network" ? "view_mount_failed_network" : exhausted ? "view_mount_failed_persist" : "view_mount_failed_body";
  const showReload = !offline && reason === "network";
  root.innerHTML = `
    <div data-testid="view-mount-recovery" data-route="${route}"
         class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="text-lg font-semibold text-slate-700">${t("view_mount_failed_title")}</div>
      <div class="text-sm text-slate-500">${t(bodyKey)}</div>
      <div class="flex gap-2 mt-2">
        <button id="${RETRY_BTN_ID}" data-testid="${RETRY_BTN_TESTID}"
                class="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
          ${t("view_mount_retry")}
        </button>
        ${showReload ? `<button id="${RELOAD_BTN_ID}" data-testid="${RELOAD_BTN_TESTID}"
                class="px-4 py-2 bg-slate-200 text-slate-700 rounded text-sm hover:bg-slate-300">
          ${t("view_mount_reload")}
        </button>` : ""}
      </div>
    </div>`;
  root.querySelector(`#${RETRY_BTN_ID}`)?.addEventListener("click", () => onRetry());
  if (showReload) root.querySelector(`#${RELOAD_BTN_ID}`)?.addEventListener("click", () => onReload());
}

// output/web/js.tmp/implementations/ui/bootstrap/components/cmd-palette.js
import { LitElement as LitElement9, html as html11 } from "https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm";
var PALETTE_MAX_RESULTS = 8;
var PALETTE_RECENT_MAX = 5;
var PALETTE_PREFS_KEY = "preferences";
function paletteActions() {
  return [
    { label: t("dashboard"), shortcut: "g d", kind: "action", action: () => navigate("/manager/dashboard") },
    { label: t("cmd_palette.action.shipments_pipeline"), shortcut: "g s", kind: "action", action: () => navigate("/manager/pipeline") },
    { label: t("masters_customers.title"), shortcut: "g c", kind: "action", action: () => navigate("/masters/customers") },
    { label: t("nav.reports.pnl_report"), shortcut: "g r", kind: "action", action: () => navigate("/manager/reports/pnl") },
    { label: t("cmd_palette.action.approve_all"), shortcut: null, kind: "action", action: () => navigate("/manager/approvals") },
    { label: t("close_period.title"), shortcut: null, kind: "action", action: () => navigate("/manager/finance/close-period") },
    { label: t("cmd_palette.action.sales_view"), shortcut: null, kind: "action", action: () => navigate("/dashboard") },
    { label: t("nav.sales.create_shipment"), shortcut: null, kind: "action", action: () => navigate("/shipments/new") }
  ];
}
function fuzzyScore(haystack, needle) {
  let hi = 0, score = 0, lastIdx = -1;
  for (const ch of needle.toLowerCase()) {
    const pos = haystack.toLowerCase().indexOf(ch, hi);
    if (pos < 0) return 0;
    score += lastIdx >= 0 ? Math.max(10 - (pos - lastIdx), 1) : 5;
    lastIdx = pos;
    hi = pos + 1;
  }
  return score;
}
function trapFocus(el, e) {
  const focusable = [...el.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])')];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.key === "Tab") {
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}
var VdgCmdPalette = class extends LitElement9 {
  static properties = {
    _open: { state: true },
    _query: { state: true },
    _results: { state: true },
    _activeIdx: { state: true }
  };
  createRenderRoot() {
    return this;
  }
  constructor() {
    super();
    this._open = false;
    this._query = "";
    this._results = [];
    this._activeIdx = 0;
    this._store = null;
    this._onOpen = (e) => {
      if (e.detail?.action === "open") this.open();
      if (e.detail?.action === "close") this.close();
      else this.toggle();
    };
    this._onKey = (e) => {
      if (!this._open) return;
      this._handleKey(e);
    };
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("vdg:cmd-palette", this._onOpen);
    window.addEventListener("keydown", this._onKey);
    this._store = window.__vdg_store || null;
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("vdg:cmd-palette", this._onOpen);
    window.removeEventListener("keydown", this._onKey);
  }
  toggle() {
    this._open ? this.close() : this.open();
  }
  open() {
    this._open = true;
    this._query = "";
    this._activeIdx = 0;
    this._loadRecent().then((r) => {
      this._results = r;
    });
    requestAnimationFrame(() => this.querySelector("#palette-input")?.focus());
  }
  close() {
    this._open = false;
    this._query = "";
    this._results = [];
  }
  async _loadRecent() {
    if (!this._store) return paletteActions().slice(0, PALETTE_MAX_RESULTS);
    try {
      const prefs = await this._store.cache_get_meta(PALETTE_PREFS_KEY);
      const recent = prefs?.palette_recent || [];
      return [...recent.slice(0, PALETTE_RECENT_MAX), ...paletteActions()].slice(0, PALETTE_MAX_RESULTS);
    } catch {
      return paletteActions().slice(0, PALETTE_MAX_RESULTS);
    }
  }
  async _search(q) {
    const candidates = [...paletteActions()];
    const lru = window.__vdg_lru;
    if (lru) {
      try {
        const ships = lru.getAll?.("shipment") || [];
        ships.forEach((s) => candidates.push({
          label: `${s.shipment_ref || s.id} \xB7 ${s.customer_name || s.customer || ""}`,
          kind: "shipment",
          id: s.id,
          action: null,
          shortcut: null
        }));
        const custs = lru.getAll?.("customers") || [];
        custs.forEach((c) => candidates.push({
          label: c.name || c.id,
          kind: "customers",
          id: c.id,
          action: null,
          shortcut: null
        }));
      } catch {
      }
    }
    const scored = candidates.map((c) => ({ ...c, score: fuzzyScore(c.label, q) })).filter((c) => c.score > 0).sort((a, b) => b.score - a.score).slice(0, PALETTE_MAX_RESULTS);
    return scored.length ? scored : await this._loadRecent();
  }
  async _handleInput(e) {
    this._query = e.target.value;
    this._activeIdx = 0;
    this._results = this._query.length >= 1 ? await this._search(this._query) : await this._loadRecent();
  }
  _handleKey(e) {
    const len = this._results.length;
    if (e.key === "Escape") {
      e.preventDefault();
      this.close();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "j") {
      e.preventDefault();
      this._activeIdx = (this._activeIdx + 1) % len;
    }
    if (e.key === "ArrowUp" || e.key === "k") {
      e.preventDefault();
      this._activeIdx = (this._activeIdx - 1 + len) % len;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      this._select(this._results[this._activeIdx]);
    }
    trapFocus(this, e);
  }
  async _select(item) {
    if (!item) return;
    if (item.kind === "action" || item.action) {
      item.action?.();
    } else {
      window.dispatchEvent(new CustomEvent("vdg:open-detail", {
        detail: { kind: item.kind, id: item.id }
      }));
    }
    await this._saveRecent(item);
    this.close();
  }
  async _saveRecent(item) {
    if (!this._store) return;
    try {
      const prefs = await this._store.cache_get_meta(PALETTE_PREFS_KEY) || { key: PALETTE_PREFS_KEY };
      const recent = (prefs.palette_recent || []).filter((r) => r.label !== item.label);
      recent.unshift({ label: item.label, kind: item.kind, id: item.id, action: null, shortcut: item.shortcut });
      prefs.palette_recent = recent.slice(0, PALETTE_RECENT_MAX);
      await this._store.cache_put_meta(PALETTE_PREFS_KEY, prefs);
    } catch {
    }
  }
  _handleClickOutside(e) {
    if (e.target === this.querySelector("#palette-backdrop")) this.close();
  }
  render() {
    if (!this._open) return html11``;
    return html11`
      <div id="palette-backdrop"
           class="fixed inset-0 z-[100] flex items-start justify-center pt-24 bg-black/40"
           @click="${(e) => this._handleClickOutside(e)}">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" stroke-linecap="round"/>
            </svg>
            <input id="palette-input"
                   .value="${this._query}"
                   @input="${(e) => this._handleInput(e)}"
                   placeholder="${t("cmd_palette.search_placeholder")}"
                   class="flex-1 outline-none text-sm text-slate-800 placeholder-slate-400"
                   aria-label="${t("cmd_palette.aria.search")}"
                   autocomplete="off" spellcheck="false" />
            <kbd class="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Esc</kbd>
          </div>

          ${this._results.length ? html11`
            <ul class="py-1 max-h-80 overflow-y-auto" role="listbox" aria-label="${t("cmd_palette.aria.results")}">
              ${this._results.map((r, i) => html11`
                <li role="option" aria-selected="${i === this._activeIdx}"
                    @click="${() => this._select(r)}"
                    @mouseenter="${() => {
      this._activeIdx = i;
    }}"
                    class="flex items-center gap-3 px-4 py-2.5 cursor-pointer
                           ${i === this._activeIdx ? "bg-blue-600/20 rounded" : "hover:bg-slate-50"}">
                  <span class="flex-1 text-sm text-slate-800 truncate">${r.label}</span>
                  ${r.shortcut ? html11`
                    <kbd class="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">${r.shortcut}</kbd>
                  ` : ""}
                </li>`)}
            </ul>
          ` : html11`
            <div class="px-4 py-6 text-center text-sm text-slate-400">${t("cmd_palette.no_results")}</div>
          `}

          <div class="px-4 py-2 border-t border-slate-100 flex gap-4 text-[10px] text-slate-400">
            <span>${t("cmd_palette.hint.navigate")}</span>
            <span>${t("cmd_palette.hint.select")}</span>
            <span>${t("cmd_palette.hint.close")}</span>
          </div>
        </div>
      </div>`;
  }
};
customElements.define("vdg-cmd-palette", VdgCmdPalette);

// output/web/js.tmp/implementations/storage/core_abstractions/oauth.js
var _impl2 = null;
function bindOAuthProvider(impl) {
  _impl2 = impl;
}
function _i2() {
  if (!_impl2) throw new Error("storage/oauth: no adapter bound (the storage bootstrap binds it)");
  return _impl2;
}
var hydrateSessionFromToken = (...a) => _i2().hydrateSessionFromToken(...a);
var initGoogleSignIn = (...a) => _i2().initGoogleSignIn(...a);
var renderSignInButton = (...a) => _i2().renderSignInButton(...a);

// output/web/js.tmp/implementations/ui/bootstrap/views/login.js
function sessionExpiredMessage() {
  return t("login.session_expired");
}
function loginHtml() {
  return `
    <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-lg border border-slate-100 w-full max-w-sm p-10 flex flex-col items-center gap-6">

        <!-- Logo -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800
                      flex items-center justify-center text-white font-bold text-lg tracking-tight">
            V
          </div>
          <div>
            <div class="text-base font-semibold text-slate-900 leading-tight">VDG FreightForwarder</div>
            <div class="text-[11px] text-slate-400">${t("login.workspace")}</div>
          </div>
        </div>

        <!-- Tagline -->
        <div class="text-center">
          <div class="text-sm font-medium text-slate-700">${t("login.tagline")}</div>
        </div>

        <!-- GIS button target -->
        <div id="gis-btn-target" class="w-full flex justify-center min-h-[44px]"></div>

        <!-- Error -->
        <div id="login-error" class="hidden text-xs text-red-600 text-center px-2"></div>

        <!-- #21 stall hint (extension holding the popup) -->
        <div id="login-hint" class="hidden text-xs text-amber-600 text-center px-2"></div>

        <!-- Footer -->
        <div class="text-[10px] text-slate-300 text-center">
          ${t("login.footer")}
          <div class="mt-1 font-mono text-slate-400">v0.4.38 (43e446a3)</div>
        </div>
      </div>
    </div>`;
}
function renderLoginPage(mountEl, onSuccess) {
  mountEl.innerHTML = loginHtml();
  const btnTarget = mountEl.querySelector("#gis-btn-target");
  const errorEl = mountEl.querySelector("#login-error");
  const hintEl = mountEl.querySelector("#login-hint");
  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.classList.remove("hidden");
  }
  window.addEventListener("vdg:signin-error", (e) => showError(t("login.signin_failed", { detail: e.detail })));
  window.addEventListener("vdg:session-expired", () => showError(sessionExpiredMessage()), { once: true });
  window.addEventListener("vdg:signin-stalled", () => {
    if (!hintEl) return;
    hintEl.textContent = t("login.signin_stalled");
    hintEl.classList.remove("hidden");
  });
  initGoogleSignIn(
    null,
    // no success callback — renderSignInButton does sign-in + location.reload()
    (err) => showError(t("login.signin_failed", { detail: err?.message || t("login.unknown_error") }))
  ).then(() => {
    if (btnTarget) renderSignInButton(btnTarget);
  }).catch((err) => {
    showError(t("login.gis_unavailable", { detail: err?.message || t("login.check_network") }));
  });
}

// output/web/js.tmp/implementations/storage/core_abstractions/local-store.js
var _store = null;
function bindLocalStore(store) {
  _store = store;
}
function _s() {
  if (!_store) throw new Error("storage/local-store: no local store bound");
  return _store;
}
function setStoreScope(email) {
  return _s().setStoreScope(email);
}
function sqlCountEntities() {
  return _s().sqlCountEntities();
}
function localStore() {
  return _s();
}

// output/web/js.tmp/implementations/storage/core_abstractions/storage-api.js
var _api = null;
function bindStorageApi(api) {
  _api = api;
}
function storageApi() {
  if (!_api) throw new Error("storage/storage-api: no adapter bound (the storage bootstrap binds it)");
  return _api;
}

// output/web/js.tmp/implementations/kernel/core_abstractions/ports/key-value.js
var _impl3 = null;
function bindKeyValueStore(impl) {
  _impl3 = impl;
}
function _i3() {
  if (!_impl3) throw new Error("kernel/key-value: no adapter bound (the kernel bootstrap binds it)");
  return _impl3;
}
var kvSet = (...a) => _i3().setItem(...a);

// output/web/js.tmp/implementations/storage/core_abstractions/grant-file.js
var GRANT_AREAS_KEY = "vdg.grant.areas";
function rememberGrantAreas(areas) {
  if (!Array.isArray(areas) || areas.length === 0) return;
  try {
    kvSet(GRANT_AREAS_KEY, JSON.stringify(areas));
  } catch {
  }
}

// output/web/js.tmp/implementations/storage/core_abstractions/workspace-authority.js
var VERDICT_MANAGER = "manager";
var VERDICT_GRANT = "grant";
var VERDICT_NOT_PROVISIONED = "not_provisioned";
var _adapter = null;
function bindWorkspaceAuthority(adapter) {
  _adapter = adapter;
}
function workspaceAuthority() {
  if (!_adapter) throw new Error("storage/workspace-authority: no adapter bound (the storage bootstrap binds it)");
  return _adapter;
}

// output/web/js.tmp/bootstrap/platform/auth.js
var AUTH_PROBE_TIMEOUT_MS = 2e4;
var ROLES_RESOLVED_EVENT2 = "vdg:roles-resolved";
var LOGIN_ROOT_ID = "login-root";
var LOGIN_OVERLAY_STYLE = "position:fixed;inset:0;z-index:50;background:#f8fafc;";
var BOOT_PLACEHOLDER_ID = "view-loading";
var RoleProbeTimeoutError = class extends Error {
  constructor() {
    super("Auth probe timeout");
    this.name = "RoleProbeTimeoutError";
  }
};
var _lastError = null;
function takeAuthError() {
  const err = _lastError;
  _lastError = null;
  return err;
}
function _readCache() {
  try {
    return JSON.parse(localStorage.getItem(ROLE_CACHE_KEY) || "null");
  } catch {
    return null;
  }
}
var authPlatform = {
  auth_current_user: async () => getCurrentUser() ?? null,
  auth_was_previously_signed_in: async () => !!wasPreviouslySignedIn(),
  auth_revive_session: async () => await rebuildSessionFromStoredToken() ?? null,
  auth_sign_out: async () => {
    await signOut();
  },
  auth_set_store_scope: async (email) => {
    setStoreScope(email);
  },
  auth_active_workspace_name: async () => activeWorkspaceName() || null,
  auth_remember_grant_areas: async (areas) => {
    rememberGrantAreas(areas ?? []);
  },
  // F-57-01 AC-04: does this browser already hold at least one synced entity row? Runs before
  // repo-init, straight to the SQLite singleton (which opens the worker + creates the schema on
  // first op). Any failure (no OPFS, timeout) reads as "no cache" — the safe fall-through.
  auth_has_cached_workspace: async () => {
    const result = await safeAwait(sqlCountEntities(), SAFE_AWAIT_DEFAULT_MS, 0, "auth-gate:hasCachedWorkspace");
    return result.ok ? (result.value ?? 0) > 0 : false;
  },
  auth_probe_role: async (user, workspace) => {
    try {
      return await Promise.race([
        workspaceAuthority().probeRole(user, workspace),
        new Promise((_, reject) => setTimeout(() => reject(new RoleProbeTimeoutError()), AUTH_PROBE_TIMEOUT_MS))
      ]);
    } catch (err) {
      _lastError = err;
      throw err;
    }
  },
  auth_cache_read: async () => _readCache(),
  auth_cache_write: async (entry) => {
    try {
      localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify(entry));
    } catch {
    }
  },
  auth_cache_clear: async () => {
    localStorage.removeItem(ROLE_CACHE_KEY);
    try {
      localStorage.removeItem(GRANT_AREAS_KEY);
    } catch {
    }
  },
  // F-42-05: the route guard reads the Rust principal directly (auth_session_roles), so this is
  // announcement-only now — a real change fires the event, the chrome re-renders and re-reads.
  auth_publish_roles: (roles, changed) => {
    if (!changed) return;
    window.dispatchEvent(new CustomEvent(ROLES_RESOLVED_EVENT2, { detail: { roles: [...roles || []] } }));
  }
};
var _renderLoginPage = null;
var _loginMounted = false;
function configureAuthPlatform({ renderLoginPage: renderLoginPage2 } = {}) {
  if (renderLoginPage2) _renderLoginPage = renderLoginPage2;
}
function mountLoginScreen(onSignedIn) {
  if (_loginMounted) return;
  if (!_renderLoginPage) throw new Error("platform/auth: configureAuthPlatform({ renderLoginPage }) was not called by bootstrap");
  _loginMounted = true;
  const placeholder = document.getElementById(BOOT_PLACEHOLDER_ID);
  if (placeholder) placeholder.hidden = true;
  let loginRoot = document.getElementById(LOGIN_ROOT_ID);
  if (!loginRoot) {
    loginRoot = document.createElement("div");
    loginRoot.id = LOGIN_ROOT_ID;
    loginRoot.style.cssText = LOGIN_OVERLAY_STYLE;
    document.body.appendChild(loginRoot);
  }
  loginRoot.innerHTML = "";
  _renderLoginPage(loginRoot, (user) => {
    loginRoot.remove();
    _loginMounted = false;
    onSignedIn(user);
  });
}

// output/web/js.tmp/implementations/storage/core_abstractions/priced-envelope.js
var REQUIRED_ROW_FIELDS = ["pricing_key", "valid_from", "valid_to"];
var UNKNOWN_CURRENCY = { Other: "UNKNOWN" };
var KNOWN_CURRENCY_CODES = /* @__PURE__ */ new Set(["VND", "USD", "CNY", "EUR", "JPY", "KRW", "SGD", "THB", "INR"]);
function _normalizeCurrency(code) {
  if (!code) return UNKNOWN_CURRENCY;
  const up = String(code).toUpperCase();
  if (KNOWN_CURRENCY_CODES.has(up)) return up.charAt(0) + up.slice(1).toLowerCase();
  return { Other: String(code) };
}
function toPricedEnvelope(id, row) {
  const missing = REQUIRED_ROW_FIELDS.filter((f) => !row?.[f]);
  if (missing.length) throw new Error(`priced row '${id}' is missing ${missing.join(", ")}`);
  return {
    record_id: id,
    pricing_key: row.pricing_key,
    valid_from: row.valid_from,
    valid_to: row.valid_to,
    currency: _normalizeCurrency(row.currency),
    body: row
  };
}

// output/web/js.tmp/bootstrap/platform/cache.js
var repo = () => window.__vdg_repo;
var io = () => window.__vdg_io;
async function bounded(promise, tag) {
  const res = await safeAwait(promise, SAFE_AWAIT_DEFAULT_MS, null, tag);
  if (!res.ok) throw res.error || new Error(`cache platform: ${tag} did not settle`);
  return res.value ?? null;
}
var cachePlatform = {
  cache_get: (kind, id) => bounded(repo().get(kind, id), `cache:get:${kind}`),
  cache_list: (kind) => bounded(repo().list(kind, null), `cache:list:${kind}`).then((r) => r || []),
  cache_put: (kind, id, body) => bounded(repo().put(kind, id, body), `cache:put:${kind}`),
  cache_meta_get: (key) => bounded(io().cache_get_meta(key), `cache:meta-get:${key}`),
  cache_meta_put: (key, body) => bounded(io().cache_put_meta(key, body), `cache:meta-put:${key}`),
  cache_priced_envelope: async (id, row) => toPricedEnvelope(id, row),
  cache_priced_seed: async (kind, records) => {
    const ref = window.__vdg_priced_repos?.[kind];
    if (!ref) return null;
    return await bounded(ref.seedIfEmpty(records), `cache:priced-seed:${kind}`) ?? {};
  },
  // A legacy job goes back through the SPLIT write path — a plain put would land the whole record,
  // revenue included, in the folder CS reads. Lines written before E-37 carry no line_id and the
  // split refuses a line without one, so they are stamped with the scheme the form uses.
  cache_replay_shipment: async (record) => {
    const ref = record.shipment_ref || record.id;
    const lines = (record.pnl_lines || []).map((ln, i) => ({ line_id: ln.line_id || pnlLineId(ref, i + 1), ...ln }));
    return bounded(putShipment(repo(), { ...record, shipment_ref: ref, pnl_lines: lines }), "cache:replay-shipment");
  },
  cache_ws_list_dir: (dir) => bounded(io().ws_list_dir(dir), `cache:ws-list:${dir}`),
  cache_ws_read_file: (dir, name) => bounded(io().ws_read_file(dir, name), `cache:ws-read:${dir}`),
  cache_ws_write_file: (dir, name, content, fileId) => bounded(io().ws_write_file(dir, name, content, fileId, ""), `cache:ws-write:${dir}`),
  cache_local_date: (ms) => toLocalDateStr(ms)
};

// output/web/js.tmp/bootstrap/platform/data.js
var AUDIT_STORE_REVENUE = "revenue_audit_log";
var JSONL_SUFFIX = ".jsonl";
var _scans = /* @__PURE__ */ new Map();
function ioPort() {
  return window.__vdg_io || null;
}
function isAnsweredStatus(status) {
  const wasm3 = window.__vdg_wasm;
  if (!wasm3?.governance_classify_read_status) return false;
  return wasm3.governance_classify_read_status({ status: status ?? null }).decided;
}
async function readForkBundles(dir) {
  const io2 = ioPort();
  if (!io2) return [];
  let listing;
  try {
    listing = await io2.ws_list_dir(dir);
  } catch (err) {
    if (isAnsweredStatus(err?.status)) return [];
    throw err;
  }
  if (!listing?.files?.length) return [];
  const bodies = [];
  for (const file of listing.files) {
    if (!file.name.endsWith(JSONL_SUFFIX)) continue;
    try {
      window.__vdg_repo?.network_rate_check();
    } catch {
      break;
    }
    let res;
    try {
      res = await io2.ws_read_file(dir, file.name);
    } catch (err) {
      if (isAnsweredStatus(err?.status)) continue;
      throw err;
    }
    if (!res?.found) continue;
    bodies.push(String(res.content));
  }
  return bodies;
}
var dataPlatform = {
  /// Every *.jsonl body in one fork folder. A folder this reader was never granted (403/404)
  /// yields [] — "no file" is the correct answer. A folder that could not be READ (401/429/5xx/
  /// transport) throws instead of yielding [] — see readForkBundles/isAnsweredStatus above.
  data_fork_read_jsonl: async (dir, ttlMs) => {
    const hit = _scans.get(dir);
    if (ttlMs > 0 && hit && Date.now() - hit.at < ttlMs) return hit.bodies;
    const bodies = await readForkBundles(dir);
    if (ttlMs > 0) _scans.set(dir, { at: Date.now(), bodies });
    return bodies;
  },
  data_clear_fork_scan: async (prefix) => {
    if (!prefix) {
      _scans.clear();
      return;
    }
    for (const dir of [..._scans.keys()]) {
      if (dir.startsWith(`users/${prefix}/`)) _scans.delete(dir);
    }
  },
  /// The identity the fork paths are actually built from — `_resolveFolder` builds `users/{prefix}`
  /// from the io port's own userEmail, and a mirror of it can be stale.
  data_io_user_email: async () => ioPort()?.userEmail || "",
  /// The licence claim the boot gate stamped; null when it has not run.
  data_license_status: async () => window.__vdg_license_status ?? null,
  /// Append one shipment change list to the trail its readers already hold.
  data_audit_append: async (store, kind, entityId, op2, body, changes) => {
    const log = window.__vdg_audit_log;
    if (!log) return false;
    if (store === AUDIT_STORE_REVENUE) log.appendRevenue(kind, entityId, op2, body, changes);
    else log.append(kind, entityId, op2, body, changes);
    return true;
  }
};

// output/web/js.tmp/bootstrap/platform/sync.js
var WMA_STORE_TIMEOUT_MS = 2e3;
var TOKEN_RADIX = 36;
var TOKEN_START = 2;
var TOKEN_END = 7;
var HEX_PAD = 2;
var DJB2_SEED = 5381;
function _djb2(text) {
  let h = DJB2_SEED;
  for (let i = 0; i < text.length; i++) h = (h << 5) + h ^ text.charCodeAt(i);
  return h >>> 0;
}
var syncPlatform = {
  sync_sha256_hex: async (text) => {
    try {
      const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(HEX_PAD, "0")).join("");
    } catch {
      return _djb2(text).toString(16);
    }
  },
  sync_crypto_secure: () => typeof crypto !== "undefined" && !!crypto.subtle,
  sync_token: () => Math.random().toString(TOKEN_RADIX).slice(TOKEN_START, TOKEN_END),
  sync_today_local: () => todayLocal(),
  sync_wma_get: async (key) => {
    const store = window.__vdg_store;
    if (!store) return null;
    const { ok, value } = await safeAwait(store.cache_get_wma(key), WMA_STORE_TIMEOUT_MS, null, "wma:load");
    return ok ? value ?? null : null;
  },
  sync_wma_put: async (key, value) => {
    const store = window.__vdg_store;
    if (!store) return;
    const { ok, error } = await safeAwait(store.cache_put_wma(key, value), WMA_STORE_TIMEOUT_MS, null, "wma:save");
    if (!ok) throw new Error(error?.message || "wma:save timed out");
  }
};

// output/web/js.tmp/bootstrap/platform/manager.js
var managerPlatform = {
  ledger_chart_of_accounts: () => ledgerRepo().chartOfAccounts(),
  ledger_posting_rules: () => ledgerRepo().postingRules(),
  ledger_existing_account_codes: (year) => ledgerRepo().listAccountCodes(year),
  ledger_list_legs: (year, acc_code) => ledgerRepo().listLegs(year, acc_code, null, null),
  ledger_replace_leg: (year, acc_code, leg) => ledgerRepo().replaceLeg(year, acc_code, leg),
  ledger_remove_entry: (year, entry_id) => ledgerRepo().removeEntry(year, entry_id),
  ledger_append_reconciliation: (record) => ledgerRepo().appendReconciliationRecord(record),
  ledger_last_reconciliation: () => ledgerRepo().getLastReconciliation(),
  ledger_append_repost: (record) => ledgerRepo().appendRepostRecord(record)
};

// output/web/js.tmp/bootstrap/platform/governance.js
var UNKNOWN_OP_MESSAGE = "unknown workspace op";
function userRepo() {
  return window.__vdg_user_repo || null;
}
function ledgerRepo2() {
  return window.__vdg_ledger_repo || null;
}
async function workspaceTry(op2, args) {
  const api = storageApi();
  if (typeof api[op2] !== "function") {
    return { ok: false, error: { message: `${UNKNOWN_OP_MESSAGE}: ${op2}` } };
  }
  try {
    const value = await api[op2](...Array.isArray(args) ? args : [args]);
    return { ok: true, value: value ?? null };
  } catch (err) {
    return {
      ok: false,
      error: {
        message: err?.message ?? String(err),
        status: err?.status ?? null,
        rate_limited: err?.rateLimited === true
      }
    };
  }
}
var governancePlatform = {
  governance_workspace_try: workspaceTry,
  governance_workspace_name: async () => activeWorkspaceName() || "",
  governance_users_list: async () => await userRepo()?.list() ?? [],
  governance_users_get: async (email) => await userRepo()?.get(email) ?? null,
  governance_users_upsert: async (record) => await userRepo()?.upsert(record) ?? record,
  governance_users_remove: async (email) => {
    await userRepo()?.remove(email);
  },
  // H4-e: the raw, restorable grant shape (no Users-screen role/workspace/created_at/active
  // projection) — the workspace backup export's own reach (UserStoreRepo.listRaw()).
  governance_users_list_raw: async () => await userRepo()?.listRaw() ?? [],
  governance_audit_append: async (kind, subject, action, detail) => {
    window.__vdg_audit_log?.append(kind, subject, action, detail);
  },
  governance_user_audit_write: async (action, email, before, after, driveOps) => {
    window.__vdg_user_audit_log?.write(action, email, before, after, driveOps);
  },
  governance_ledger_accounts: async () => await ledgerRepo2()?.chartOfAccounts() ?? [],
  governance_ledger_balance: async (account, asOf) => {
    const repo3 = ledgerRepo2();
    if (!repo3) throw new Error("ledger repo not ready");
    return repo3.getBalance(account, asOf);
  },
  // F1: reuses the same fx-rates domain island the FX admin screen and the sales-new P&L form
  // resolve through — period close asks for a number the same way a P&L line does.
  governance_fx_closing_rate: async (date, pair, direction) => fxRateRepo.getRate(date, pair, direction)
};

// output/web/js.tmp/implementations/storage/core_abstractions/backend.js
var _impl4 = null;
function bindBackend(impl) {
  _impl4 = impl;
}
function _i4() {
  if (!_impl4) throw new Error("storage/backend: no adapter bound (the storage bootstrap binds it)");
  return _impl4;
}
var apiFetch = (...a) => _i4().apiFetch(...a);
var rememberSessionToken = (...a) => _i4().rememberSessionToken(...a);
var adoptSessionToken = (...a) => _i4().adoptSessionToken(...a);

// output/web/js.tmp/implementations/storage/core_abstractions/api-error.js
var ApiError = class extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
};

// output/web/js.tmp/bootstrap/platform/flows.js
var JSZIP_CDN = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
var ZIP_COMPRESSION = "DEFLATE";
var ZIP_LEVEL = 6;
var HTTP_TRANSPORT_FAILURE = 0;
var HTTP_NOT_FOUND = 404;
var HTTP_CONFLICT = 409;
function wasm() {
  return window.__vdg_wasm;
}
function repo2() {
  return window.__vdg_repo;
}
function normCollection(dirId) {
  return String(dirId || "").replace(/^\/+|\/+$/g, "");
}
var SHIPMENT_OPS = {
  putShipment: (shipment) => putShipment(repo2(), shipment),
  putEnvelope: (ref, record) => putEnvelope(repo2(), ref, record),
  deleteShipment: (ref) => deleteShipment(repo2(), ref)
};
async function loadJsZip() {
  if (window.JSZip) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = JSZIP_CDN;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
var flowsPlatform = {
  // license_arm classifies AND arms the wasm write guard — the boot gate goes through here so the
  // verdict the repo enforces is the one the screen renders. The Rust i64 param is a JS BigInt.
  flows_license_arm: async (license, nowUnix) => wasm().license_arm(license, BigInt(Math.trunc(nowUnix))),
  flows_fsm_register: async (entityId, state) => wasm().register_entity(entityId, state) ?? null,
  flows_fsm_auto_advance: async (entityId, shipment) => wasm().shipment_auto_advance(entityId, JSON.stringify(shipment)) ?? null,
  flows_mint_quote_ref: async (salt) => repo2()?.mint_quote_ref(String(salt || "")) ?? null,
  flows_today_local: async () => todayLocal(),
  flows_active_workspace: async () => activeWorkspaceName(),
  // Bounded, and TEXT: a JWT and a JSONL seed are both text, and JSON.parse throws on either.
  flows_fetch_text: async (url) => {
    const result = await safeAwait(fetch(url), SAFE_AWAIT_DEFAULT_MS, null, "flows:fetch-text");
    if (!result.ok) throw result.error ?? new Error(`fetch timed out: ${url}`);
    const res = result.value;
    const body = await res.text();
    return { status: res.status, ok: res.ok, body };
  },
  flows_zip_download: async (filename, entries) => {
    await loadJsZip();
    const zip = new window.JSZip();
    for (const { path, content } of entries || []) zip.file(path, content);
    const blob = await zip.generateAsync({ type: "blob", compression: ZIP_COMPRESSION, compressionOptions: { level: ZIP_LEVEL } });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return { ok: true };
  },
  // Read-or-create a CharterDB record (jobno_lease.rs's per-rep-code counter file): `dirId` names
  // the collection, `name` is the record id — the same `${collection}/${id}` addressing
  // ws_read_file/ws_write_file already use, so the `id` handed back here round-trips through
  // flows_cas_upload below. etag/content ride along too (the CAS loop's compare-and-swap target),
  // captured straight from the GET/POST response instead of a separate getFile round trip. A 409
  // on create just means another device seeded it first — the record is there either way, which is
  // exactly what "get or create" asks for, but with no etag of its own to hand back: the caller's
  // next CAS attempt re-reads and gets one then.
  flows_get_or_create_file: async (dirId, name, content) => {
    const collection = normCollection(dirId);
    try {
      const existing = await apiFetch("GET", `/records/${encodeURIComponent(collection)}/${encodeURIComponent(name)}`);
      return { id: `${collection}/${name}`, etag: existing.etag ?? null, content: existing.content ?? null };
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== HTTP_NOT_FOUND) throw err;
    }
    try {
      const created = await apiFetch("POST", `/records/${encodeURIComponent(collection)}`, { id: name, owner: currentUserEmail(), content });
      return { id: `${collection}/${name}`, etag: created.etag ?? null, content: created.content ?? content };
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== HTTP_CONFLICT) throw err;
    }
    return { id: `${collection}/${name}` };
  },
  // A lost CAS race (412) is an expected outcome of a counter claim, so it answers instead of
  // throwing — the operator decides whether to retry. `fileId` is the `${collection}/${name}` id
  // flows_get_or_create_file above hands back; CharterDB's own If-Match does the compare-and-swap.
  flows_cas_upload: async (fileId, name, body, etag) => {
    const suffix = `/${name}`;
    const collection = String(fileId || "").endsWith(suffix) ? fileId.slice(0, -suffix.length) : "";
    try {
      await apiFetch("PUT", `/records/${encodeURIComponent(collection)}/${encodeURIComponent(name)}`, { content: body }, { "If-Match": etag });
      return { ok: true, status: HTTP_TRANSPORT_FAILURE };
    } catch (err) {
      return { ok: false, status: err?.status ?? HTTP_TRANSPORT_FAILURE };
    }
  },
  flows_shipments_call: async (op2, args) => {
    const call = SHIPMENT_OPS[op2];
    if (!call) throw new Error(`flows_shipments_call: unknown op ${op2}`);
    return await call(...Array.isArray(args) ? args : [args]) ?? null;
  },
  flows_ledger_call: async (op2, args) => {
    const led = ledgerRepo();
    if (typeof led[op2] !== "function") throw new Error(`flows_ledger_call: unknown op ${op2}`);
    return await led[op2](...Array.isArray(args) ? args : [args]) ?? null;
  }
};

// output/web/js.tmp/bootstrap/platform/index.js
var PREFS_NS = "prefs";
function createPlatform({ repo: repo3 }) {
  const base = {
    records_get: (kind, id) => repo3.get(kind, id),
    records_list: (kind) => repo3.list(kind),
    records_put: (kind, id, body) => repo3.put(kind, id, body),
    // CDB-DM-15: labels to stamp -- only meaningful on a brand-new record (EntityStoreOperator::
    // put's own rule); `WasmEntityRepo::put_labeled` (wasm_repo.rs) is the CREATE-time path.
    records_put_labeled: (kind, id, body, labels) => repo3.put_labeled(kind, id, body, labels),
    // A reopened period invalidates the store module's own "fully cached" marker for it
    // (tick.rs::invalidate_period_cache) -- same-session only, see that fn's own doc comment.
    records_invalidate_period_cache: (kind, period) => repo3.invalidate_period_cache(kind, period),
    records_delete: (kind, id) => repo3.delete(kind, id),
    // meta lives in the same SQLite store the repo's io port uses (window.__vdg_io, set at boot)
    records_get_meta: (key) => window.__vdg_io ? window.__vdg_io.cache_get_meta(key) : null,
    records_put_meta: (key, body) => window.__vdg_io ? window.__vdg_io.cache_put_meta(key, body) : null,
    // H4-d: the two bespoke stores (month-partitioned, no `kind` records_list can route to) the
    // workspace backup export reaches directly — same repo object, dedicated dump methods
    // (store::bootstrap::wasm_repo_stores::fx_list_all/awb_list_all).
    records_fx_list_all: () => repo3.fx_list_all(),
    records_awb_list_all: () => repo3.awb_list_all(),
    prefs_get: async (key) => {
      const v = localStorage.getItem(`${PREFS_NS}:${key}`);
      return v == null ? null : JSON.parse(v);
    },
    prefs_set: async (key, value) => {
      localStorage.setItem(`${PREFS_NS}:${key}`, JSON.stringify(value));
    },
    events_emit: async (name, detail) => {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    },
    log: (level, message) => {
      (console[level] || console.log)(`[freight_app] ${message}`);
    },
    now_ms: () => Date.now(),
    workspace_call: async (op2, args) => {
      const api = storageApi();
      if (typeof api[op2] !== "function") throw new Error(`workspace_call: unknown op ${op2}`);
      return api[op2](...Array.isArray(args) ? args : [args]);
    },
    http_json: async (method, url, body) => {
      const { ok, value: res, error } = await safeAwait(
        fetch(url, { method, headers: { "content-type": "application/json" }, body: method === "GET" ? void 0 : JSON.stringify(body) }),
        SAFE_AWAIT_DEFAULT_MS,
        void 0,
        `http_json:${method}:${url}`
      );
      if (!ok) throw error;
      const text = await res.text();
      return { status: res.status, ok: res.ok, body: text ? JSON.parse(text) : null };
    },
    store: localStore
  };
  return { ...base, ...authPlatform, ...cachePlatform, ...dataPlatform, ...syncPlatform, ...managerPlatform, ...governancePlatform, ...flowsPlatform };
}

// output/web/js.tmp/bootstrap/compose-ui/auth.js
var OUTCOME_SIGNED_IN = "signed-in";
var OUTCOME_DEGRADED = "degraded";
var NEEDS_RECONNECT_EVENT = "vdg:auth-needs-reconnect";
var SIGNIN_REQUEST_EVENT = "vdg:auth-signin-request";
var _signinListenerWired = false;
function composeAuth(wasm3) {
  const sessionRoles = {
    currentSalesRepId: () => wasm3.auth_session_roles({}).token ?? null,
    currentRoles: () => wasm3.auth_session_roles({}).roles,
    // session_principal.rs's own `resolved()` -- tells an empty currentRoles() apart from a
    // probe that never got an answer (see session-roles.js's own doc comment).
    currentRolesResolved: () => !!wasm3.auth_session_roles({}).resolved,
    hasRole: (role) => wasm3.auth_has_role({ role }).has,
    setResolvedRoles: (token, roles) => wasm3.auth_set_resolved_roles({ token: token ?? null, roles: roles ?? null }).token ?? null
  };
  bindSessionRoles(sessionRoles);
  const detectRoleViaServer = async (user, options = {}) => {
    const reply = await wasm3.auth_detect_role({ user: user ?? null, force: !!options.force });
    if (!reply.ok) throw takeAuthError() || new Error(reply.error || "auth: the workspace authority did not answer");
    return reply.role;
  };
  const detectOrThrow = async (user, tag) => {
    const result = await safeAwait(detectRoleViaServer(user), SAFE_AWAIT_DEFAULT_MS, null, tag);
    if (!result.ok) throw result.error;
    return result.value;
  };
  const signIn = (onSignedIn) => mountLoginScreen(async (user) => {
    await wasm3.auth_adopt_session({ email: user.email });
    await detectOrThrow(user, "auth-gate:loginCb");
    onSignedIn(user);
  });
  const requireAuth2 = async (onSignedIn) => {
    const verdict = await wasm3.auth_require_auth({});
    if (verdict.outcome === OUTCOME_SIGNED_IN) {
      await detectOrThrow(verdict.user, "auth-gate:requireAuth");
      await onSignedIn(verdict.user);
      return;
    }
    if (verdict.outcome === OUTCOME_DEGRADED) {
      await onSignedIn(verdict.user);
      window.dispatchEvent(new CustomEvent(NEEDS_RECONNECT_EVENT));
      return;
    }
    signIn(onSignedIn);
  };
  bindAuthGate({ requireAuth: requireAuth2, detectRoleViaServer, clearRoleCache: () => wasm3.auth_clear_role_cache({}) });
  if (!_signinListenerWired) {
    _signinListenerWired = true;
    window.addEventListener(SIGNIN_REQUEST_EVENT, () => signIn(() => location.reload()));
  }
}

// output/web/js.tmp/implementations/storage/core_abstractions/server-session.js
var SERVER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
var _impl5 = null;
function bindServerSession(impl) {
  _impl5 = impl;
}
function _i5() {
  if (!_impl5) throw new Error("storage/server-session: no adapter bound (the storage bootstrap binds it)");
  return _impl5;
}
var serverSessionIdentity = (...a) => _i5().serverSessionIdentity(...a);

// output/web/js.tmp/implementations/storage/core_abstractions/popup-guard.js
var _impl6 = null;
function bindPopupGuard(impl) {
  _impl6 = impl;
}
function _i6() {
  if (!_impl6) throw new Error("storage/popup-guard: no adapter bound (the storage bootstrap binds it)");
  return _impl6;
}
var ensureWindowOpen = (...a) => _i6().ensureWindowOpen(...a);

// output/web/js.tmp/implementations/storage/core_abstractions/token-anchor.js
var ANCHOR_EVT_POPUP_BLOCKED = "popup-blocked";
var ANCHOR_EVT_SIGNIN_REQUIRED = "signin-required";
var _impl7 = null;
function bindTokenAnchorFactory(impl) {
  _impl7 = impl;
}
function _i7() {
  if (!_impl7) throw new Error("storage/token-anchor: no adapter bound (the storage bootstrap binds it)");
  return _impl7;
}
var createTokenAnchor = (...a) => _i7().createTokenAnchor(...a);

// output/web/js.tmp/implementations/storage/core_abstractions/token.js
var ACCESS_TOKEN_ISSUED_KEY = "vdg.auth.access_token_issued";
var _impl8 = null;
function bindTokenAuthority(impl) {
  _impl8 = impl;
}
function _i8() {
  if (!_impl8) throw new Error("storage/token: no adapter bound (the storage bootstrap binds it)");
  return _impl8;
}
var reconnectInteractive = (...a) => _i8().reconnectInteractive(...a);

// output/web/js.tmp/implementations/storage/core_abstractions/events.js
var _impl9 = null;
function bindEventBus(impl) {
  _impl9 = impl;
}
function _i9() {
  if (!_impl9) throw new Error("storage/events: no adapter bound (the storage bootstrap binds it)");
  return _impl9;
}
var dispatchAppEvent = (...a) => _i9().dispatchAppEvent(...a);

// output/web/js.tmp/implementations/storage/implementations/server/backend.js
var HEALTH_PATH = "/api/health";
var API_PREFIX = "/api";
var CREDENTIALS_MODE = API_BASE ? "include" : "same-origin";
var PROBE_TIMEOUT_MS = 1500;
var TRANSPORT_SAFE_AWAIT_MARGIN_MS = 5e3;
var BACKEND_SERVER = "server";
var SESSION_TOKEN_HEADER = "X-Vdg-Session";
var SESSION_TOKEN_KEY = "vdg.session-token";
var BACKEND_KEY = "vdg.backend";
var _backend = null;
async function detectBackend() {
  if (_backend) return _backend;
  if (API_BASE) {
    _backend = BACKEND_SERVER;
    return _backend;
  }
  const remembered = _readRemembered();
  if (remembered) {
    _backend = remembered;
    return _backend;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  const { ok, value: res } = await safeAwait(
    fetch(`${API_BASE}${HEALTH_PATH}`, { signal: ctrl.signal, credentials: CREDENTIALS_MODE }),
    PROBE_TIMEOUT_MS + TRANSPORT_SAFE_AWAIT_MARGIN_MS,
    void 0,
    "detectBackend:health"
  );
  clearTimeout(timer);
  const body = ok && res.ok ? await res.json().catch(() => null) : null;
  if (!(body && body.ok === true) && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("vdg:server-health", { detail: { unreachable: true } }));
  }
  _backend = BACKEND_SERVER;
  try {
    sessionStorage.setItem(BACKEND_KEY, _backend);
  } catch {
  }
  return _backend;
}
function _readRemembered() {
  try {
    return sessionStorage.getItem(BACKEND_KEY);
  } catch {
    return null;
  }
}
function _resetBackend() {
  _backend = null;
  try {
    sessionStorage.removeItem(BACKEND_KEY);
  } catch {
  }
}
function readSessionToken() {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY) || sessionStorage.getItem(SESSION_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}
async function adoptSessionToken2(token) {
  rememberSessionToken2(token);
}
function rememberSessionToken2(token) {
  try {
    if (token) {
      localStorage.setItem(SESSION_TOKEN_KEY, token);
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(SESSION_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
  }
}
var API_FETCH_TIMEOUT_MS = 3e4;
function _nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
var _apiReqSeq = 0;
async function apiFetch2(method, path, body = void 0, extraHeaders = {}) {
  const url = `${API_BASE}${API_PREFIX}${path}`;
  const opts = { method, credentials: CREDENTIALS_MODE, headers: { ...extraHeaders } };
  const token = readSessionToken();
  if (token) opts.headers[SESSION_TOKEN_HEADER] = token;
  if (body !== void 0) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error("fetch timeout (30s)")), API_FETCH_TIMEOUT_MS);
  opts.signal = ctrl.signal;
  const reqId = `r${++_apiReqSeq}`;
  const startedAtMs = Date.now();
  console.log(`[API][${reqId}][${_nowIso()}] Fetching ${method} ${url}...`);
  const { ok, value: res, error } = await safeAwait(
    fetch(url, opts),
    API_FETCH_TIMEOUT_MS + TRANSPORT_SAFE_AWAIT_MARGIN_MS,
    void 0,
    `apiFetch:${method}:${path}`
  );
  clearTimeout(timer);
  if (!ok) {
    console.error(`[API][${reqId}][${_nowIso()} +${Date.now() - startedAtMs}ms] Fetch failed for ${method} ${url}:`, error);
    throw new ApiError(0, `server unreachable: ${error.message}`);
  }
  console.log(`[API][${reqId}][${_nowIso()} +${Date.now() - startedAtMs}ms] Response from ${method} ${url}:`, res.status);
  const backlogHeader = res.headers?.get("x-replication-backlog");
  const providerHeader = res.headers?.get("x-secondary-provider") || res.headers?.get("x-replication-provider");
  if (backlogHeader !== null && backlogHeader !== void 0) {
    const backlog_depth = parseInt(backlogHeader, 10);
    if (!Number.isNaN(backlog_depth) && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("vdg:server-health", {
        detail: { backlog_depth, provider: providerHeader || void 0 }
      }));
    }
  }
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (path === "/health" && json && typeof window !== "undefined") {
    const backlog_depth = json.mirror?.backlog_depth ?? json.replication_backlog ?? 0;
    const oldest_pending_age_ms = json.mirror?.oldest_pending_age_ms ?? null;
    const provider = json.mirror?.provider ?? json.secondary_provider ?? providerHeader ?? "Google Drive";
    window.dispatchEvent(new CustomEvent("vdg:server-health", {
      detail: { backlog_depth, oldest_pending_age_ms, provider }
    }));
  }
  if (!res.ok) {
    throw new ApiError(res.status, json?.reason || json?.error?.message || `${res.status} ${res.statusText}`);
  }
  return json;
}
var backend = { detectBackend, apiFetch: apiFetch2, rememberSessionToken: rememberSessionToken2, adoptSessionToken: adoptSessionToken2, _resetBackend };

// output/web/js.tmp/implementations/storage/implementations/server/server-session.js
async function serverSessionIdentity2() {
  try {
    console.log("[Auth] Fetching /me to check server session...");
    const me = await apiFetch("GET", "/me");
    console.log("[Auth] /me response:", me);
    return me?.email ? { email: me.email, name: me.name || "" } : null;
  } catch (e) {
    console.error("[Auth] serverSessionIdentity failed (401 or unreachable):", e);
    return null;
  }
}
var serverSession = { serverSessionIdentity: serverSessionIdentity2 };

// output/web/js.tmp/implementations/storage/implementations/server/server-users.js
var USERS_PATH = "/users";
async function listUsers2({ role, includeInactive } = {}) {
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (includeInactive) params.set("include_inactive", "true");
  const qs = params.toString() ? `?${params.toString()}` : "";
  return apiFetch("GET", `${USERS_PATH}${qs}`);
}
async function createUser({ email, display_name, roles }) {
  return apiFetch("POST", USERS_PATH, { email, display_name, roles });
}
async function patchUser(email, body) {
  return apiFetch("PATCH", `${USERS_PATH}/${encodeURIComponent(email)}`, body);
}

// output/web/js.tmp/implementations/kernel/core_abstractions/util/fork-id.js
function forkId(email) {
  return (email || "").trim().toLowerCase();
}

// output/web/js.tmp/implementations/storage/implementations/server/server-role.js
async function probeRole(user, _wsName) {
  const me = await apiFetch("GET", "/me");
  const roles = Array.isArray(me?.roles) ? me.roles.filter(Boolean) : [];
  const areas = Array.isArray(me?.areas) ? me.areas.map((a) => ({ path: a.path, folder_id: a.folder_id })) : [];
  if (me?.is_owner) return { kind: VERDICT_MANAGER };
  if (roles.length > 0) {
    return { kind: VERDICT_GRANT, token: String(me.fork || forkId(user.email)).toUpperCase(), roles, areas };
  }
  return { kind: VERDICT_NOT_PROVISIONED };
}
var serverWorkspaceAuthority = { probeRole };

// output/web/js.tmp/implementations/storage/core_abstractions/io-port-shared.js
var UNKNOWN_AUTHOR = "unknown";
var SharedIoPort = class {
  constructor(userEmail) {
    this.userEmail = userEmail;
  }
  cache_get(kind, id) {
    return localStore().cache_get(kind, id);
  }
  cache_list(kind) {
    return localStore().cache_list(kind);
  }
  cache_put(kind, id, body) {
    return localStore().cache_put(kind, id, body);
  }
  cache_delete(kind, id) {
    return localStore().cache_delete(kind, id);
  }
  cache_get_meta(key) {
    return localStore().cache_get_meta(key);
  }
  cache_put_meta(key, body) {
    return localStore().cache_put_meta(key, body);
  }
  async dispatch_event(eventName, detail) {
    dispatchAppEvent(eventName, detail);
  }
  // Author identity for _rev_by provenance (F-28-06) — the live signed-in user, falling back to
  // the boot-time email this port was constructed with.
  async current_user_email() {
    let live = null;
    try {
      live = getCurrentUser();
    } catch {
      live = null;
    }
    return live?.email || this.userEmail || UNKNOWN_AUTHOR;
  }
  async ledger_get_chart() {
    return ledgerRepo().chartOfAccounts();
  }
  async ledger_get_rules() {
    return ledgerRepo().postingRules();
  }
  async ledger_is_posted(posted_index) {
    return ledgerRepo().isAlreadyPosted(posted_index);
  }
  async ledger_append_leg(year, account_code, leg) {
    return ledgerRepo().appendLeg(year, account_code, leg);
  }
  async ledger_record_posted(posted_index, ids) {
    return ledgerRepo().recordPosted(posted_index, ids);
  }
};

// output/web/js.tmp/implementations/storage/core_abstractions/storage-layout.js
var KIND_PATH_OVERRIDES = {
  error_log: "_shared/error-log",
  audit_log: "_shared/logs/audit-log"
};

// output/web/js.tmp/implementations/storage/implementations/server/server-io-adapters.js
var HTTP_NOT_FOUND2 = 404;
var HTTP_PRECONDITION = 412;
var CAS_FAILED_MSG = "412 Precondition Failed";
var ServerIoPort = class extends SharedIoPort {
  // `fork` accepted for call-site compatibility (createIoPort passes one) but unused: it only
  // ever fed document_collection_kind's users/{fork}/{kind} prefix-strip, which had no caller
  // left once the change feed started reporting `collection` directly (CDB-CF-03) instead of a
  // folder id needing that reverse lookup.
  constructor(serverApi, userEmail, _fork = null) {
    super(userEmail);
    this.serverApi = serverApi;
  }
  // ── Native CharterDB API ──────────────────────────────────────────────────
  async record_read(collection, id) {
    try {
      const res = await apiFetch("GET", `/records/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`);
      if (!res?.id) return { found: false, content: "", etag: null, version: null, owner: null };
      return { found: true, content: res.content ?? "", etag: res.etag ?? null, version: res.version, owner: res.owner ?? null };
    } catch (err) {
      if (err instanceof ApiError && err.status === HTTP_NOT_FOUND2) {
        return { found: false, content: "", etag: null, version: null, owner: null };
      }
      throw err;
    }
  }
  // CDB-DM-15: `labels` is wire-opaque JSON object text (`{"k":"v",...}`), the same shape
  // `record_list`'s own filter speaks -- CREATE-only, parsed and sent only on the POST branch.
  // The server's Update body has no labels field at all (`deny_unknown_fields`), so it is never
  // even attempted on the PUT branches below, whatever this caller passed.
  // `owner` is the caller's declared owner (CDB-DM-04) -- this adapter is a thin relay, it never
  // mints one from the signed-in session. A create with no owner declared is a caller bug, not a
  // session-identity fallback (that mint was the defect: CS keying a job in on a rep's behalf
  // silently became the record CS owns).
  async record_write(collection, id, content, etag = null, labels = "", owner = null) {
    if (!etag && !owner) throw new Error(`record_write: ${collection}/${id} create with no owner declared`);
    try {
      if (etag) {
        const res = await apiFetch(
          "PUT",
          `/records/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`,
          { content },
          { "If-Match": etag }
        );
        return { id: res.id, etag: res.etag, version: res.version };
      }
      const createBody = labels ? { id, content, owner, labels: JSON.parse(labels) } : { id, content, owner };
      try {
        const res = await apiFetch(
          "POST",
          `/records/${encodeURIComponent(collection)}`,
          createBody
        );
        return { id: res.id, etag: res.etag, version: res.version };
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          const res = await apiFetch(
            "PUT",
            `/records/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`,
            { content }
          );
          return { id: res.id, etag: res.etag, version: res.version };
        }
        throw err;
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === HTTP_PRECONDITION) throw new Error(CAS_FAILED_MSG);
      throw err;
    }
  }
  async record_delete(collection, id) {
    try {
      await apiFetch("DELETE", `/records/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === HTTP_NOT_FOUND2) return false;
      throw err;
    }
  }
  // CDB-Q-02, param order matches TransportPort::list_records(collection, owner, cursor, limit)
  // 1:1 -- `ws_list_dir` below calls this with only `collection` (every default applies) so its
  // own single-page, unfiltered listing is unaffected by this order. `labels` -- CDB-Q-19's
  // wire-opaque JSON object text, same shape `record_write`'s own labels param speaks.
  async record_list(collection, owner = null, cursor = null, limit = 1e3, labels = "") {
    const path = this._normPath(collection);
    try {
      let url = `/records/${encodeURIComponent(path)}?limit=${limit}`;
      if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
      if (owner) url += `&owner=${encodeURIComponent(owner)}`;
      if (labels) url += `&labels=${encodeURIComponent(labels)}`;
      const res = await apiFetch("GET", url);
      return { records: res?.records ?? [], next_cursor: res?.next_cursor ?? null, has_more: res?.has_more ?? false };
    } catch (err) {
      if (err instanceof ApiError && err.status === HTTP_NOT_FOUND2) {
        return { records: [], next_cursor: null, has_more: false };
      }
      throw err;
    }
  }
  async changes(since = "0", limit = null, includeContent = false) {
    let url = `/changes?since=${encodeURIComponent(since)}`;
    if (limit) url += `&limit=${limit}`;
    if (includeContent) url += "&include_content=true";
    const res = await apiFetch("GET", url);
    return res;
  }
  async start_cursor() {
    const res = await apiFetch("GET", "/changes/start");
    return res?.next_cursor || "0";
  }
  async poll_health() {
    try {
      const res = await apiFetch("GET", "/health");
      if (res && typeof window !== "undefined") {
        const backlog_depth = res.mirror?.backlog_depth ?? res.replication_backlog ?? 0;
        const oldest_pending_age_ms = res.mirror?.oldest_pending_age_ms ?? null;
        const provider = res.mirror?.provider ?? res.secondary_provider ?? "Google Drive";
        window.dispatchEvent(new CustomEvent("vdg:server-health", {
          detail: {
            backlog_depth,
            oldest_pending_age_ms,
            provider
          }
        }));
      }
      return res;
    } catch {
      return null;
    }
  }
  // ── where things live ─────────────────────────────────────────────────────
  _kindPath(kind) {
    return KIND_PATH_OVERRIDES[kind] ?? kind;
  }
  _normPath(path) {
    return String(path || "").replace(/^\/+|\/+$/g, "");
  }
  // document_read/document_write/document_list/document_read_file (the bundle grain's period-file
  // API, and the per-record fetch that briefly replaced it) are gone with
  // sync_bundle/pull_kind_by_listing and sync_delta.rs's move onto TransportPort (ws_read_file,
  // via fetch_record) on the Rust side — every registered kind is per-record now
  // (cache_policy::PER_RECORD_REGISTRY).
  _parseFileId(fileId) {
    const norm = String(fileId || "").replace(/\/+/g, "/");
    if (!norm.includes("/")) return { col: "", id: norm };
    const idx = norm.lastIndexOf("/");
    return { col: norm.slice(0, idx), id: norm.slice(idx + 1) };
  }
  // F-58-02: poll_health() used to fire here too — once per Changes page, roughly doubling the
  // delta engine's HTTP volume for a signal nobody needed at that cadence. The read routes
  // (RecordGet/RecordList/Changes) carry no x-replication-backlog header (only RecordCreate/
  // RecordUpdate stamp it — server/src/bootstrap/edge/dispatch.rs), so the read-only sync path
  // never saw it that way either. Health now polls on its own slow timer (sync-schedulers.js
  // startHealthPoll) instead of riding every page fetch.
  // CDB-CF-03/CF-15: CharterDB already reports collection/id/owner/version/event and (per
  // CDB-CF-15) whether the caller has caught up on every /changes page — passed straight through,
  // raw, so TransportPort::fetch_changes (charter_transport_bridge.rs) does the one real shaping
  // this deserves, not a JS-side re-derivation that used to collapse the event into a bare
  // `removed` boolean and drop `owner` entirely.
  async changes_feed(pageToken, limit, includeContent) {
    return this.changes(pageToken || "0", limit, includeContent);
  }
  async changes_cursor() {
    const cursor = await this.start_cursor();
    return { cursor };
  }
  // ── path-addressed workspace files ────────────────────────────────────────
  async ws_list_dir(dirPath) {
    const collection = this._normPath(dirPath);
    const res = await this.record_list(collection);
    return {
      files: res.records.map((r) => ({
        id: `${collection}/${r.id}`,
        name: r.id,
        version: String(r.version)
      }))
    };
  }
  async ws_read_file(dirPath, fileName) {
    const collection = this._normPath(dirPath);
    const r = await this.record_read(collection, fileName);
    if (!r.found) return { found: false, id: null, etag: null, version: null, owner: null, content: "" };
    return { found: true, id: `${collection}/${fileName}`, etag: r.etag, version: r.version, owner: r.owner, content: r.content };
  }
  async ws_write_file(dirPath, fileName, content, fileId, etag, labels = "", owner = null) {
    const collection = this._normPath(dirPath);
    const r = await this.record_write(collection, fileName, content, etag, labels, owner);
    return { id: fileName, etag: r.etag, version: r.version };
  }
  async ws_delete_file(fileId) {
    const { col, id } = this._parseFileId(fileId);
    await this.record_delete(col, id);
    return null;
  }
  // CDB-DM-16: declare (or redeclare) one collection's label vocabulary -- the registry entry
  // a labelled create/Relabel is checked against before it is ever authorized.
  async declare_collection(collection, labelKeysJson, owner) {
    const res = await apiFetch("PUT", `/collections/${encodeURIComponent(collection)}`, {
      label_keys: JSON.parse(labelKeysJson),
      owner
    });
    return { id: res?.id ?? collection };
  }
};

// output/web/js.tmp/implementations/storage/implementations/auth/window-open-guard.js
var BLANK_SRC = "about:blank";
var NATIVE_FN_MARKER = "[native code]";
function defaultIframeFactory() {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = BLANK_SRC;
  document.body.appendChild(iframe);
  return iframe;
}
function isNativeOpen(fn) {
  if (typeof fn !== "function") return false;
  try {
    return Function.prototype.toString.call(fn).includes(NATIVE_FN_MARKER);
  } catch {
    return false;
  }
}
function ensureWindowOpen2(win = window, makeIframe = defaultIframeFactory) {
  if (isNativeOpen(win.open)) return true;
  let iframe = null;
  try {
    iframe = makeIframe();
    const nativeOpen = iframe?.contentWindow?.open;
    if (typeof nativeOpen === "function") {
      win.open = nativeOpen.bind(win);
      return true;
    }
  } catch {
  } finally {
    if (iframe && typeof iframe.remove === "function") iframe.remove();
  }
  return typeof win.open === "function";
}
var popupGuard = { ensureWindowOpen: ensureWindowOpen2, isNativeOpen };

// output/web/js.tmp/implementations/storage/implementations/auth/profile-cache.js
function readCachedProfile2() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
  } catch {
    return null;
  }
}
function writeCachedProfile2({ email, name, picture } = {}) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({
    email: email || "",
    name: name || "",
    picture: picture || ""
  }));
}
var profileCache = { readCachedProfile: readCachedProfile2, writeCachedProfile: writeCachedProfile2 };

// output/web/js.tmp/implementations/storage/implementations/auth/gis-error.js
var GIS_ERROR_POPUP_FAILED = "popup_failed_to_open";
var GIS_ERROR_POPUP_CLOSED = "popup_closed";
var POPUP_BLOCKED_TYPES = Object.freeze([GIS_ERROR_POPUP_FAILED, GIS_ERROR_POPUP_CLOSED]);
function isPopupBlockedError(type) {
  return POPUP_BLOCKED_TYPES.includes(type);
}
function gisErrorMessage(err) {
  const type = err?.type || "unknown";
  return isPopupBlockedError(type) ? `popup-blocked:${type}` : `gis-error:${type}`;
}

// output/web/js.tmp/implementations/storage/implementations/auth/token-anchor.js
var DEFAULT_SILENT_TIMEOUT_MS = 6e3;
var DEFAULT_FAILURE_COOLDOWN_MS = 3e4;
function createTokenAnchor2({
  clientId,
  scope,
  keys,
  // { token, exp, issued } — storage key names
  storage,
  // Storage-like; resolved LAZILY (default globalThis.localStorage) so constructing the anchor at module scope never touches the environment
  gis = () => window.google?.accounts?.oauth2,
  loginHint = () => void 0,
  // () => email — pins every mint to the working account
  verifyAccount = async () => true,
  // (resp, hint) => bool — reject cross-account mints
  ensurePopup = () => true,
  // pre-flight window.open guard; false => blocked
  silentTimeoutMs = DEFAULT_SILENT_TIMEOUT_MS,
  failureCooldownMs = DEFAULT_FAILURE_COOLDOWN_MS,
  now = () => Date.now(),
  emit = () => {
  }
} = {}) {
  let _inflight = null;
  let _cooldownUntil = 0;
  let _cooldownToken = null;
  let _cooldownError = null;
  const _store2 = () => storage ?? globalThis.localStorage;
  function current() {
    return _store2().getItem(keys.token);
  }
  function expiresAt() {
    const v = _store2().getItem(keys.exp);
    return v ? Number(v) : null;
  }
  function persist(resp) {
    const expMs = now() + (resp.expires_in || 3600) * 1e3;
    _store2().setItem(keys.token, resp.access_token);
    _store2().setItem(keys.exp, String(expMs));
    _store2().setItem(keys.issued, String(now()));
    return expMs;
  }
  function mint(prompt, { timeoutMs = 0, returnResp = false } = {}) {
    return new Promise((resolve, reject) => {
      const oauth2 = gis();
      if (!oauth2) {
        reject(new Error("GIS oauth2 not loaded"));
        return;
      }
      let settled = false;
      const timer = timeoutMs ? setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error("silent-refresh-timeout"));
        }
      }, timeoutMs) : null;
      const done = (fn, arg) => {
        if (!settled) {
          settled = true;
          if (timer) clearTimeout(timer);
          fn(arg);
        }
      };
      const hint = loginHint();
      const client = oauth2.initTokenClient({
        client_id: clientId,
        scope,
        ...hint ? { login_hint: hint } : {},
        callback: (resp) => {
          if (resp.error) {
            done(reject, new Error(resp.error));
            return;
          }
          Promise.resolve(verifyAccount(resp, hint)).then((same) => {
            if (!same) {
              done(reject, new Error(`account-mismatch:${hint}`));
              return;
            }
            persist(resp);
            done(resolve, returnResp ? resp : resp.access_token);
          }).catch((e) => done(reject, e));
        },
        // A definitive GIS error settles immediately, distinct from the timeout — a blocked
        // popup must never eat the full bound.
        error_callback: (err) => {
          const type = err?.type || "unknown";
          done(reject, new Error(POPUP_BLOCKED_TYPES.includes(type) ? `popup-blocked:${type}` : `gis-error:${type}`));
        }
      });
      if (!ensurePopup()) {
        emit(ANCHOR_EVT_POPUP_BLOCKED);
        done(reject, new Error("popup-blocked:window-open-unavailable"));
        return;
      }
      client.requestAccessToken({ prompt });
    });
  }
  function silent() {
    return mint("", { timeoutMs: silentTimeoutMs });
  }
  function recover(usedToken) {
    const cur = current();
    if (cur && cur !== usedToken) return Promise.resolve(cur);
    if (_cooldownToken === cur && now() < _cooldownUntil) {
      return Promise.reject(_cooldownError || new Error("recover-cooldown"));
    }
    if (!_inflight) {
      _inflight = silent().catch((err) => {
        _cooldownToken = cur;
        _cooldownUntil = now() + failureCooldownMs;
        _cooldownError = err;
        throw err;
      }).finally(() => {
        _inflight = null;
      });
    }
    return _inflight;
  }
  async function reconnect() {
    try {
      return await mint("", { returnResp: true });
    } catch (err) {
      const msg = String(err?.message || "");
      if (msg.startsWith("popup-blocked:")) throw err;
      if (msg.startsWith("account-mismatch:")) {
        try {
          return await mint("select_account", { returnResp: true });
        } catch (err2) {
          if (String(err2?.message || "").startsWith("account-mismatch:")) emit(ANCHOR_EVT_SIGNIN_REQUIRED);
          throw err2;
        }
      }
      return mint("consent", { returnResp: true });
    }
  }
  return { current, expiresAt, persist, mint, silent, recover, reconnect };
}
var tokenAnchorFactory = { createTokenAnchor: createTokenAnchor2 };

// output/web/js.tmp/implementations/kernel/core_abstractions/ports/base64.js
var _impl10 = null;
function bindBase64(impl) {
  _impl10 = impl;
}
function _i10() {
  if (!_impl10) throw new Error("kernel/base64: no adapter bound (the kernel bootstrap binds it)");
  return _impl10;
}
var b64Decode = (...a) => _i10().decode(...a);
var b64Encode = (...a) => _i10().encode(...a);

// output/web/js.tmp/implementations/storage/core_abstractions/id-token.js
var TOKEN_KEY = "vdg.auth.id_token";
function parseIdToken(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      b64Decode(base64).split("").map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}
function buildUser(token) {
  const payload = parseIdToken(token);
  if (!payload) return null;
  const nowSec = Math.floor(nowMs() / 1e3);
  if (payload.exp && payload.exp < nowSec) return null;
  return {
    email: payload.email || "",
    name: payload.name || "",
    picture: payload.picture || "",
    sub: payload.sub || "",
    id_token: token
  };
}
function encodeSyntheticIdToken(payload) {
  const header = b64Encode(JSON.stringify({ alg: "none" }));
  const body = b64Encode(unescape(encodeURIComponent(JSON.stringify(payload))));
  return `${header}.${body}.`;
}

// output/web/js.tmp/implementations/storage/implementations/auth/userinfo.js
var USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
var USERINFO_FETCH_TIMEOUT_MS = 8e3;
var UserinfoFetchTimeoutError = class extends Error {
  constructor() {
    super("userinfo fetch timeout");
    this.name = "UserinfoFetchTimeoutError";
  }
};
async function fetchUserinfo(accessToken) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), USERINFO_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(USERINFO_URL, {
      headers: { Authorization: "Bearer " + accessToken },
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`userinfo ${res.status}`);
    return await res.json();
  } catch (err) {
    throw err?.name === "AbortError" ? new UserinfoFetchTimeoutError() : err;
  } finally {
    clearTimeout(timer);
  }
}

// output/web/js.tmp/implementations/storage/core_abstractions/oauth-scope.js
var IDENTITY_SCOPE = "openid email profile";

// output/web/js.tmp/implementations/storage/implementations/auth/access-token.js
var CLIENT_ID = "875515041729-klcro7nakobu353ktf0k2s2fkuu7u38n.apps.googleusercontent.com";
var ID_TOKEN_KEY = "vdg.auth.id_token";
var ACCESS_TOKEN_KEY = "vdg.auth.access_token";
var ACCESS_TOKEN_EXP_KEY = "vdg.auth.access_token_exp";
var SILENT_REFRESH_TIMEOUT_MS = Math.max(1e3, SAFE_AWAIT_DEFAULT_MS - 2e3);
function _sessionEmail() {
  const token = localStorage.getItem(ID_TOKEN_KEY);
  const payload = token ? parseIdToken(token) : null;
  if (payload?.email) return payload.email;
  try {
    const raw = localStorage.getItem(ROLE_CACHE_KEY);
    const email = raw ? JSON.parse(raw)?.email : null;
    return email || void 0;
  } catch {
    return void 0;
  }
}
async function _verifySameAccount(resp, expectedEmail) {
  if (!expectedEmail) return true;
  const info = await fetchUserinfo(resp.access_token);
  return (info.email || "").toLowerCase() === expectedEmail.toLowerCase();
}
var _anchorInstance = null;
function _anchor() {
  if (_anchorInstance) return _anchorInstance;
  _anchorInstance = createTokenAnchor({
    clientId: CLIENT_ID,
    // The browser talks only to the server — the only thing a token has to carry is identity, which
    // is all the server needs to mint a session. Asking for a wider scope got Google's "hasn't
    // verified this app" warning in front of every reconnect, for a permission the build never uses.
    scope: IDENTITY_SCOPE,
    keys: { token: ACCESS_TOKEN_KEY, exp: ACCESS_TOKEN_EXP_KEY, issued: ACCESS_TOKEN_ISSUED_KEY },
    loginHint: _sessionEmail,
    verifyAccount: _verifySameAccount,
    ensurePopup: ensureWindowOpen,
    // F-49-01 — restore a native window.open an ad-blocker may have nulled
    silentTimeoutMs: SILENT_REFRESH_TIMEOUT_MS,
    emit: (name) => {
      if (name === ANCHOR_EVT_POPUP_BLOCKED) window.dispatchEvent(new CustomEvent("vdg:auth-popup-blocked"));
      if (name === ANCHOR_EVT_SIGNIN_REQUIRED) window.dispatchEvent(new CustomEvent("vdg:auth-signin-request"));
    }
  });
  return _anchorInstance;
}
async function getAccessToken() {
  return _anchor().current();
}
function refreshAccessTokenSilently() {
  return _anchor().silent();
}
function recoverFromUnauthorized(usedToken) {
  return _anchor().recover(usedToken);
}
function reconnectInteractive2() {
  return _anchor().reconnect();
}
var tokenAuthority = { getAccessToken, refreshAccessTokenSilently, recoverFromUnauthorized, reconnectInteractive: reconnectInteractive2 };

// output/web/js.tmp/implementations/storage/implementations/auth/signin-button.js
var SIGNIN_STALL_HINT_MS = 6e4;
function renderSignInButton2(container, { hydrate, clientId }) {
  if (!container) return;
  container.innerHTML = `
    <button id="vdg-signin-btn"
            class="w-full flex items-center justify-center gap-3 px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50 transition">
      <svg viewBox="0 0 24 24" class="w-5 h-5 shrink-0" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      <span class="text-sm font-medium text-slate-700">${t("login.signin_button")}</span>
    </button>
  `;
  container.querySelector("#vdg-signin-btn").addEventListener("click", () => {
    let stallTimer = null;
    const answered = () => {
      if (stallTimer) {
        clearTimeout(stallTimer);
        stallTimer = null;
      }
    };
    const btnSpan = container.querySelector("#vdg-signin-btn span");
    const origText = btnSpan ? btnSpan.textContent : "";
    if (btnSpan) btnSpan.textContent = t("login.signin_opening");
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      // Identity only — no consent screen, no second popup. The server never touches Drive.
      scope: IDENTITY_SCOPE,
      callback: (resp) => {
        answered();
        if (resp.error) {
          if (btnSpan) btnSpan.textContent = origText;
          window.dispatchEvent(new CustomEvent("vdg:signin-error", { detail: resp.error }));
          return;
        }
        if (btnSpan) btnSpan.textContent = t("login.signin_verifying");
        console.log("[Auth] Google OAuth callback received. Response error:", resp.error);
        console.log("[Auth] Calling hydrate(resp)...");
        hydrate(resp).then((builtUser) => {
          console.log("[Auth] hydrate successful. Resulting user:", builtUser);
          console.log("[Auth] Reloading page to apply new session...");
          location.reload();
        }).catch((err) => {
          console.error("[Auth] hydrate failed:", err);
          if (btnSpan) btnSpan.textContent = origText;
          window.dispatchEvent(new CustomEvent("vdg:signin-error", { detail: err.message }));
        });
      },
      // F-35-01 AC-02 — fail fast on a blocked popup instead of hanging with no callback at all.
      error_callback: (err) => {
        answered();
        if (btnSpan) btnSpan.textContent = origText;
        window.dispatchEvent(new CustomEvent("vdg:signin-error", { detail: gisErrorMessage(err) }));
      }
    });
    if (!ensureWindowOpen()) {
      window.dispatchEvent(new CustomEvent("vdg:auth-popup-blocked"));
      window.dispatchEvent(new CustomEvent("vdg:signin-error", { detail: "popup-blocked:window-open-unavailable" }));
      return;
    }
    stallTimer = setTimeout(() => {
      stallTimer = null;
      window.dispatchEvent(new CustomEvent("vdg:signin-stalled"));
    }, SIGNIN_STALL_HINT_MS);
    client.requestAccessToken({ prompt: "select_account" });
  });
}

// output/web/js.tmp/implementations/storage/implementations/auth/google-oauth.js
var CLIENT_ID2 = "875515041729-klcro7nakobu353ktf0k2s2fkuu7u38n.apps.googleusercontent.com";
var ACCESS_TOKEN_KEY2 = "vdg.auth.access_token";
var ACCESS_TOKEN_EXP_KEY2 = "vdg.auth.access_token_exp";
var GIS_SCRIPT_URL = "https://accounts.google.com/gsi/client";
var GIS_SCRIPT_TIMEOUT = 1e4;
var DEFAULT_TOKEN_TTL_SEC = 3600;
var AUTH_STORAGE_KEYS = Object.freeze([
  TOKEN_KEY,
  ACCESS_TOKEN_KEY2,
  ACCESS_TOKEN_EXP_KEY2,
  ROLE_CACHE_KEY,
  PROFILE_KEY,
  "vdg.session-token"
  // display profile & server session token
]);
var _currentUser = null;
function getCurrentUser2() {
  if (_currentUser) return _currentUser;
  const stored = localStorage.getItem(TOKEN_KEY);
  if (!stored) return null;
  _currentUser = buildUser(stored);
  if (!_currentUser) localStorage.removeItem(TOKEN_KEY);
  if (_currentUser && !localStorage.getItem(PROFILE_KEY)) writeCachedProfile(_currentUser);
  return _currentUser;
}
function signOut2() {
  for (const k of AUTH_STORAGE_KEYS) localStorage.removeItem(k);
  _currentUser = null;
  return apiFetch("DELETE", "/session").catch((e) => {
    console.warn("sign-out: server session not ended:", e?.message || e);
  }).finally(() => rememberSessionToken(""));
}
function wasPreviouslySignedIn2() {
  return localStorage.getItem(ACCESS_TOKEN_EXP_KEY2) != null;
}
function restampIdTokenExp(accessExpMs) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;
  const payload = parseIdToken(token);
  if (!payload) return false;
  payload.exp = Math.floor(accessExpMs / 1e3);
  localStorage.setItem(TOKEN_KEY, encodeSyntheticIdToken(payload));
  _currentUser = null;
  return true;
}
function _persistAccessToken(resp) {
  const expMs = Date.now() + (resp.expires_in || DEFAULT_TOKEN_TTL_SEC) * 1e3;
  localStorage.removeItem(ACCESS_TOKEN_KEY2);
  localStorage.removeItem(ACCESS_TOKEN_EXP_KEY2);
  return expMs;
}
async function rebuildSessionFromStoredToken2() {
  const me = await serverSessionIdentity();
  if (!me) return null;
  const cached2 = readCachedProfile();
  localStorage.setItem(TOKEN_KEY, encodeSyntheticIdToken({
    email: me.email,
    name: me.name || cached2?.name || "",
    picture: cached2?.picture || "",
    sub: cached2?.sub || me.email,
    exp: Math.floor((Date.now() + SERVER_SESSION_TTL_MS) / 1e3)
  }));
  _currentUser = null;
  return getCurrentUser2();
}
async function hydrateSessionFromToken2(resp) {
  console.log("[Auth] Hydrating session from token...", { hasAccessToken: !!resp?.access_token });
  _persistAccessToken(resp);
  const expSec = Math.floor((Date.now() + SERVER_SESSION_TTL_MS) / 1e3);
  console.log("[Auth] POSTing to /session");
  try {
    const opened = await apiFetch("POST", "/session", { token: resp.access_token });
    console.log("[Auth] /session POST result:", opened);
    if (opened?.token) {
      console.log("[Auth] Adopting session token...");
      await adoptSessionToken(opened.token);
    }
  } catch (e) {
    console.error("[Auth] Failed to create session via POST /session:", e);
  }
  console.log("[Auth] Fetching userinfo from Google...");
  const info = await fetchUserinfo(resp.access_token);
  console.log("[Auth] Userinfo fetched:", info);
  const tokenPayload = {
    email: info.email,
    name: info.name,
    picture: info.picture,
    sub: info.sub,
    exp: expSec
  };
  console.log("[Auth] Writing TOKEN_KEY with payload:", tokenPayload);
  localStorage.setItem(TOKEN_KEY, encodeSyntheticIdToken(tokenPayload));
  writeCachedProfile(info);
  _currentUser = null;
  const builtUser = getCurrentUser2();
  console.log("[Auth] Built user from token:", builtUser);
  return builtUser;
}
function loadGisScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = GIS_SCRIPT_URL;
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error("GIS script failed to load"));
    document.head.appendChild(s);
    setTimeout(() => reject(new Error("GIS script timeout")), GIS_SCRIPT_TIMEOUT);
  });
}
async function initGoogleSignIn2(onSuccess, onError) {
  try {
    await loadGisScript();
  } catch (err) {
    if (onError) onError(err);
  }
}
function renderSignInButton3(container) {
  return renderSignInButton2(container, { hydrate: hydrateSessionFromToken2, clientId: CLIENT_ID2 });
}
if (typeof window !== "undefined") window.__vdg_auth = { getCurrentUser: getCurrentUser2, signOut: signOut2 };
var identityProvider = { getCurrentUser: getCurrentUser2, signOut: signOut2, wasPreviouslySignedIn: wasPreviouslySignedIn2, rebuildSessionFromStoredToken: rebuildSessionFromStoredToken2 };
var oauthProvider = { hydrateSessionFromToken: hydrateSessionFromToken2, restampIdTokenExp, initGoogleSignIn: initGoogleSignIn2, renderSignInButton: renderSignInButton3 };

// output/web/js.tmp/implementations/storage/implementations/local/store-client.js
var INIT_TIMEOUT_MS = 2e4;
var OP_TIMEOUT_MS = 5e3;
var SqliteUnavailableError = class extends Error {
  constructor(msg) {
    super(msg);
    this.name = "SqliteUnavailableError";
  }
};
var LOCKED_ERR_RE = /sahpool-genuine-conflict|NoModificationAllowedError/i;
var _lockedAnnounced = false;
function _announceLockedIf(errMsg) {
  if (_lockedAnnounced || !errMsg || !LOCKED_ERR_RE.test(String(errMsg))) return;
  _lockedAnnounced = true;
  window.dispatchEvent(new CustomEvent("vdg:store-locked", { detail: { kind: "genuine-conflict", reason: String(errMsg) } }));
}
var BUS_NAME = "vdg-sqlite-bus";
var LEADER_LOCK = "vdg-sqlite-leader";
var RID_SEP = "|";
var SCOPE_MAX_LEN = 64;
var _scope = null;
function storeScopeKey(email) {
  return String(email || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, SCOPE_MAX_LEN);
}
function setStoreScope2(email) {
  const key = storeScopeKey(email);
  if (!key) throw new SqliteUnavailableError("store scope requires a signed-in account");
  if (_scope && _scope !== key) {
    throw new SqliteUnavailableError(`store scope changed (${_scope} \u2192 ${key}) \u2014 reload required`);
  }
  _scope = key;
}
var LEADER_STEAL_AFTER_TIMEOUTS = 2;
var _followerTimeouts = 0;
var _stealAttempted = false;
var _bus = null;
var _tabId = null;
var _isLeader = false;
var _engine = null;
var _ready = null;
var _seq2 = 0;
var _pending = /* @__PURE__ */ new Map();
var _injected = null;
function _deliver(payload) {
  const { rid, ok, result, err } = payload || {};
  const p = _pending.get(rid);
  if (!p) return;
  _pending.delete(rid);
  clearTimeout(p.timer);
  _followerTimeouts = 0;
  if (ok) p.resolve(result);
  else {
    _announceLockedIf(err);
    p.reject(new SqliteUnavailableError(err || "sqlite worker error"));
  }
}
function _spawnEngine() {
  const workerUrl = new URL("js/implementations/storage/implementations/local/store-worker.js", document.baseURI);
  _engine = new Worker(workerUrl, { type: "module" });
  _engine.onmessage = (ev) => {
    if (ev.data?.fatal) {
      console.error("[store-client worker fatal]", ev.data.err);
      const dead = new SqliteUnavailableError("sqlite worker crashed: " + ev.data.err);
      for (const [, p] of _pending) {
        clearTimeout(p.timer);
        p.reject(dead);
      }
      _pending.clear();
      _announceLockedIf(ev.data.err);
      try {
        _engine.terminate();
      } catch {
      }
      _engine = null;
      _ready = null;
      return;
    }
    const { rid, ok, result, err } = ev.data || {};
    const sep = String(rid).indexOf(RID_SEP);
    const tab = String(rid).slice(0, sep);
    const orig = Number(String(rid).slice(sep + 1));
    const payload = { rid: orig, ok, result, err };
    if (tab === _tabId) _deliver(payload);
    else _bus.postMessage({ t: "res", tab, m: payload });
  };
  _engine.onerror = (e) => {
    console.error("[store-client worker onerror]", e);
    const dead = new SqliteUnavailableError("sqlite worker crashed: " + (e?.message || "unknown"));
    for (const [, p] of _pending) {
      clearTimeout(p.timer);
      p.reject(dead);
    }
    _pending.clear();
    _engine = null;
    _ready = null;
  };
}
function _forwardToEngine(tab, msg) {
  if (!_engine) _spawnEngine();
  _engine.postMessage({ ...msg, rid: `${tab}${RID_SEP}${msg.rid}` });
}
function _dispatch(msg) {
  if (_isLeader) _forwardToEngine(_tabId, msg);
  else _bus.postMessage({ t: "req", tab: _tabId, m: msg });
}
function _resendPending() {
  for (const [, p] of _pending) _dispatch(p.msg);
}
function _lockName() {
  return `${LEADER_LOCK}:${_scope}`;
}
var HAS_LOCKS_API = typeof navigator !== "undefined" && typeof navigator.locks?.request === "function";
function _becomeLeader() {
  _isLeader = true;
  _resendPending();
  _bus.postMessage({ t: "leader" });
  return new Promise(() => {
  });
}
function _releaseEngine() {
  if (!_engine) return;
  try {
    _engine.postMessage({ op: "release" });
  } catch {
  }
  _engine = null;
  _ready = null;
}
if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("pagehide", _releaseEngine);
}
function ensureTransport() {
  if (_bus) return;
  if (!_scope) throw new SqliteUnavailableError("store scope not set \u2014 the local database is per-account");
  _tabId = "t" + Math.random().toString(36).slice(2, 10);
  _bus = new BroadcastChannel(`${BUS_NAME}:${_scope}`);
  _bus.onmessage = (ev) => {
    const m = ev.data || {};
    if (m.t === "req" && _isLeader) _forwardToEngine(m.tab, m.m);
    else if (m.t === "res" && m.tab === _tabId) _deliver(m.m);
    else if (m.t === "leader" && !_isLeader) _resendPending();
  };
  if (navigator.locks?.request) {
    navigator.locks.request(_lockName(), _becomeLeader).catch((err) => {
      if (err?.name === "AbortError") {
        _isLeader = false;
        _releaseEngine();
        return;
      }
      _isLeader = true;
    });
  } else {
    _isLeader = true;
  }
}
function _onOpTimeout() {
  if (_isLeader || _stealAttempted) return;
  if (++_followerTimeouts < LEADER_STEAL_AFTER_TIMEOUTS) return;
  _stealAttempted = true;
  if (!navigator.locks?.request) return;
  navigator.locks.request(_lockName(), { steal: true }, _becomeLeader).catch((err) => {
    _announceLockedIf(err?.message);
  });
}
function send(op2, extra, timeoutMs) {
  ensureTransport();
  const rid = ++_seq2;
  const msg = { rid, op: op2, ...extra, scope: _scope, hasLockExclusivity: HAS_LOCKS_API };
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      _pending.delete(rid);
      _onOpTimeout();
      reject(new SqliteUnavailableError(op2 + " timed out \u2014 sqlite worker unresponsive"));
    }, timeoutMs);
    _pending.set(rid, { resolve, reject, timer, msg });
    _dispatch(msg);
  });
}
function ensureReady() {
  ensureTransport();
  if (!_ready) _ready = send("init", {}, INIT_TIMEOUT_MS).catch((e) => {
    _ready = null;
    throw e;
  });
  return _ready;
}
async function op(name, extra) {
  await ensureReady();
  return send(name, extra, OP_TIMEOUT_MS);
}
var sqliteStore = {
  cache_get: (kind, id) => _injected ? _injected.cache_get(kind, id) : op("get", { kind, id }),
  cache_list: (kind) => _injected ? _injected.cache_list(kind) : op("list", { kind }),
  cache_put: (kind, id, body) => _injected ? _injected.cache_put(kind, id, body) : op("put", { kind, id, body }),
  cache_delete: (kind, id) => _injected ? _injected.cache_delete(kind, id) : op("delete", { kind, id }),
  cache_get_meta: (key) => _injected ? _injected.cache_get_meta(key) : op("getMeta", { key }),
  cache_put_meta: (key, body) => _injected ? _injected.cache_put_meta(key, body) : op("putMeta", { key, body }),
  cache_delete_meta: (key) => _injected ? _injected.cache_delete_meta(key) : op("deleteMeta", { key }),
  cache_get_wma: (key) => _injected ? _injected.cache_get_wma(key) : op("getWma", { key }),
  cache_put_wma: (key, body) => _injected ? _injected.cache_put_wma(key, body) : op("putWma", { key, body }),
  cache_list_notifications: () => _injected ? _injected.cache_list_notifications() : op("listNotifications", {}),
  cache_put_notification: (n) => _injected ? _injected.cache_put_notification(n) : op("putNotification", { body: n })
};
function sqlCountEntities2() {
  return _injected ? _injected.count_entities() : op("countEntities", {});
}
var localStoreClient = { ...sqliteStore, setStoreScope: setStoreScope2, sqlCountEntities: sqlCountEntities2 };

// output/web/js.tmp/implementations/storage/bootstrap/compose.js
bindBackend(backend);
bindServerSession(serverSession);
bindPopupGuard(popupGuard);
bindProfileCache(profileCache);
bindTokenAnchorFactory(tokenAnchorFactory);
bindTokenAuthority(tokenAuthority);
bindOAuthProvider(oauthProvider);
bindIdentityProvider(identityProvider);
bindLocalStore(localStoreClient);
bindEventBus({ dispatchAppEvent: (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail })) });
bindUserDirectory({ listUsers: listUsers2, createUser, patchUser });
async function composeStorage() {
  const backendKind = await backend.detectBackend();
  bindStorageApi({});
  bindWorkspaceAuthority(serverWorkspaceAuthority);
  return backendKind;
}
function createIoPort(serverApi, userEmail, forkPrefix) {
  return new ServerIoPort(serverApi, userEmail, forkPrefix);
}

// output/web/js.tmp/implementations/kernel/core_abstractions/ports/visibility.js
var _impl11 = null;
function bindVisibility(impl) {
  _impl11 = impl;
}
function _i11() {
  if (!_impl11) throw new Error("kernel/visibility: no adapter bound (the kernel bootstrap binds it)");
  return _impl11;
}
var isPageVisible = (...a) => _i11().isPageVisible(...a);
var onVisibilityChange = (...a) => _i11().onVisibilityChange(...a);

// output/web/js.tmp/implementations/kernel/implementations/browser-platform.js
var browserClock = {
  nowMs: () => Date.now(),
  nowDate: () => /* @__PURE__ */ new Date(),
  dateFrom: (value) => new Date(value)
};
var browserTimer = {
  startTimer: (fn, ms) => setTimeout(fn, ms),
  stopTimer: (handle) => clearTimeout(handle),
  startInterval: (fn, ms) => setInterval(fn, ms),
  stopInterval: (handle) => clearInterval(handle)
};
var consoleLog = {
  warn: (...args) => console.warn(...args)
  // DEV
};
var localStorageKv = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key)
};
var fetchHttp = {
  fetchJson: async (url) => {
    const { ok, value: resp } = await safeAwait(fetch(url), SAFE_AWAIT_DEFAULT_MS, void 0, `fetchJson:${url}`);
    return ok && resp.ok ? resp.json() : null;
  },
  fetchText: async (url) => {
    const { ok, value: resp } = await safeAwait(fetch(url), SAFE_AWAIT_DEFAULT_MS, void 0, `fetchText:${url}`);
    return ok && resp.ok ? resp.text() : null;
  }
};
var windowEvents = {
  dispatchAppEvent: (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }))
};
var documentVisibility = {
  isPageVisible: () => typeof document === "undefined" || document.visibilityState === "visible",
  onVisibilityChange: (cb) => {
    if (typeof document === "undefined" || !document.addEventListener) return () => {
    };
    document.addEventListener("visibilitychange", cb);
    return () => document.removeEventListener("visibilitychange", cb);
  }
};
var base64Codec = {
  decode: (b64) => atob(b64),
  encode: (str) => btoa(str)
};
var wasmFormatter = {
  dateDisplay: (iso) => typeof window.fmt_date_display === "function" ? window.fmt_date_display(iso) : null,
  datePatternHint: () => typeof window.fmt_date_pattern_hint === "function" ? window.fmt_date_pattern_hint() : null
};
var agGridHost = {
  create: (container, options) => {
    if (typeof window.agGrid?.createGrid === "function") {
      return window.agGrid.createGrid(container, options);
    }
    const grid = new window.agGrid.Grid(container, options);
    return grid.gridOptions?.api || options.api;
  }
};

// output/web/js.tmp/implementations/kernel/bootstrap/compose.js
bindClock(browserClock);
bindTimer(browserTimer);
bindLog(consoleLog);
bindKeyValueStore(localStorageKv);
bindHttp(fetchHttp);
bindAppEvents(windowEvents);
bindVisibility(documentVisibility);
bindBase64(base64Codec);
bindWasmFormat(wasmFormatter);
bindGrid(agGridHost);

// output/web/js.tmp/implementations/ui/bootstrap/route-enforcer.js
var TOAST_EVENT = "vdg:toast";
var TOAST_TYPE_WARN = "warn";
var TOAST_DURATION_MS = 4e3;
function enforceRouteGuard(route, role) {
  const decision = routeGuard(route, role);
  if (decision === "allow") return false;
  if (decision.redirect === route) {
    console.warn("[route-guard] denied on its own redirect target:", route);
    return true;
  }
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, {
    detail: { type: TOAST_TYPE_WARN, message: t(decision.reason), duration: TOAST_DURATION_MS }
  }));
  navigate(decision.redirect);
  return true;
}

// output/web/js.tmp/implementations/ui/bootstrap/views/auth/server-access-gate-screen.js
var SERVER_ACCESS_REASON_TRANSIENT = "transient";
var SERVER_ACCESS_REASON_SESSION = "session";
var TRANSIENT_RETRY_BTN_ID = "server-access-transient-retry";
var SESSION_RECONNECT_BTN_ID = "server-access-session-reconnect";
var DECLINED_HINT_ID = "server-access-declined-hint";
var TITLE_KEY = {
  [SERVER_ACCESS_REASON_TRANSIENT]: "server_access.transient.title",
  [SERVER_ACCESS_REASON_SESSION]: "server_access.session.title"
};
var BODY_KEY = {
  [SERVER_ACCESS_REASON_TRANSIENT]: "server_access.transient.body",
  [SERVER_ACCESS_REASON_SESSION]: "server_access.session.body"
};
var BTN_ID = {
  [SERVER_ACCESS_REASON_TRANSIENT]: TRANSIENT_RETRY_BTN_ID,
  [SERVER_ACCESS_REASON_SESSION]: SESSION_RECONNECT_BTN_ID
};
var BTN_LABEL_KEY = {
  [SERVER_ACCESS_REASON_SESSION]: "server_access.session.button"
};
var RETRY_HINT_KEY = {
  [SERVER_ACCESS_REASON_SESSION]: "server_access.session.retry_failed"
};
function renderServerAccessGateScreen(container, { reason, actionFailed = false, onAction } = {}) {
  if (!container) return;
  const btnId = BTN_ID[reason] || TRANSIENT_RETRY_BTN_ID;
  const labelKey = BTN_LABEL_KEY[reason];
  const btnLabel = labelKey ? t(labelKey) : t("license.gate.retry_button");
  const hintKey = actionFailed ? RETRY_HINT_KEY[reason] : null;
  container.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="text-xl font-semibold text-slate-700">${TITLE_KEY[reason] ? t(TITLE_KEY[reason]) : "L\u1ED7i"}</div>
      <div class="text-sm text-slate-500 max-w-md">${BODY_KEY[reason] ? t(BODY_KEY[reason]) : "\u0110\xE3 c\xF3 l\u1ED7i x\u1EA3y ra."}</div>
      ${hintKey ? `<div id="${DECLINED_HINT_ID}" data-testid="${DECLINED_HINT_ID}" class="text-sm text-amber-600 max-w-md">${t(hintKey)}</div>` : ""}
      <button id="${btnId}" data-testid="${btnId}"
              class="mt-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
        ${btnLabel}
      </button>
    </div>`;
  container.querySelector(`#${btnId}`)?.addEventListener("click", () => {
    if (onAction) onAction();
    else location.reload();
  });
}

// output/web/js.tmp/bootstrap/boot/server-gate.js
var SERVER_ERROR_NAME = "ApiError";
var HTTP_UNAUTHORIZED = 401;
var EVT_RECONNECT_REQUEST = "vdg:auth-reconnect-request";
var EVT_RECONNECTED = "vdg:auth-reconnected";
var EVT_NEEDS_RECONNECT = "vdg:auth-needs-reconnect";
function serverGateReason(err) {
  if (err?.name !== SERVER_ERROR_NAME) return null;
  if (err.status === HTTP_UNAUTHORIZED) return SERVER_ACCESS_REASON_SESSION;
  return SERVER_ACCESS_REASON_TRANSIENT;
}
function requestReconnect(onSettled, win = window) {
  let settled = false;
  const finish = (ok) => {
    if (settled) return;
    settled = true;
    win.removeEventListener(EVT_RECONNECTED, onOk);
    win.removeEventListener(EVT_NEEDS_RECONNECT, onFail);
    onSettled(ok);
  };
  const onOk = () => finish(true);
  const onFail = () => finish(false);
  win.addEventListener(EVT_RECONNECTED, onOk);
  win.addEventListener(EVT_NEEDS_RECONNECT, onFail);
  win.dispatchEvent(new CustomEvent(EVT_RECONNECT_REQUEST));
}
function renderServerGate(mount, err, { onReconnected, onSignIn, serverBackend = true, win = window } = {}) {
  const reason = serverGateReason(err);
  if (!reason) return false;
  if (serverBackend && reason === SERVER_ACCESS_REASON_SESSION) {
    onSignIn?.();
    return true;
  }
  if (reason === SERVER_ACCESS_REASON_SESSION) {
    const render = (actionFailed) => renderServerAccessGateScreen(mount, {
      reason,
      actionFailed,
      onAction: () => requestReconnect((ok) => ok ? onReconnected?.() : render(true), win)
    });
    render(false);
    return true;
  }
  renderServerAccessGateScreen(mount, { reason });
  return true;
}

// output/web/js.tmp/implementations/ui/bootstrap/util/view-fallback.js
var MAX_VIEW_MOUNT_RETRIES = 2;
var _attempts = /* @__PURE__ */ new Map();
function renderViewFallback(root, route, reason = "timeout") {
  const used = _attempts.get(route) ?? 0;
  const exhausted = used >= MAX_VIEW_MOUNT_RETRIES;
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  renderViewMountRecovery(root, {
    route,
    offline,
    exhausted,
    reason,
    onRetry: () => {
      _attempts.set(route, used + 1);
      window.dispatchEvent(new CustomEvent("vdg:navigate", { detail: { route } }));
    },
    onReload: healOrReloadViaServiceWorker
    // fires ONLY on user click — never automatic
  });
}
async function healOrReloadViaServiceWorker() {
  const reg = typeof navigator !== "undefined" ? await navigator.serviceWorker?.getRegistration?.().catch(() => null) : null;
  if (reg?.waiting) {
    window.dispatchEvent(new CustomEvent("vdg:sw-update-accept"));
  } else {
    location.reload();
  }
}
function resetViewMountRetries(route) {
  _attempts.delete(route);
}

// output/web/js.tmp/implementations/ui/bootstrap/util/view-loader.js
var VIEW_LOAD_TIMEOUT_MS = 25e3;
var VIEW_LOAD_RETRY_COUNT = 1;
var VIEW_LOAD_RETRY_DELAY_MS = 1200;
async function loadView(importFn, root, route, _fb = renderViewFallback, _ms = VIEW_LOAD_TIMEOUT_MS, _delayMs = VIEW_LOAD_RETRY_DELAY_MS) {
  let result = await safeAwait(importFn(), _ms, null, `view-mount:${route}`);
  for (let attempt = 1; !result.ok && attempt <= VIEW_LOAD_RETRY_COUNT; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, _delayMs));
    result = await safeAwait(importFn(), _ms, null, `view-mount:${route}:retry${attempt}`);
  }
  if (!result.ok) {
    const reason = result.error?.name === "SafeAwaitTimeoutError" ? "timeout" : "network";
    if (reason === "network") {
      console.error(`[view-loader] Import failed for ${route} after retry:`, result.error);
    }
    _fb(root, route, reason);
    return null;
  }
  return result.value;
}

// output/web/js.tmp/implementations/ui/bootstrap/util/mount-view.js
var RENDER_MOUNT_TIMEOUT_MS = 8e3;
var RENDER_MOUNT_HARD_TIMEOUT_MS = 3e4;
function paintSoftLoadingAffordance(root) {
  if (!root || root.innerHTML !== "") return;
  root.innerHTML = `<div class="p-6 text-slate-500 text-sm">${t("loading")}</div>`;
}
async function mountView(renderFn, root, route, _fb = renderViewFallback, _softMs = RENDER_MOUNT_TIMEOUT_MS, _hardMs = RENDER_MOUNT_HARD_TIMEOUT_MS) {
  const renderPromise = Promise.resolve().then(renderFn);
  const soft = await safeAwait(renderPromise, _softMs, null, `view-render:${route}`);
  if (soft.ok) {
    resetViewMountRetries(route);
    return true;
  }
  if (!(soft.error instanceof SafeAwaitTimeoutError)) {
    markViewSuperseded(root);
    _fb(root, route);
    return false;
  }
  paintSoftLoadingAffordance(root);
  const hard = await safeAwait(renderPromise, Math.max(0, _hardMs - _softMs), null, `view-render-hard:${route}`);
  if (!hard.ok) {
    markViewSuperseded(root);
    _fb(root, route);
    return false;
  }
  resetViewMountRetries(route);
  return true;
}

// output/web/js.tmp/bootstrap/app-router-ext.js
var CUSTOMER360_RE = /^\/manager\/customers\/([^/]+)$/;
var MASTERS_RE = /^\/manager\/masters\/([^/]+)$/;
var SALES_EDIT_RE = /^\/sales\/edit\/([^/]+)$/;
var SHIPMENT_NEW_RE = /^\/shipments\/new$/;
async function tryParamRoute(route) {
  const basePath = route.split("?")[0];
  const c360Match = CUSTOMER360_RE.exec(basePath);
  if (c360Match) {
    const root = freshViewRoot();
    const mod = await loadView(() => import("./customer360-PZU332PG.js"), root, basePath);
    if (!mod) return true;
    await mountView(() => mod.render(root, { id: c360Match[1], route: basePath }), root, basePath);
    return true;
  }
  const mastersMatch = MASTERS_RE.exec(basePath);
  if (mastersMatch) {
    const root = freshViewRoot();
    const mod = await loadView(() => import("./masters-EV3EDL4A.js"), root, basePath);
    if (!mod) return true;
    await mountView(() => mod.render(root, { kind: mastersMatch[1], route: basePath }), root, basePath);
    return true;
  }
  const salesEditMatch = SALES_EDIT_RE.exec(basePath);
  if (salesEditMatch) {
    const root = freshViewRoot();
    const mod = await loadView(() => import("./sales-new-QXQS5MRH.js"), root, basePath);
    if (!mod) return true;
    await mountView(() => mod.render(root, { editRef: salesEditMatch[1], mode: "edit" }), root, basePath);
    return true;
  }
  if (SHIPMENT_NEW_RE.test(basePath)) {
    const root = freshViewRoot();
    const mod = await loadView(() => import("./sales-new-QXQS5MRH.js"), root, basePath);
    if (!mod) return true;
    const qs = new URLSearchParams(route.split("?")[1] || "");
    const quoteId = qs.get("quote_id");
    const quotePrefill = quoteId ? {
      quote_id: quoteId,
      customer: qs.get("customer") || "",
      pol: qs.get("pol") || "",
      pod: qs.get("pod") || "",
      container: qs.get("container") || ""
    } : void 0;
    await mountView(() => mod.render(root, { salesId: qs.get("sales") || "me", mode: "create", quotePrefill }), root, basePath);
    return true;
  }
  return false;
}

// output/web/js.tmp/implementations/ui/bootstrap/keyboard-shortcuts.js
var CHORD_TIMEOUT_MS = 800;
var CHORD_MAP = {
  d: "/manager/dashboard",
  s: "/manager/pipeline",
  c: "/masters/customers",
  r: "/manager/reports/pnl"
};
var _chordPending = false;
var _chordTimer = null;
function _inInput() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
}
function _showCheatsheet() {
  const existing = document.getElementById("vdg-cheatsheet-dialog");
  if (existing) {
    existing.open ? existing.close() : existing.showModal();
    return;
  }
  const d = document.createElement("dialog");
  d.id = "vdg-cheatsheet-dialog";
  d.className = "rounded-xl shadow-2xl p-0 w-[640px] max-w-[95vw] bg-white backdrop:bg-black/40";
  d.innerHTML = `
    <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
      <span class="font-semibold text-slate-900">Keyboard Shortcuts</span>
      <button onclick="this.closest('dialog').close()"
              class="text-slate-400 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Close cheatsheet">\u2715</button>
    </div>
    <div class="grid grid-cols-2 gap-x-8 gap-y-2 px-6 py-4 text-xs text-slate-700">
      <div class="font-semibold col-span-2 text-slate-500 uppercase text-[10px] mt-2">Navigation</div>
      <div><kbd class="bg-slate-100 px-1.5 py-0.5 rounded">Ctrl K</kbd> Command palette</div>
      <div><kbd class="bg-slate-100 px-1.5 py-0.5 rounded">g d</kbd> Dashboard</div>
      <div><kbd class="bg-slate-100 px-1.5 py-0.5 rounded">g s</kbd> Pipeline</div>
      <div><kbd class="bg-slate-100 px-1.5 py-0.5 rounded">g c</kbd> Customers</div>
      <div><kbd class="bg-slate-100 px-1.5 py-0.5 rounded">g r</kbd> P&L Report</div>
      <div><kbd class="bg-slate-100 px-1.5 py-0.5 rounded">/</kbd> Focus search</div>
      <div class="font-semibold col-span-2 text-slate-500 uppercase text-[10px] mt-2">General</div>
      <div><kbd class="bg-slate-100 px-1.5 py-0.5 rounded">?</kbd> This cheatsheet</div>
      <div><kbd class="bg-slate-100 px-1.5 py-0.5 rounded">Esc</kbd> Close panel</div>
    </div>`;
  document.body.appendChild(d);
  d.showModal();
}
function initKeyboardShortcuts() {
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("vdg:cmd-palette"));
      return;
    }
    if (_inInput()) return;
    if (_chordPending) {
      clearTimeout(_chordTimer);
      _chordPending = false;
      const route = CHORD_MAP[e.key];
      if (route) {
        e.preventDefault();
        navigate(route);
      }
      return;
    }
    if (e.key === "g" && !e.ctrlKey && !e.metaKey) {
      _chordPending = true;
      _chordTimer = setTimeout(() => {
        _chordPending = false;
      }, CHORD_TIMEOUT_MS);
      return;
    }
    if (e.key === "?") {
      e.preventDefault();
      _showCheatsheet();
      return;
    }
    if (e.key === "/") {
      e.preventDefault();
      document.querySelector("vdg-topbar input[type=search], vdg-topbar input[type=text]")?.focus();
    }
  });
}

// output/web/js.tmp/implementations/kernel/core_abstractions/version.js
var APP_VERSION = "v0.4.38 (43e446a3)";

// output/web/js.tmp/implementations/ui/bootstrap/app-events.js
var NEW_FEATURE_BANNER_DAYS = 7;
var BREAKPOINT_TABLET_PX = 768;
var PREFS_META_KEY = "preferences";
var STORE_LOCKED_COPY = {
  "genuine-conflict": ["store_locked.title", "store_locked.body"],
  unresponsive: ["store_unresponsive.title", "store_unresponsive.body"]
};
function initStoreLockedScreen() {
  window.addEventListener("vdg:store-locked", (ev) => {
    if (document.getElementById("vdg-store-locked")) return;
    const [titleKey, bodyKey] = STORE_LOCKED_COPY[ev.detail?.kind] || STORE_LOCKED_COPY["genuine-conflict"];
    const el = document.createElement("div");
    el.id = "vdg-store-locked";
    el.className = "fixed inset-0 z-[100] bg-white/95 flex items-center justify-center p-6";
    el.innerHTML = `
      <div class="max-w-md w-full bg-white rounded-xl shadow-2xl border border-slate-200 p-6 text-center">
        <div class="text-3xl mb-3">\u{1F512}</div>
        <div class="font-semibold text-slate-900 text-sm mb-2">${t(titleKey)}</div>
        <div class="text-xs text-slate-600 leading-relaxed mb-4">${t(bodyKey)}</div>
        <div class="flex justify-center gap-3">
          <button id="store-locked-retry"
            class="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">${t("store_locked.retry")}</button>
        </div>
      </div>`;
    el.querySelector("#store-locked-retry").onclick = () => location.reload();
    document.body.appendChild(el);
  }, { once: true });
}
var CONFLICT_VAL_MAX_CHARS = 60;
function _fieldValText(v) {
  const s = typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? "");
  return s.slice(0, CONFLICT_VAL_MAX_CHARS);
}
function _fieldDiffRows(fields, extra = () => "") {
  return fields.map((c) => `
    <div class="mb-2">
      <div class="text-slate-500 mb-1">${t("conflict_field", { field: c.field })}${extra(c)}</div>
      <div class="flex gap-4">
        <div class="flex-1 bg-blue-50 rounded p-2">
          <div class="font-medium text-blue-700 mb-1">${t("your_value")}</div>
          <div class="font-mono break-all">${_fieldValText(c.local_val)}</div>
        </div>
        <div class="flex-1 bg-amber-50 rounded p-2">
          <div class="font-medium text-amber-700 mb-1">${t("their_value")}</div>
          <div class="font-mono break-all">${_fieldValText(c.remote_val)}</div>
        </div>
      </div>
    </div>`).join("");
}
function initConflictModal() {
  window.addEventListener("vdg:conflict-detected", (e) => {
    const { kind, id, local, remote, merged, conflicts } = e.detail || {};
    const dlg = document.createElement("dialog");
    dlg.className = "rounded-xl shadow-2xl p-0 w-[480px] max-w-[95vw] bg-white backdrop:bg-black/40";
    const rows = _fieldDiffRows(conflicts?.length ? conflicts : [{ field: "(unknown)", local_val: "", remote_val: "" }]);
    dlg.innerHTML = `
      <div class="px-6 py-4 border-b border-slate-200">
        <div class="font-semibold text-slate-900 text-sm">${t("conflict_title")} \xB7 ${kind}:${id}</div>
        <div class="text-xs text-slate-500 mt-1">${t("conflict.money_note")}</div>
      </div>
      <div class="px-6 py-4 text-xs max-h-[50vh] overflow-y-auto">${rows}</div>
      <div class="px-6 py-3 border-t border-slate-100 flex justify-end gap-2">
        <button id="keep-mine" class="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">${t("keep_mine")}</button>
        <button id="use-theirs" class="px-4 py-2 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700">${t("use_theirs")}</button>
      </div>`;
    document.body.appendChild(dlg);
    dlg.showModal();
    const repo3 = window.__vdg_repo;
    const mergeBase = merged && typeof merged === "object" ? merged : null;
    dlg.querySelector("#keep-mine").addEventListener("click", async () => {
      const mine = { ...mergeBase ?? local, _rev: remote?._rev };
      for (const c of conflicts || []) mine[c.field] = c.local_val;
      await repo3?.put(kind, id, mine);
      dlg.close();
      dlg.remove();
    });
    dlg.querySelector("#use-theirs").addEventListener("click", async () => {
      await repo3?.put(kind, id, { ...mergeBase ?? remote, _rev: remote?._rev });
      dlg.close();
      dlg.remove();
    });
  });
}
var MERGE_TOAST_DISMISS_MS = 12e3;
function initMergeToast() {
  window.addEventListener("vdg:merge-autoresolved", (e) => {
    const { kind, id, fields } = e.detail || {};
    if (!fields?.length) return;
    const card = document.createElement("div");
    card.className = "fixed bottom-4 right-4 z-[9999] bg-amber-500 text-white rounded-lg shadow-lg px-4 py-3 text-xs max-w-sm";
    card.innerHTML = `
      <div class="font-semibold mb-1">${t("merge.auto_title")}</div>
      <div class="mb-2">${t("merge.auto_body", { id, n: fields.length })}</div>
      <div class="flex justify-end gap-2">
        <button id="merge-view" class="px-3 py-1 bg-white/20 rounded hover:bg-white/30">${t("merge.view")}</button>
        <button id="merge-dismiss" class="px-3 py-1 bg-white/20 rounded hover:bg-white/30">${t("merge.close")}</button>
      </div>`;
    document.body.appendChild(card);
    const timer = setTimeout(() => card.remove(), MERGE_TOAST_DISMISS_MS);
    card.querySelector("#merge-dismiss").onclick = () => {
      clearTimeout(timer);
      card.remove();
    };
    card.querySelector("#merge-view").onclick = () => {
      clearTimeout(timer);
      card.remove();
      const dlg = document.createElement("dialog");
      dlg.className = "rounded-xl shadow-2xl p-0 w-[480px] max-w-[95vw] bg-white backdrop:bg-black/40";
      const winnerLabel = (c) => ` \xB7 <span class="text-slate-400">${t(c.winner === "local" ? "merge.winner.local" : "merge.winner.remote")}</span>`;
      dlg.innerHTML = `
        <div class="px-6 py-4 border-b border-slate-200">
          <div class="font-semibold text-slate-900 text-sm">${t("merge.auto_title")} \xB7 ${kind}:${id}</div>
        </div>
        <div class="px-6 py-4 text-xs max-h-[50vh] overflow-y-auto">${_fieldDiffRows(fields, winnerLabel)}</div>
        <div class="px-6 py-3 border-t border-slate-100 flex justify-end gap-2">
          <button id="merge-undo" class="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">${t("merge.use_mine")}</button>
          <button id="merge-ok" class="px-4 py-2 text-xs bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300">${t("merge.close")}</button>
        </div>`;
      document.body.appendChild(dlg);
      dlg.showModal();
      dlg.querySelector("#merge-ok").onclick = () => {
        dlg.close();
        dlg.remove();
      };
      dlg.querySelector("#merge-undo").onclick = async () => {
        const repo3 = window.__vdg_repo;
        const current = await repo3?.get(kind, id);
        if (current) {
          for (const c of fields) current[c.field] = c.local_val;
          await repo3.put(kind, id, current);
        }
        dlg.close();
        dlg.remove();
      };
    };
  });
}
async function checkVersionBanner(store) {
  if (!store) return;
  try {
    const prefs = await store.cache_get_meta(PREFS_META_KEY);
    if (!prefs) return;
    if (prefs.last_seen_version === APP_VERSION) return;
    if (prefs.banner_dismissed_at) {
      const days = (Date.now() - new Date(prefs.banner_dismissed_at).getTime()) / 864e5;
      if (days < NEW_FEATURE_BANNER_DAYS) return;
    }
    const banner = document.createElement("div");
    const mount = document.getElementById("view-root");
    if (mount) {
      banner.className = "w-full bg-indigo-600 text-white text-xs flex items-center justify-between px-4 py-2";
    } else {
      banner.className = "fixed top-16 left-0 right-0 z-[8999] bg-indigo-600 text-white text-xs flex items-center justify-between px-4 py-2";
    }
    banner.innerHTML = `
      <span>${t("whats_new")} ${APP_VERSION}
        <button id="banner-see" class="ml-2 underline hover:no-underline">${t("see_changes")}</button>
      </span>
      <button id="banner-dismiss" class="ml-4 text-indigo-200 hover:text-white">\u2715</button>`;
    if (mount) mount.before(banner);
    else document.body.appendChild(banner);
    banner.querySelector("#banner-see").addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("vdg:open-help", { detail: { section: "whats-new" } }));
    });
    banner.querySelector("#banner-dismiss").addEventListener("click", async () => {
      banner.remove();
      await store.cache_put_meta(PREFS_META_KEY, {
        ...prefs,
        last_seen_version: APP_VERSION,
        banner_dismissed_at: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
  } catch {
  }
}
function initWmaListener() {
  window.addEventListener("vdg:shipment-committed", async (e) => {
    const { rep_id, lines } = e.detail || {};
    if (!rep_id || !lines?.length) return;
    const store = window.__vdg_store;
    if (!store) return;
    for (const ln of lines) {
      if (!ln.observed_kind) continue;
      try {
        const state = await loadKindWmaState(store, rep_id, ln.row_idx);
        onEvent(state, ln.observed_kind, ln.predicted_kind || null);
        await saveKindWmaState(store, rep_id, ln.row_idx, state);
      } catch (err) {
        console.warn("[wma] on_event failed:", err.message);
      }
    }
  });
}
function initBreakpointListener() {
  const mql = window.matchMedia(`(max-width: ${BREAKPOINT_TABLET_PX - 1}px)`);
  const onChange = (e) => {
    document.body.classList.toggle("is-mobile", e.matches);
    window.dispatchEvent(new CustomEvent("vdg:breakpoint-changed", { detail: { mobile: e.matches } }));
  };
  mql.addEventListener("change", onChange);
  onChange(mql);
}

// output/web/js.tmp/implementations/storage/implementations/auth/token-refresh.js
var _onReconnected = null;
async function _onReconnectRequest() {
  try {
    const resp = await reconnectInteractive();
    const user = await hydrateSessionFromToken(resp);
    if (user && _onReconnected) await _onReconnected(user);
    window.dispatchEvent(new CustomEvent("vdg:auth-reconnected"));
    window.dispatchEvent(new CustomEvent("vdg:sync-now"));
  } catch {
    window.dispatchEvent(new CustomEvent("vdg:auth-needs-reconnect"));
  }
}
var _wired = false;
function initAccessTokenRefresh({ onReconnected = null } = {}) {
  if (_wired) return;
  _wired = true;
  _onReconnected = onReconnected;
  window.addEventListener("vdg:auth-reconnect-request", _onReconnectRequest);
}

// output/web/js.tmp/bootstrap/app-views.js
var VIEWS = {
  "/dashboard": () => import("./dashboard-ANZUNYTQ.js"),
  "/shipments": () => import("./shipments-RWWDMUQE.js"),
  "/upload": () => import("./upload-46S7RRXO.js"),
  "/documents": () => import("./documents-2SUK5ZXY.js"),
  "/finance": () => import("./finance-dashboard-XARJ36ZW.js"),
  "/finance/credit": () => import("./credit-dashboard-Z43BZ656.js"),
  "/finance/demdet": () => import("./demdet-SGLKGZCR.js"),
  // '/shipments/new' — create a shipment, handled by tryParamRoute (app-router-ext.js) because it
  // reads ?sales= and ?quote_id= prefills; the static table here has no query hook.
  "/sales/me": () => import("./sales-me-SBW4Q4KX.js"),
  "/sales/analytics": () => import("./sales-analytics-ESCAX5NR.js"),
  "/sales/quote/new": () => import("./sales-quote-new-ODI237IK.js"),
  "/sales/quote": () => import("./sales-quote-list-4YS2KDCV.js"),
  "/masters/customers": () => import("./masters-customers-E4QGFZXE.js"),
  "/masters/carriers": () => import("./masters-carriers-NGSX2ADW.js"),
  "/masters/services": () => import("./masters-services-EU2Q5CWP.js"),
  "/help": () => import("./help-IKAUORGB.js"),
  "/pending-access": () => import("./pending-access-7DMAML24.js"),
  "/background-jobs": () => import("./background-jobs-NY2OVBLZ.js"),
  // Manager Workspace — E-14
  "/manager/dashboard": () => import("./dashboard-WO75SJKX.js"),
  "/manager/pipeline": () => import("./pipeline-XAMJ6U6I.js"),
  "/manager/approvals": () => import("./approvals-BZ3ROLME.js"),
  "/manager/reports/pnl": () => import("./pnl-report-AWZBOYII.js"),
  "/manager/finance/cash-flow": () => import("./cash-flow-VPVF3ESY.js"),
  "/manager/finance/close-period": () => import("./close-period-ODQV56G6.js"),
  "/manager/audit": () => import("./audit-YZBBMNU5.js"),
  "/manager/notifications": () => import("./notifications-CU3GZP63.js"),
  // E-14 batch-02
  "/manager/sales": () => import("./sales-WMOGGFZG.js"),
  "/manager/finance/commissions": () => import("./commissions-AIMRQBT4.js"),
  "/manager/commission-rules": () => import("./commission-rules-562YSF6U.js"),
  "/manager/exceptions": () => import("./exceptions-57GTL7YN.js"),
  // E-15
  "/manager/errors": () => import("./errors-DZ5DKXRP.js"),
  "/manager/backup": () => import("./backup-PIHICBU4.js"),
  "/manager/users": () => import("./users-4GPN5FGL.js"),
  // E-15 F-15-36
  "/manager/fx-rates": () => import("./fx-rates-NJZOGB3Y.js"),
  "/manager/settings": () => import("./settings-6PVD7RFG.js"),
  // E-16 F-16-02
  "/manager/awb": () => import("./awb-7X2YDYEK.js"),
  // E-16 F-16-03
  "/masters/airports": () => import("./airports-27G7TOG7.js"),
  "/masters/flights": () => import("./flights-THBLV3Y2.js"),
  "/masters/airline-carriers": () => import("./airline-carriers-MRA3NDIZ.js"),
  // E-26 F-26-04
  "/masters/ocean-carriers": () => import("./ocean-carriers-4HZGIT5Q.js"),
  // E-20 F-28-15
  "/masters/ocean-tariff": () => import("./ocean-tariff-RYTZJBSW.js"),
  // E-16 F-16-04
  "/masters/uld-types": () => import("./uld-types-RUNAQRZ4.js"),
  "/manager/manifest": () => import("./manifest-DPQE7HAN.js"),
  // E-16 F-16-05
  "/masters/air-rates": () => import("./air-rates-A6LOCJ5Z.js"),
  // E-25 / E-26 — sea-freight local charge masters
  "/masters/units-of-measure": () => import("./units-of-measure-F24UAC2I.js"),
  "/masters/local-charges": () => import("./local-charges-VTLC2OXG.js"),
  // E-20 F-18-11 — shipment lifecycle-state alias registry, manager-only
  "/masters/shipment-states": () => import("./shipment-states-TZO3QAGT.js"),
  "/quotes/air-calc": () => import("./air-calc-MSSJVYNW.js"),
  // E-16 F-16-09
  "/manager/air-invoice": () => import("./air-invoice-YAERGP5T.js"),
  // E-23 F-23-04
  "/accounting/ledger": () => import("./ledger-viewer-7PSYSSJF.js"),
  // E-23 F-23-05
  "/accounting/reports": () => import("./reports-WDEUTGW7.js"),
  "/accounting/settings": () => import("./settings-URHU44XT.js"),
  // E-24 F-24-04
  "/admin/users": () => import("./users-view-6K7VVG3D.js"),
  // E-24 F-24-06
  "/admin/users/audit-log": () => import("./user-audit-log-view-2BVILWHD.js")
};

// output/web/js.tmp/implementations/ui/core_abstractions/ports/cache/route-prefetch.js
var _impl12 = null;
function bindRoutePrefetch(impl) {
  _impl12 = impl;
}

// output/web/js.tmp/bootstrap/compose-ui/cache.js
function composeCache(wasm3) {
  bindBulkOrchestrator({
    bulkPut: async (_repo, kind, entities) => {
      if (!entities?.length) return;
      const res = await wasm3.cache_bulk_put({ kind, entities });
      if (!res.ok) throw new Error(res.error || `bulkPut(${kind}): stopped after ${res.written}`);
    }
  });
  bindMasterRegistry({
    // A role set, not one role — a Manager+SalesRep is judged on the whole hand, not one hat.
    canWriteMaster: (kind, roles) => wasm3.cache_can_write_master({ kind, roles: roles || [] }).allowed
  });
  bindMasterDeduper({
    findMatch: (name, existing) => wasm3.cache_find_match({ name, existing: existing || [] })
  });
  bindRoutePrefetch({
    prefetchDashboard: async () => {
      await wasm3.cache_route_prefetch({});
    }
  });
}

// output/web/js.tmp/bootstrap/compose-ui/data.js
var REASON_PERIOD_LOCKED = "period-locked";
var REASON_LICENSE_READONLY = "license-readonly";
function gateError(gate) {
  if (!gate || gate.allowed) return null;
  if (gate.reason === REASON_LICENSE_READONLY) {
    const days = gate.grace_days_left ?? 0;
    return new LicenseReadOnlyError(days, t("license.readonly_error", { d: days }));
  }
  if (gate.reason === REASON_PERIOD_LOCKED) {
    return new PeriodLockedError(gate.period, t("period.locked_error", { k: gate.period }));
  }
  return null;
}
function throwIfRefused(reply) {
  if (reply.ok) return reply;
  const refusal = gateError(reply.gate);
  if (refusal) throw refusal;
  throw new Error(reply.error || "the write was refused");
}
function stamp(record, seen) {
  if (!record) return record;
  Object.defineProperty(record, REVENUE_SEEN, { value: seen, enumerable: false, configurable: true });
  return record;
}
function stampRows(reply) {
  if (!reply.ok) throw new Error(reply.error || "the read failed");
  return reply.rows.map((row, i) => stamp(row, !!reply.revenue_seen[i]));
}
function applyPredicate(rows, predicate) {
  return typeof predicate === "function" ? rows.filter(predicate) : rows;
}
function composeData(wasm3) {
  const joinLoaded = async (_repo, envelopes) => stampRows(await wasm3.data_join_loaded({ envelopes: envelopes || [] }));
  bindShipmentRepo({
    putShipment: async (_repo, shipment) => {
      const reply = throwIfRefused(await wasm3.data_put_shipment({ shipment }));
      return { envelope: reply.envelope, revenue: reply.revenue };
    },
    putEnvelope: async (_repo, ref, shipmentLike) => {
      const reply = throwIfRefused(await wasm3.data_put_envelope({ shipment_ref: ref, shipment: shipmentLike }));
      return reply.envelope;
    },
    getEnvelope: async (_repo, ref) => {
      const reply = await wasm3.data_get_envelope({ shipment_ref: ref });
      if (!reply.ok) throw new Error(reply.error || "the read failed");
      return reply.record;
    },
    listEnvelopes: async (_repo, predicate = null) => {
      const reply = await wasm3.data_list_envelopes({});
      if (!reply.ok) throw new Error(reply.error || "the read failed");
      return applyPredicate(reply.rows, predicate);
    },
    deleteShipment: async (_repo, ref) => {
      throwIfRefused(await wasm3.data_delete_shipment({ shipment_ref: ref }));
    },
    getShipment: async (_repo, ref) => {
      const reply = await wasm3.data_get_shipment({ shipment_ref: ref });
      if (!reply.ok) throw new Error(reply.error || "the read failed");
      return reply.record ? stamp(reply.record, reply.revenue_seen) : null;
    },
    // Filter the ENVELOPES, then join: a screen that wants one rep's jobs should not pay a
    // cross-fork revenue read for everybody else's.
    listShipments: async (repo3, predicate = null) => {
      const reply = await wasm3.data_list_envelopes({});
      if (!reply.ok) throw new Error(reply.error || "the read failed");
      return joinLoaded(repo3, applyPredicate(reply.rows, predicate));
    },
    joinLoaded,
    anyRevenueVisible: (rows) => (rows || []).some((row) => row?.[REVENUE_SEEN])
  });
  bindWriteGate({
    assertWritable: async (_repo, etd, kind = KIND_SHIPMENT) => {
      const refusal = gateError(await wasm3.data_write_gate({ etd: etd ?? null, kind }));
      if (refusal) throw refusal;
    }
  });
  bindBillingPublish({
    publishBilling: async (_repo, shipment, { publishedBy = null, publishedAt = null } = {}) => {
      const reply = await wasm3.data_publish_billing({
        shipment,
        published_by: publishedBy,
        published_at: publishedAt
      });
      if (!reply.ok) throw new Error(reply.error || "publish failed");
      return reply.snapshot;
    },
    readPublishedFor: async (_repo, shipment) => (await wasm3.data_published_for({ shipment })).rows,
    currentRevision: async (_repo, shipment) => (await wasm3.data_current_revision({ shipment })).record
  });
  bindRepoQuery({
    listWhere: async (_repo, kind, predicate = null) => {
      const reply = await wasm3.data_list_where({ kind, column: null, equals: null, ignore_case: false });
      if (!reply.ok) throw new Error(reply.error || "the read failed");
      return applyPredicate(reply.rows, predicate);
    }
  });
  bindPnlLineId({
    pnlLineId: (ref, index) => wasm3.data_pnl_line_id({ shipment_ref: ref, index }).id,
    deletePnlLinesFor: async (_repo, ref) => {
      const reply = await wasm3.data_delete_pnl_lines({ shipment_ref: ref });
      if (!reply.ok) throw new Error(reply.error || "the cleanup failed");
      return reply.deleted;
    }
  });
}

// output/web/js.tmp/bootstrap/compose-ui/sync.js
function _absorb(state, next) {
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, next);
  return state;
}
function _rowIdx(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
function composeSync(wasm3) {
  bindAuditLog({
    verifyAuditChain: async (rows) => (await wasm3.sync_audit_verify_chain({ rows: rows || [] })).problems
  });
  bindDueSoon({
    computeDueSoonRows: async (salesId) => (await wasm3.sync_due_soon_rows({ sales_id: salesId ?? null })).rows
  });
  bindJobTracker(jobTracker);
  bindWmaEngine({
    predict: (state, descriptionText, classifyKindFn) => {
      const descKind = descriptionText && descriptionText.trim() && classifyKindFn ? classifyKindFn(descriptionText) : null;
      return wasm3.sync_wma_predict({ state, desc_kind: descKind }).kind;
    },
    onEvent: (state, observed, predicted) => _absorb(
      state,
      wasm3.sync_wma_on_event({ state, observed, predicted: predicted ?? null, now_ms: Date.now() }).state
    ),
    dismissPrediction: (state, predictedKind) => _absorb(
      state,
      wasm3.sync_wma_dismiss({ state, predicted_kind: predictedKind }).state
    )
  });
  bindWmaStore({
    loadKindWmaState: async (_store2, repId, rowIdx) => (await wasm3.sync_wma_load({
      rep_id: String(repId ?? ""),
      row_idx: _rowIdx(rowIdx),
      now_ms: Date.now()
    })).state,
    saveKindWmaState: async (_store2, repId, rowIdx, state) => {
      const reply = await wasm3.sync_wma_save({ rep_id: String(repId ?? ""), row_idx: _rowIdx(rowIdx), state });
      if (!reply.ok) console.warn("[wma] save failed:", reply.error);
    }
  });
}

// output/web/js.tmp/bootstrap/compose-ui/manager.js
var MANAGER_ROLE_LABEL_KEY = "admin.users.role.manager";
var MONTHS_PER_YEAR = 12;
var MONTH_SAMPLE_YEAR = 2e3;
var PREFIX_SEED_RANGE = 1e4;
var MARGIN_PCT_DIGITS = 1;
var tz = () => -(/* @__PURE__ */ new Date()).getTimezoneOffset();
function managerLabel() {
  const label = t(MANAGER_ROLE_LABEL_KEY);
  return currentUserEmail() || (label === MANAGER_ROLE_LABEL_KEY ? ROLE_MANAGER : label);
}
function monthLabels() {
  return Array.from({ length: MONTHS_PER_YEAR }, (_, m) => new Date(MONTH_SAMPLE_YEAR, m, 1).toLocaleString("default", { month: "short" }));
}
var withDims = (rows) => (rows || []).map((r) => ({ ...r, dims: Object.fromEntries(r.dims || []) }));
var toPairs = (dims) => Object.entries(dims || {});
var asArray = (rules) => rules instanceof Map ? [...rules.values()] : Object.values(rules || {});
var msOf = (value) => value instanceof Date ? value.getTime() : Number(value ?? Date.now());
function trendWeekLabel(week) {
  return `W${week.ordinal} (${fmtDate(new Date(week.start_ms))})`;
}
function composeManager(wasm3) {
  bindPnlComposer({
    compose: ({ shipments = [], pnlLines = [], period = "", dims = [] } = {}) => {
      const reply = wasm3.manager_pnl_pivot({
        shipments,
        pnl_lines: pnlLines,
        period,
        dims,
        now_ms: Date.now(),
        tz_offset_min: tz(),
        manager_label: managerLabel(),
        month_labels: monthLabels()
      });
      return { rows: withDims(reply.rows), grandTotals: reply.grandTotals, groupedShipments: reply.groupedShipments };
    },
    composeBuySellBreakdown: (pnlLines, refs) => wasm3.manager_pnl_buy_sell({ pnl_lines: pnlLines || [], refs: refs || [] }).rows,
    filterByDims: (shipments, rowDims) => wasm3.manager_pnl_drill({
      shipments: shipments || [],
      row_dims: toPairs(rowDims),
      tz_offset_min: tz(),
      manager_label: managerLabel(),
      month_labels: monthLabels()
    }).shipments
  });
  bindAirPnlComposer({
    composeAir: ({ shipments = [], pnlLines = [], dims = [] } = {}) => {
      const reply = wasm3.manager_air_pnl({
        shipments,
        pnl_lines: pnlLines,
        dims,
        tz_offset_min: tz(),
        manager_label: managerLabel(),
        month_labels: monthLabels()
      });
      return { rows: withDims(reply.rows), grandTotals: reply.grandTotals };
    }
  });
  bindAirInvoiceComposer({
    composeAirInvoice: (awbs, airRates, carriers) => wasm3.manager_air_invoice({
      awbs: awbs || [],
      air_rates: airRates || [],
      carriers: carriers || []
    })
  });
  bindArComposer({
    // F1: fxRatesBuy is currency -> buying closing rate for `today` (131 is an asset).
    // cash-flow.js fetches it (fetchClosingRatesBuy) before calling this; an absent/empty map
    // leaves every row's amount at its last-booked amount_vnd, same as before this landed.
    composeAR: ({ billingEntities = [], today, fxRatesBuy = {} } = {}) => wasm3.manager_ar_aging({ billing: billingEntities, today_ms: msOf(today), tz_offset_min: tz(), fx_rates_buy: fxRatesBuy }),
    composeAP: ({ pnlLines = [] } = {}) => wasm3.manager_ap_payables({ pnl_lines: pnlLines, tz_offset_min: tz() }),
    composeTimeline: ({ billingEntities = [], shipments = [], today } = {}) => {
      const reply = wasm3.manager_ar_timeline({
        billing: billingEntities,
        shipments,
        today_ms: msOf(today),
        tz_offset_min: tz()
      });
      return { weeks: reply.weeks.map(weekLabel), actuals: reply.actuals, forecast: reply.forecast };
    }
  });
  bindCommissionCalculator({
    computeCommissions: (shipments, pnlLines, rules, advanceLog, periodKey) => wasm3.manager_commissions({
      shipments: shipments || [],
      pnl_lines: pnlLines || [],
      rules: asArray(rules),
      advances: advanceLog || [],
      period_key: periodKey || "",
      tz_offset_min: tz(),
      manager_label: managerLabel()
    }).rows,
    computeSparkline: (shipments, pnlLines, salesId, monthCount) => wasm3.manager_commission_sparkline({
      shipments: shipments || [],
      pnl_lines: pnlLines || [],
      sales_id: salesId || "",
      month_count: monthCount || 0,
      now_ms: Date.now(),
      tz_offset_min: tz(),
      manager_label: managerLabel()
    }).values,
    buildPeriodKey: (mode, date) => wasm3.manager_period_key({ mode: mode || "month", at_ms: msOf(date), tz_offset_min: tz() }).key
  });
  bindCommissionComposer({
    compose: async () => ({ rules: (await wasm3.manager_commission_rules({ all: true })).rules })
  });
  bindCustomer360Composer({
    compose: (customerId, customers, shipments, billing, exceptions) => {
      const reply = wasm3.manager_customer360({
        customer_id: customerId || "",
        customers: customers || [],
        shipments: shipments || [],
        billing: billing || [],
        exceptions: exceptions || [],
        today_ms: Date.now(),
        tz_offset_min: tz(),
        manager_label: managerLabel()
      });
      if (!reply.found) return null;
      return {
        customer: reply.customer,
        lifetimeRevenue: reply.lifetimeRevenue,
        outstanding: reply.outstanding,
        salesRep: reply.salesRep,
        lastTouchDate: reply.lastTouchDate,
        healthScore: reply.healthScore,
        healthBreakdown: reply.healthBreakdown.map((d) => t(d.key, {
          d: d.points,
          n: d.count || d.days,
          pct: d.pct.toFixed(MARGIN_PCT_DIGITS),
          warn: d.warn_pct
        }))
      };
    },
    compose360: (shipments) => wasm3.manager_customer_mode_mix({ shipments: shipments || [] })
  });
  bindDashboardComposer({
    compose: (repo3, period, salesFilter, mode = "All") => wasm3.manager_dashboard({
      period: period || "",
      sales_filter: salesFilter ?? null,
      mode,
      now_ms: Date.now(),
      tz_offset_min: tz()
    })
  });
  bindExceptionComposer({
    computeSortedExceptions: (exceptions) => wasm3.manager_exceptions_sorted({ exceptions: exceptions || [], now_ms: Date.now(), tz_offset_min: tz() }).exceptions,
    computeTrends: (exceptions) => {
      const reply = wasm3.manager_exception_trends({ exceptions: exceptions || [], now_ms: Date.now(), tz_offset_min: tz() });
      return {
        weeks: reply.weeks.map(trendWeekLabel),
        datasets: reply.datasets.map((ds) => ({ label: ds.label_key ? t(ds.label_key) : ds.label, data: ds.data }))
      };
    },
    computeMttr: (exceptions) => wasm3.manager_exception_mttr({ exceptions: exceptions || [], now_ms: Date.now(), tz_offset_min: tz() }).rows.map((r) => ({ type: r.typeKey ? t(r.typeKey) : r.type, avgHours: r.avgHours })),
    computePerSalesRate: (exceptions) => wasm3.manager_exception_per_sales({ exceptions: exceptions || [], now_ms: Date.now(), tz_offset_min: tz() }).rows,
    computeEscalated: (severity) => wasm3.manager_exception_escalate({ severity: severity || "" }).severity
  });
  bindDocumentBoardComposer({
    composeDocumentBoard: (documents, shippingInstructions, arrivalNotices, releaseOrders) => wasm3.manager_document_board({
      documents: documents || [],
      shipping_instructions: shippingInstructions || [],
      arrival_notices: arrivalNotices || [],
      release_orders: releaseOrders || [],
      now_ms: Date.now(),
      tz_offset_min: tz()
    })
  });
  bindDemDetComposer({
    overview: (instances) => wasm3.manager_demdet_overview({ instances: instances || [], now_ms: Date.now(), tz_offset_min: tz() })
  });
  bindManifestComposer({
    overview: (manifests) => wasm3.manager_manifest_overview({ manifests: manifests || [], now_ms: Date.now(), tz_offset_min: tz() })
  });
  bindLedgerAggregator({
    trialBalance: (chart, legsByAccount, asOfDate) => wasm3.manager_ledger_trial_balance({ chart: chart || [], legs_by_account: legsByAccount || {}, as_of_date: asOfDate || "" }),
    pnl: (chart, legsByAccount, dateFrom, dateTo) => wasm3.manager_ledger_pnl({
      chart: chart || [],
      legs_by_account: legsByAccount || {},
      date_from: dateFrom || "",
      date_to: dateTo || ""
    }),
    pnlMonthlyBreakdown: (chart, legsByAccount, year) => wasm3.manager_ledger_pnl_monthly({ chart: chart || [], legs_by_account: legsByAccount || {}, year: Number(year) || 0 }).months,
    balanceSheet: (chart, legsByAccount, asOfDate) => wasm3.manager_ledger_balance_sheet({ chart: chart || [], legs_by_account: legsByAccount || {}, as_of_date: asOfDate || "" }),
    entryTotals: (legs) => wasm3.manager_ledger_entry_totals({ legs: legs || [] })
  });
  bindLedgerComposer({
    groupChartByType: (accounts) => wasm3.manager_ledger_chart_groups({ accounts: accounts || [] }).groups,
    filterLegs: (legs, { dateFrom = "", dateTo = "", minAmount = null, maxAmount = null, search = "" } = {}) => wasm3.manager_ledger_filter_legs({
      legs: legs || [],
      date_from: dateFrom || "",
      date_to: dateTo || "",
      min_amount: minAmount === "" || minAmount == null ? null : Number(minAmount),
      max_amount: maxAmount === "" || maxAmount == null ? null : Number(maxAmount),
      search: search || ""
    }).legs,
    computeRunningBalances: (legs, balanceSide, opening = 0) => wasm3.manager_ledger_running_balances({ legs: legs || [], balance_side: balanceSide || "", opening: Number(opening) || 0 }).legs,
    buildLedgerCSV: (rows) => wasm3.manager_ledger_csv({ rows: rows || [] }).csv
  });
  bindLedgerReconciler({
    runAndRecord: (_ledgerRepo, year) => wasm3.manager_ledger_reconcile({ year: Number(year) || (/* @__PURE__ */ new Date()).getFullYear() }),
    // Boot calls this unawaited: a reconciliation that cannot run must never wedge the boot.
    maybeAutoReconcile: (_ledgerRepo, year) => {
      wasm3.manager_ledger_auto_reconcile({ year: Number(year) || (/* @__PURE__ */ new Date()).getFullYear() }).catch((err) => {
        console.error("[ledger-reconciler] auto-reconcile failed:", err);
      });
    }
  });
  bindLedgerRepost({
    planRepost: (_entityRepo, _ledgerRepo, year) => wasm3.manager_ledger_plan_repost({ year: Number(year) || (/* @__PURE__ */ new Date()).getFullYear() }),
    applyRepost: (_ledgerRepo, plan) => wasm3.manager_ledger_apply_repost({ plan }),
    purgeOrphans: (_ledgerRepo, plan, year) => wasm3.manager_ledger_purge_orphans({ plan, year: Number(year) || (/* @__PURE__ */ new Date()).getFullYear() })
  });
  bindNotificationComposer({
    computeFromEvent: ({ kind = "", id = "" } = {}, entities) => {
      const reply = wasm3.manager_notification_from_event({
        kind,
        id,
        entity: entities?.get?.(`${kind}::${id}`) ?? null,
        manager_label: managerLabel()
      });
      return reply.notification ? stampNotification(reply.notification) : null;
    },
    computeTimeBased: (shipments, today) => wasm3.manager_notifications_time_based({ shipments: shipments || [], now_ms: msOf(today), tz_offset_min: tz() }).notifications.map(stampNotification)
  });
  bindUserAuditLogComposer({
    filterByDateRange: (records, { from = "", to = "" } = {}) => wasm3.manager_audit_log_range({ records: records || [], from, to }).records,
    sortByTimestampDesc: (records) => wasm3.manager_audit_log_sort({ records: records || [] }).records,
    buildAuditLogCsv: (records) => wasm3.manager_audit_log_csv({ records: records || [] }).csv
  });
  bindUsersViewComposer({
    deriveFork: (email) => wasm3.manager_fork({ email: email || "" }).fork,
    // Allocation itself is Rust (freight/core_abstractions/fork.rs); this only feeds it the forks
    // already in use and a random starting suffix, because randomness is the browser's.
    allocateFork: (email, users) => wasm3.fork_allocate(
      email,
      JSON.stringify((users || []).map((u) => u.fork).filter(Boolean)),
      Math.floor(Math.random() * PREFIX_SEED_RANGE)
    ),
    isValidEmail: (email) => wasm3.manager_email_valid({ email: email || "" }).valid,
    filterUsers: (users, { search = "", role = "", activeFilter = "" } = {}) => wasm3.manager_users_filter({ users: users || [], search, role, active_filter: activeFilter }).users,
    sortUsersByEmail: (users) => wasm3.manager_users_sort({ users: users || [] }).users
  });
}
function stampNotification(draft) {
  return {
    id: crypto.randomUUID?.() || `n-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: draft.type,
    title: draft.title,
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    read: false,
    dismissed: false,
    ...draft.entityKind ? { entityKind: draft.entityKind, entityId: draft.entityId } : {}
  };
}

// output/web/js.tmp/bootstrap/compose-ui/governance.js
function raise(reply) {
  if (reply?.error) throw new Error(reply.error);
  return reply;
}
function roleList(roles) {
  return (Array.isArray(roles) ? roles : [roles]).filter(Boolean);
}
function composeGovernance(wasm3) {
  bindRouteGuard({
    routeGuard: (route, roles) => {
      const verdict = wasm3.governance_route_guard({ route: route ?? "", roles: roleList(roles) });
      return verdict.allow ? "allow" : { redirect: verdict.redirect, reason: verdict.reason };
    },
    homeRouteForRole: (roles) => wasm3.governance_home_route({ roles: roleList(roles) }).route,
    filterSidebarItems: (items, roles) => wasm3.governance_filter_sidebar({ items: items || [], roles: roleList(roles) }).items,
    resolveUserRoles: (record) => wasm3.governance_user_roles({ record: record ?? null }).roles,
    normalizeRole: (role) => wasm3.governance_normalize_role({ role: role ?? null }).role,
    // The Rust principal (session_principal, via auth_session_roles) — ONE source, not a boot
    // mirror plus a browser-memory fallback.
    currentUserRoles: () => wasm3.auth_session_roles({}).roles,
    currentUserRole: () => wasm3.auth_session_roles({}).roles[0] || ROLE_READ_ONLY,
    currentUserId: () => wasm3.auth_session_roles({}).token || UNKNOWN_USER_ID,
    currentUserEmail: () => wasm3.auth_session_roles({}).email || ""
  });
  bindActionGuard({
    can: (action) => wasm3.governance_action_guard({ action, roles: [] }).allow,
    allowedActions: () => wasm3.governance_allowed_actions({ roles: [] }).actions
  });
  bindWorkspaceSettings({
    readSettings: async () => (await wasm3.governance_load_settings({ local_only: true })).settings,
    loadWorkspaceSettings: async (wsName) => (await wasm3.governance_load_settings({ workspace: wsName ?? null, local_only: false })).settings,
    saveWorkspaceSettings: async (settings) => {
      const saved = raise(await wasm3.governance_save_settings({ settings }));
      window.__vdg_workspace_settings = saved.settings;
      return saved.settings;
    }
  });
  bindPeriodClose({
    getCurrentPeriodLock: async (_repo, period) => {
      const lock = await wasm3.governance_find_lock({ period_key: period ?? null });
      return lock.locked ? { locked: true, record: lock.record } : { locked: false };
    },
    loadClosedPeriods: async () => (await wasm3.governance_locked_periods({})).keys,
    listCloseRecords: async () => (await wasm3.governance_close_records({})).records,
    runPreCloseChecks: async (_repo, period) => raise(await wasm3.governance_pre_close_checks({ period })).checks,
    closePeriod: async (_repo, period, user, checklist, ledgerRepo3 = null) => raise(await wasm3.governance_close_period({
      period,
      user: user ?? null,
      checklist: checklist ?? [],
      with_ledger: !!ledgerRepo3
    })),
    reopenPeriod: async (_repo, period, reason, user) => raise(await wasm3.governance_reopen_period({ period, reason: reason ?? null, user: user ?? null }))
  });
  bindPeriodLockRegistry({
    readLockedPeriods: async () => (await wasm3.governance_locked_periods({})).locks,
    lockedPeriodKeys: async () => (await wasm3.governance_locked_periods({})).keys,
    findLock: async (_repo, periodKey) => (await wasm3.governance_find_lock({ period_key: periodKey ?? null })).record ?? null,
    lockPeriod: async (_repo, periodKey, user) => raise(await wasm3.governance_lock_period({ period_key: periodKey ?? null, user: user ?? null })).record,
    unlockPeriod: async (_repo, periodKey) => raise(await wasm3.governance_unlock_period({ period_key: periodKey ?? null })).unlocked
  });
  bindPeriodOpeningBalance({
    previousPeriod: (period) => wasm3.governance_period_math({ period: period ?? null }).previous,
    nextPeriod: (period) => wasm3.governance_period_math({ period: period ?? null }).next,
    periodBounds: (period) => {
      const math = wasm3.governance_period_math({ period: period ?? null });
      return math.bounds_start ? { start: math.bounds_start, end: math.bounds_end } : null;
    },
    dayBefore: (date) => wasm3.governance_period_math({ date: date ?? null }).day_before,
    periodOfDate: (date) => wasm3.governance_period_math({ date: date ?? null }).period_of_date,
    isPeriodStart: (date) => wasm3.governance_period_math({ date: date ?? null }).is_period_start,
    openingBalanceFor: (closeRecords, period, accountCode) => {
      const found = wasm3.governance_opening_balance({
        close_records: closeRecords || [],
        period: period ?? null,
        account_code: accountCode ?? ""
      });
      return found.found ? { balance: found.balance, source_period: found.source_period, closed_at: found.closed_at, closed_by: found.closed_by } : null;
    }
  });
  bindDefaultCurrencyLock({
    canEditDefaultCurrency: (shipments, period, periodClosed = false) => wasm3.governance_can_edit_default_currency({
      shipments: shipments || [],
      period: period ?? null,
      period_closed: !!periodClosed
    }),
    periodOf: (date) => wasm3.governance_period_of({ date: date == null ? null : String(date) }).period
  });
  bindErrorLogStore({
    listErrorRecords: async () => (await wasm3.governance_error_records({})).records,
    purgeErrorMonth: async (month) => raise(await wasm3.governance_purge_error_month({ month }))
  });
}

// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/license.js
var LICENSE_STATE_VALID = "valid";
var LICENSE_STATE_INVALID = "invalid";
var LICENSE_STATE_NETWORK = "network";
var LICENSE_STATE_GRACE = "grace";
var LICENSE_STATE_BLOCKED = "blocked";
var _impl13 = null;
function bindLicenseGate(impl) {
  _impl13 = impl;
}
function _i12() {
  if (!_impl13) throw new Error("ui/license: no implementation bound (root bootstrap binds it)");
  return _impl13;
}
var resolveLicenseState = (...a) => _i12().resolveLicenseState(...a);
var errorKindMessage = (...a) => _i12().errorKindMessage(...a);

// output/web/js.tmp/bootstrap/compose-ui/flows-admin.js
var BACKUP_PROGRESS_EVENT = "vdg:backup-progress";
var EMPTY = {};
function unwrap(reply, pick) {
  if (!reply.ok) throw new Error(t(reply.error));
  return pick(reply);
}
function composeFlowsAdmin(wasm3) {
  bindLicenseGate({
    resolveLicenseState: () => wasm3.flows_license_resolve(EMPTY),
    errorKindMessage: (kind, translate = t) => translate(wasm3.flows_license_error_key({ error_kind: kind ?? null }).key)
  });
  bindBackupExporter({
    // The operator emits progress as an i18n KEY plus its arguments; the translation is the ui's.
    exportWorkspace: async (onProgress = () => {
    }) => {
      const relay = (e) => onProgress(e.detail.pct, t(e.detail.key, e.detail.args));
      window.addEventListener(BACKUP_PROGRESS_EVENT, relay);
      try {
        return unwrap(await wasm3.flows_export_workspace(EMPTY), (r) => r.filename);
      } finally {
        window.removeEventListener(BACKUP_PROGRESS_EVENT, relay);
      }
    }
  });
  bindUserProvisioning({
    editProfile: async (userId, fields) => unwrap(await wasm3.flows_edit_profile({ user_id: String(userId), fields: fields || {} }), (r) => r.user)
  });
  bindLedgerPoster({
    buildEntriesFromShipment: (shipment, chart, rules) => unwrap(
      wasm3.flows_build_entries_from_shipment({ source: shipment || {}, chart_of_accounts: chart || [], posting_rules: rules || {} }),
      (r) => r.entries
    ),
    buildEntriesFromCommission: (commissionEntry, chart, rules) => unwrap(
      wasm3.flows_build_entries_from_commission({ source: commissionEntry || {}, chart_of_accounts: chart || [], posting_rules: rules || {} }),
      (r) => r.entries
    ),
    buildReversalEntry: (legs, chart, actorId) => unwrap(
      wasm3.flows_build_reversal_entry({ legs: legs || [], chart_of_accounts: chart || [], actor_id: actorId ?? null }),
      (r) => r.entry
    ),
    postShipment: async (shipment) => unwrap(await wasm3.flows_post_shipment({ shipment: shipment || {} }), (r) => ({ posted: r.posted, entryIds: r.entry_ids })),
    postCommission: async (commissionEntry) => unwrap(await wasm3.flows_post_commission({ commission_entry: commissionEntry || {} }), (r) => ({ posted: r.posted, entryIds: r.entry_ids })),
    postReversal: async (entryId, actorId) => unwrap(
      await wasm3.flows_post_reversal({ entry_id: String(entryId), actor_id: actorId ?? null }),
      (r) => ({ posted: r.posted, entryIds: r.entry_ids })
    )
  });
  bindPnlCommit({
    commitPnlReport: async (report) => unwrap(await wasm3.flows_commit_pnl_report({ report: report || {} }), (r) => ({
      created_shipments: r.created_shipments,
      created_lines: r.created_lines,
      new_customers: r.new_customers,
      new_carriers: r.new_carriers
    })),
    computeAndPersistSalesCommission: async (shipment, pnlLines) => unwrap(
      await wasm3.flows_sales_commission({ shipment: shipment || {}, pnl_lines: pnlLines || [] }),
      (r) => r.persisted
    ),
    slugify: (text) => wasm3.flows_slugify({ text: text ?? null }).slug
  });
}

// output/web/js.tmp/bootstrap/compose-ui/flows.js
var ENTITY_CHANGED_EVENT = "vdg:entity-changed";
var KIND_USER = "user";
var REASON_CANCELLED = "cancelled";
var EMPTY2 = {};
function composeFlows(wasm3) {
  bindSalesRepDerivation({
    deriveSalesRep: ({ routeRep = null, draftRep = null, customerRep = null, selfRep = null } = {}) => wasm3.flows_derive_sales_rep({ route_rep: routeRep, draft_rep: draftRep, customer_rep: customerRep, self_rep: selfRep }).rep,
    selfRepCandidate: (roles, token) => wasm3.flows_self_rep_candidate({ roles: roles || [], token: token ?? null }).rep,
    customerRepFor: (customerName, customers) => wasm3.flows_customer_rep({ customer_name: customerName ?? null, customers: customers || [] }).rep
  });
  bindAirRateCalculator({
    computeChargeableKg: (actual, l, w, h) => wasm3.flows_chargeable_kg({ actual, l, w, h }).chargeable_kg,
    computeFreight: (actual, l, w, h, breaks) => {
      const r = wasm3.flows_air_calc({ actual, l, w, h, breaks: breaks || [] });
      return r.matched ? r.freight_total : null;
    },
    calcResult: (actual, l, w, h, breaks) => {
      const r = wasm3.flows_air_calc({ actual, l, w, h, breaks: breaks || [] });
      return r.matched ? { chargeableKg: r.chargeable_kg, tier: r.tier, freightTotal: r.freight_total } : null;
    }
  });
  bindPnlGate({
    lineVnd: (amount, currency, fxRate, bookCurrency) => wasm3.flows_pnl_line_vnd({
      amount: Number(amount) || 0,
      currency: currency || "",
      fx_rate: Number(fxRate) || 0,
      book_currency: bookCurrency || ""
    }).vnd,
    vndInvariant: (lines, commissionNetAfterTax, bookCurrency) => {
      const r = wasm3.flows_pnl_vnd_invariant({
        lines: lines || [],
        commission_net_after_tax: commissionNetAfterTax || [],
        book_currency: bookCurrency || ""
      });
      return { match: r.match, expected: r.expected, actual: r.actual, delta: r.delta };
    },
    fxDeviation: (currency, fxRate, referenceRate) => {
      const r = wasm3.flows_pnl_fx_deviation({
        currency: currency || "",
        fx_rate: Number(fxRate) || 0,
        reference_rate: referenceRate == null ? null : Number(referenceRate)
      });
      return { flagged: r.flagged, reason: r.reason, deviation: r.deviation, threshold: r.threshold };
    }
  });
  bindQuoteTotals({
    compute: (lines, commissionNetAfterTax) => {
      const r = wasm3.flows_quote_totals({
        lines: (lines || []).map((l) => ({
          vnd_pay: l.vnd_pay || 0,
          vnd_collect: l.vnd_collect || 0,
          pol_pod_side: l.pol_pod_side || ""
        })),
        commission_net_after_tax: commissionNetAfterTax || []
      });
      return {
        sumReceipt: r.sum_receipt,
        sumPayment: r.sum_payment,
        commissionTotal: r.commission_total,
        polReceiptSum: r.pol_receipt_sum,
        podReceiptSum: r.pod_receipt_sum,
        polPaymentSum: r.pol_payment_sum,
        podPaymentSum: r.pod_payment_sum
      };
    }
  });
  bindNoteLines({
    derive: (pnlLineRows, noteType) => wasm3.flows_note_lines({ lines: pnlLineRows || [], note_type: noteType || "" })
  });
  bindFsmIngest({
    registerFsmEntity: (ref, state) => wasm3.flows_register_entity({ entity_id: ref ?? null, state: state ?? null }),
    rehydrateFsmStates: () => wasm3.flows_rehydrate_fsm(EMPTY2),
    persistAdvancedState: (_repo, ref, state) => wasm3.flows_persist_advanced_state({ shipment_ref: ref ?? null, state: state ?? null })
  });
  bindFsmAutoAdvance({
    autoAdvanceShipment: async (_repo, shipment) => (await wasm3.flows_auto_advance({ shipment: shipment || {} })).advanced_to ?? null
  });
  bindJobNoGen({
    assignJobNo: async (_repo, repCode) => (await wasm3.flows_assign_job_no({ rep_code: String(repCode || "") })).job_no,
    formatJobNo: (repCode, localSeq) => wasm3.flows_format_job_no({ rep_code: String(repCode || ""), local_seq: Number(localSeq) || 0 }).job_no,
    nextLocalSeq: async (_repo, repCode) => (await wasm3.flows_next_local_seq({ rep_code: String(repCode || "") })).seq,
    repoMaxSeq: async (_repo, repCode) => (await wasm3.flows_repo_max_seq({ rep_code: String(repCode || "") })).seq
  });
  bindRepCodeRegistry({
    isValidRepCode: (code) => wasm3.flows_rep_code_valid({ code: code ?? null }).valid,
    assignRepCode: async () => (await wasm3.flows_assign_rep_code(EMPTY2)).code,
    ensureRepCode: async (user) => (await wasm3.flows_ensure_rep_code({ user: user || {} })).code,
    // The form's existing contract is a throw carrying the message it shows.
    assertRepCodeAssignable: async (code, ownerId) => {
      const verdict = await wasm3.flows_assert_rep_code({ code: code ?? null, owner_id: ownerId ?? null });
      if (!verdict.ok) throw new Error(t(verdict.error_key));
    }
  });
  bindSalesRegistry({
    // F-46-03: the picker's rows come from the server's safe projection, not the local "user"
    // entity cache (nothing ever wrote that kind — the empty-picker bug). The wasm side still
    // owns shaping, colour-hashing and the 5-minute cache.
    getActiveSalesReps: async () => {
      const { users } = await listUsers({ role: ROLE_SALES_REP });
      return (await wasm3.flows_active_sales_reps({ rows: users || [], force: false })).reps;
    },
    getSalesRepByPrefix: (reps, prefix) => wasm3.flows_sales_rep_by_prefix({ reps: reps || [], prefix: prefix ?? null }).rep,
    clearRegistryCache: () => wasm3.flows_clear_sales_registry(EMPTY2)
  });
  window.addEventListener(ENTITY_CHANGED_EVENT, (e) => {
    if (e.detail?.kind === KIND_USER) wasm3.flows_clear_sales_registry(EMPTY2);
  });
  const analytics = (shipments, lines) => wasm3.flows_sales_analytics({ shipments: shipments || [], lines: lines || [] });
  bindSalesAnalyticsCompute({
    computeKpis: (shipments, lines) => analytics(shipments, lines).kpis,
    computeLeaderboard: (shipments, lines) => analytics(shipments, lines).leaderboard,
    computeTopCustomers: (shipments, lines) => analytics(shipments, lines).top_customers,
    computeLaneHeatmap: (shipments, lines) => analytics(shipments, lines).heatmap,
    computeMonthlyBars: (shipments, lines) => analytics(shipments, lines).monthly_bars,
    computeBillingFunnel: (shipments) => analytics(shipments, []).billing_funnel,
    // Read from the ruleset itself rather than re-typed here — the empty pass is the cheapest
    // way to ask the one source what the rep's cut is.
    commissionPct: analytics([], []).commission_pct
  });
  bindShipmentStateAliases({
    ensureShipmentStateAliases: async () => (await wasm3.flows_ensure_state_aliases(EMPTY2)).rows
  });
  bindShipmentStateMigrator({
    migrateLegacyShipmentState: async (_repo, aliasRows) => {
      const r = await wasm3.flows_migrate_shipment_states({ alias_rows: aliasRows || [] });
      return { found: r.found, migrated: r.migrated, skippedUnresolved: r.skipped_unresolved };
    }
  });
  bindShipmentVoidDelete({
    chooseShipmentAffordance: (shipment) => wasm3.flows_shipment_affordance({ shipment: shipment || {} }).affordance,
    // Two steps on purpose: Rust decides what the caller may do, the view asks, Rust acts.
    runShipmentAffordance: async ({ shipment, canVoid, confirm }) => {
      const plan = wasm3.flows_void_plan({ shipment: shipment || {}, is_manager: Boolean(canVoid) });
      if (!plan.confirmable) return { mutated: false, reason: plan.reason };
      const ok = await confirm(plan.affordance);
      if (!ok) return { mutated: false, reason: REASON_CANCELLED };
      const applied = await wasm3.flows_void_apply({ shipment: shipment || {}, affordance: plan.affordance });
      if (!applied.ok) throw new Error(applied.error);
      return { mutated: true, affordance: plan.affordance };
    }
  });
  bindQuoteOrchestrator({
    generateQuoteId: async (_repo, salesRepId) => {
      const r = await wasm3.flows_generate_quote_id({ sales_rep_id: salesRepId ?? null });
      if (!r.ok) throw new Error(r.error);
      return r.id;
    },
    // F-41: actorId is provenance (created_by, nothing gates on it); salesRepId is the derived
    // commercial owner (SalesRepDerivation) — the two diverge whenever someone other than the
    // customer's assigned rep keys the quote in.
    saveDraft: async (_repo, actorId, salesRepId, formData) => {
      const r = await wasm3.flows_save_quote_draft({ actor_id: actorId ?? null, sales_rep_id: salesRepId ?? null, form: formData || {} });
      if (!r.ok) throw new Error(r.error);
      return { id: r.id, quote: r.quote, pending_manager_approval: r.pending_manager_approval };
    },
    sendToCustomer: async (_repo, quote) => {
      const r = await wasm3.flows_send_quote({ quote: quote || {} });
      if (!r.ok) throw new Error(r.error);
      return r.quote;
    },
    markAccepted: async (_repo, quote) => {
      const r = await wasm3.flows_accept_quote({ quote: quote || {} });
      if (!r.ok) throw new Error(r.error);
      return r.quote;
    },
    checkAlreadyConverted: async (_repo, quoteId) => (await wasm3.flows_quote_converted({ quote_id: quoteId ?? null })).shipment ?? null
  });
  bindQuoteVoidDelete({
    chooseQuoteAffordance: (quote) => wasm3.flows_quote_affordance({ quote: quote || {} }).affordance,
    // Two steps on purpose: Rust decides what the caller may do, the view asks, Rust acts.
    runQuoteAffordance: async ({ quote, canWrite, confirm }) => {
      const plan = wasm3.flows_quote_delete_plan({ quote: quote || {}, can_write: Boolean(canWrite) });
      if (!plan.confirmable) return { mutated: false, reason: plan.reason };
      const ok = await confirm(plan.affordance);
      if (!ok) return { mutated: false, reason: REASON_CANCELLED };
      const applied = await wasm3.flows_quote_delete_apply({ quote: quote || {}, affordance: plan.affordance });
      if (!applied.ok) throw new Error(applied.error);
      return { mutated: true, affordance: plan.affordance };
    }
  });
  composeFlowsAdmin(wasm3);
}

// output/web/js.tmp/implementations/storage/implementations/repos/fx-rate-repo.js
var FxRateStoreRepo = class {
  _repo() {
    const repo3 = window.__vdg_repo;
    if (!repo3?.fx_months_to_ingest) throw new Error("WASM repo not ready");
    return repo3;
  }
  _wasm() {
    const wasm3 = window.__vdg_wasm;
    if (!wasm3?.fx_rate_get) throw new Error("WASM not ready");
    return wasm3;
  }
  async _ensureAllMonthsLoaded() {
    const wasm3 = this._wasm();
    for (const { ym, content } of await this._repo().fx_months_to_ingest()) {
      wasm3.fx_rate_ingest_month(ym, content);
    }
  }
  /** direction: 'Buy'|'Sell' — Circular 200 values assets at the buying rate and liabilities
   *  at the selling rate; every caller states which side it wants. Returns the resolved rate. */
  async getRate(dateStr, pair, direction) {
    await this._ensureAllMonthsLoaded();
    try {
      return this._wasm().fx_rate_get(dateStr, pair, direction);
    } catch (err) {
      throw new Error(`FxRateNotFound: ${err.message}`);
    }
  }
  async appendRate(entryJson, role) {
    await this._ensureAllMonthsLoaded();
    const writes = this._wasm().fx_rate_prepare_append(entryJson, role);
    await this._repo().fx_apply_writes(JSON.stringify(writes));
  }
  invalidateMonth(ym) {
    this._repo().fx_invalidate_month(ym);
  }
  async listByMonth(ym) {
    return await this._repo().fx_list_by_month(ym);
  }
  async listAll() {
    return await this._repo().fx_list_all();
  }
  async deleteEntry(validFrom, validTo, pair) {
    await this._repo().fx_delete_entry(validFrom, validTo, pair);
  }
  // F-29-01: the fx-lookup rules (VND self-pair, Buy/Sell direction requirement, session cache)
  // moved to wasm — fx-lookup.js is core_abstractions (no tech), so it reaches them through this
  // adapter, same as every other wasm call in this class.
  pnlFxLookupPair(currency) {
    return this._wasm().pnl_fx_lookup_pair(currency);
  }
  pnlFxRequireDirection(direction) {
    this._wasm().pnl_fx_require_direction(direction);
  }
  pnlFxCacheGet(dateStr, pair, direction) {
    return this._wasm().pnl_fx_cache_get(dateStr, pair, direction);
  }
  pnlFxCachePut(dateStr, pair, direction, rate) {
    this._wasm().pnl_fx_cache_put(dateStr, pair, direction, rate);
  }
  pnlFxCacheClear() {
    this._wasm().pnl_fx_cache_clear();
  }
};

// output/web/js.tmp/implementations/storage/implementations/repos/awb-repo.js
var AwbStoreRepo = class {
  _repo() {
    const repo3 = window.__vdg_repo;
    if (!repo3?.awb_list_by_month) throw new Error("WASM repo not ready");
    return repo3;
  }
  async listByMonth(ym) {
    return await this._repo().awb_list_by_month(ym);
  }
  async append(awb) {
    await this._repo().awb_append(JSON.stringify(awb));
  }
  async deleteByAwbNo(awbNo, ym) {
    await this._repo().awb_delete(awbNo, ym);
  }
};

// output/web/js.tmp/bootstrap/compose-ui/storage.js
function composeStorageUi() {
  bindFxRateRepo(new FxRateStoreRepo());
  bindAwbRepo(new AwbStoreRepo());
}

// output/web/js.tmp/bootstrap/boot/wasm-loader.js
var cached = null;
var inflight = null;
var BRIDGE_EXPORTS = [
  "vdg_version",
  "process_excel_file",
  "get_validation_errors",
  "apply_fsm_event",
  "get_entity_state",
  "register_entity",
  "drain_events",
  "get_transition_log",
  "import_booking_excel_wasm",
  "verify_license",
  "permission_can_pull",
  "permission_can_push",
  "permission_can_merge",
  "permission_can_push_own_fork",
  "permission_resolve_grants",
  // #28: route/nav authority — route-guard.js reads these; without globalizing them it falls back
  // to window.__vdg_wasm and a boot path that skipped the loader would silently deny every route.
  "access_can_route",
  "access_home_route",
  "access_redirect_for",
  "access_roles_from_record",
  "proposal_propose",
  "proposal_merge",
  "proposal_reject",
  // AC-04: reject round-trip needs the global bridge
  "priced_ref_resolve_on_date",
  "compute_due_soon",
  // F-48-01: payment-due-soon 4-tier ladder shared compute
  "fmt_date_display"
  // F4-d: the one date-display convention, decided in Rust
];
function globalizeBridgeExports(mod) {
  cached = mod;
  for (const name of BRIDGE_EXPORTS) {
    if (typeof mod[name] === "function") {
      window[name] = mod[name];
    }
  }
}
function loadOnce() {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = (async () => {
      const mod = await import(new URL("pkg/vdg_freight.js?v=43e446a3", document.baseURI).href);
      const wasmUrl = new URL("pkg/vdg_freight_bg.wasm?v=43e446a3", document.baseURI).href;
      await mod.default({ module_or_path: wasmUrl });
      cached = mod;
      window.__vdg_wasm = mod;
      globalizeBridgeExports(mod);
      window.dispatchEvent(new Event("vdg:wasm-ready"));
      return mod;
    })();
  }
  return inflight;
}
async function loadWasmOrThrow() {
  try {
    return await loadOnce();
  } catch (err) {
    inflight = null;
    throw err;
  }
}
async function loadWasm() {
  try {
    return await loadOnce();
  } catch (err) {
    console.debug("[wasm-loader]", err);
    inflight = null;
    return null;
  }
}

// output/web/js.tmp/bootstrap/compose-ui/platform.js
function composePlatformUi() {
  bindWasmLoader({ loadWasm });
}

// output/web/js.tmp/bootstrap/compose-ui/index.js
function composeUi(wasm3) {
  composeAuth(wasm3);
  composeCache(wasm3);
  composeData(wasm3);
  composeSync(wasm3);
  composeManager(wasm3);
  composeGovernance(wasm3);
  composeFlows(wasm3);
  composeStorageUi();
  composePlatformUi();
}

// output/web/js.tmp/implementations/ui/bootstrap/views/license/license-gate-screen.js
var LICENSE_GATE_REASON_MISSING = "missing";
var LICENSE_GATE_REASON_INVALID = "invalid";
var LICENSE_GATE_REASON_NETWORK = "network";
var LICENSE_GATE_REASON_BLOCKED = "blocked";
function licenseGateReasonForState(state) {
  if (state.kind === LICENSE_STATE_NETWORK) return LICENSE_GATE_REASON_NETWORK;
  if (state.kind === LICENSE_STATE_INVALID) return LICENSE_GATE_REASON_INVALID;
  if (state.kind === LICENSE_STATE_BLOCKED) return LICENSE_GATE_REASON_BLOCKED;
  return LICENSE_GATE_REASON_MISSING;
}
var RELOAD_BTN_ID2 = "license-gate-reload";
function _title(reason) {
  switch (reason) {
    case LICENSE_GATE_REASON_INVALID:
      return t("license.gate.invalid_title");
    case LICENSE_GATE_REASON_NETWORK:
      return t("license.gate.network_title");
    case LICENSE_GATE_REASON_BLOCKED:
      return t("license.gate.blocked_title");
    default:
      return t("license.gate.missing_title");
  }
}
function _body(reason, errorKind, daysPastExp) {
  switch (reason) {
    case LICENSE_GATE_REASON_INVALID:
      return errorKindMessage(errorKind);
    case LICENSE_GATE_REASON_NETWORK:
      return t("license.gate.network_body");
    case LICENSE_GATE_REASON_BLOCKED:
      return t("license.gate.blocked_body", { d: daysPastExp ?? 0 });
    default:
      return t("license.gate.missing_body");
  }
}
function renderLicenseGateScreen(container, { reason, errorKind = null, daysPastExp = null } = {}) {
  if (!container) return;
  container.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="text-xl font-semibold text-slate-700">${_title(reason)}</div>
      <div class="text-sm text-slate-500 max-w-md">${_body(reason, errorKind, daysPastExp)}</div>
      <button id="${RELOAD_BTN_ID2}"
              class="mt-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
        ${t("license.gate.retry_button")}
      </button>
    </div>`;
  container.querySelector(`#${RELOAD_BTN_ID2}`)?.addEventListener("click", () => location.reload());
}

// output/web/js.tmp/bootstrap/boot/license-boot-gate.js
async function runLicenseGate({ container }) {
  const state = await resolveLicenseState();
  if (state.kind === LICENSE_STATE_VALID || state.kind === LICENSE_STATE_GRACE) {
    window.__vdg_license_status = state.status ?? { state: "active", can_write: true, grace_days_left: 0 };
    if (state.kind === LICENSE_STATE_GRACE) {
      window.dispatchEvent(new CustomEvent("vdg:toast", {
        detail: { kind: "warn", message: t("license.grace.toast", { d: state.status?.grace_days_left ?? 0 }) }
      }));
    }
    return { proceed: true, payload: state.payload };
  }
  renderLicenseGateScreen(container, {
    reason: licenseGateReasonForState(state),
    errorKind: state.error_kind ?? null,
    daysPastExp: state.status?.days_past_exp ?? null
  });
  return { proceed: false };
}

// output/web/js.tmp/bootstrap/boot/boot-fsm.js
var BootState = {
  OPENING_DB: "opening_db",
  LOADING_WASM: "loading_wasm",
  PROVISIONING: "provisioning",
  BUILDING_REPO: "building_repo",
  GATING_LICENSE: "gating_license",
  RENDERING: "rendering",
  READY: "ready",
  // terminal — success
  ERROR: "error"
  // terminal — carries { kind, cause }
};
var BootEvent = {
  DB_OPENED: "db_opened",
  DB_FAILED: "db_failed",
  // onerror / onblocked
  WASM_READY: "wasm_ready",
  WASM_FAILED: "wasm_failed",
  NEEDS_PROVISION: "needs_provision",
  // NOT_PROVISIONED role
  PROVISIONED: "provisioned",
  REPO_BUILT: "repo_built",
  LICENSE_OK: "license_ok",
  LICENSE_GATE: "license_gate",
  // gate withheld proceed (screen shown)
  RENDERED: "rendered",
  AUTH_NEEDED: "auth_needed",
  // Drive 401
  DRIVE_FAILED: "drive_failed"
  // Drive 403 / 5xx / network
};
var BootErrorKind = {
  STORAGE: "storage",
  // IDB open failed/blocked
  APP_LOAD: "app_load",
  // wasm fetch/instantiate failed
  AUTH: "auth",
  // 401 — reconnect
  DRIVE: "drive"
  // 403 / 5xx / network
};
var toError = (kind) => (payload) => ({ state: BootState.ERROR, kind, cause: payload });
var TRANSITIONS = {
  [BootState.OPENING_DB]: {
    [BootEvent.DB_OPENED]: BootState.LOADING_WASM,
    [BootEvent.DB_FAILED]: toError(BootErrorKind.STORAGE)
  },
  [BootState.LOADING_WASM]: {
    [BootEvent.WASM_READY]: BootState.BUILDING_REPO,
    [BootEvent.NEEDS_PROVISION]: BootState.PROVISIONING,
    [BootEvent.WASM_FAILED]: toError(BootErrorKind.APP_LOAD)
  },
  [BootState.PROVISIONING]: {
    [BootEvent.PROVISIONED]: BootState.BUILDING_REPO,
    [BootEvent.AUTH_NEEDED]: toError(BootErrorKind.AUTH),
    [BootEvent.DRIVE_FAILED]: toError(BootErrorKind.DRIVE)
  },
  [BootState.BUILDING_REPO]: {
    [BootEvent.REPO_BUILT]: BootState.GATING_LICENSE,
    [BootEvent.AUTH_NEEDED]: toError(BootErrorKind.AUTH),
    [BootEvent.DRIVE_FAILED]: toError(BootErrorKind.DRIVE)
  },
  [BootState.GATING_LICENSE]: {
    [BootEvent.LICENSE_OK]: BootState.RENDERING,
    [BootEvent.LICENSE_GATE]: BootState.READY
    // gate screen owns the DOM — boot is done, not failed
  },
  [BootState.RENDERING]: {
    [BootEvent.RENDERED]: BootState.READY
  }
};
function createBootFsm(onEnter) {
  let state = BootState.OPENING_DB;
  let meta = {};
  const emit = () => {
    try {
      onEnter?.(state, meta);
    } catch {
    }
  };
  emit();
  return {
    get state() {
      return state;
    },
    get meta() {
      return meta;
    },
    isTerminal() {
      return state === BootState.READY || state === BootState.ERROR;
    },
    dispatch(event, payload) {
      const next = TRANSITIONS[state]?.[event];
      if (next === void 0) return state;
      if (typeof next === "function") {
        const r = next(payload);
        state = r.state;
        meta = r;
      } else {
        state = next;
        meta = payload !== void 0 ? { payload } : {};
      }
      emit();
      return state;
    }
  };
}

// output/web/js.tmp/bootstrap/boot/boot-fsm-view.js
var LOADING_EL_ID = "view-loading";
var PHASE_KEY = {
  [BootState.OPENING_DB]: "boot.opening_db",
  [BootState.LOADING_WASM]: "boot.loading_wasm",
  [BootState.PROVISIONING]: "boot.provisioning",
  [BootState.BUILDING_REPO]: "boot.building_repo",
  [BootState.GATING_LICENSE]: "boot.gating_license",
  [BootState.RENDERING]: "boot.rendering"
};
function renderBootPhase(state) {
  const key = PHASE_KEY[state];
  if (!key) return;
  const el = document.getElementById(LOADING_EL_ID);
  if (!el) return;
  el.textContent = t(key);
  el.hidden = false;
}

// output/web/js.tmp/bootstrap/boot/repo-init-steps.js
var SENTINEL_TOKEN = /^__.*__$/;
function _forkPrefixFromSession() {
  const token = currentSalesRepId();
  return token && !SENTINEL_TOKEN.test(token) ? token.toLowerCase() : null;
}
var CACHE_OP_TIMEOUT_MS = 8e3;
var PREFS_META_KEY2 = "preferences";
var REPO_HANG_SEAM_KEY = "vdg.test.repoHangMs";
var STEP_OPEN_DB = "open-store";
var STEP_WASM_INIT = "wasm-init";
var STEP_BUILD_REPO = "build-repo-stack";
var STEP_LICENSE_GATE = "license-gate";
var STEP_BOOT_APP = "bootApp";
function _storeUnresponsive(tag) {
  window.dispatchEvent(new CustomEvent("vdg:store-locked", { detail: { kind: "unresponsive", tag } }));
  return null;
}
async function runRepoInitBounded(user, stepRef, bootFn, existingDb, onDbOpen) {
  const _hangMs = parseInt(localStorage.getItem(REPO_HANG_SEAM_KEY) || "0", 10);
  const fsm = createBootFsm(renderBootPhase);
  stepRef.value = STEP_OPEN_DB;
  const db = null;
  fsm.dispatch(BootEvent.DB_OPENED);
  stepRef.value = STEP_WASM_INIT;
  const wasmMod = await loadWasmOrThrow();
  fsm.dispatch(BootEvent.WASM_READY);
  if (_hangMs > 0) await new Promise((r) => setTimeout(r, _hangMs));
  stepRef.value = STEP_BUILD_REPO;
  setStoreScope(user.email);
  const serverApi = storageApi();
  const ioPort2 = createIoPort(serverApi, user.email, _forkPrefixFromSession());
  const warmResult = await safeAwait(ioPort2.cache_get_meta("__warm"), CACHE_OP_TIMEOUT_MS, null, "repo-init:sqlite-warm");
  if (!warmResult.ok) return _storeUnresponsive("repo-init:sqlite-warm");
  const repo3 = new wasmMod.WasmEntityRepo(ioPort2);
  window.__vdg_repo = repo3;
  window.__vdg_server_api = serverApi;
  window.__vdg_store = localStore();
  window.__vdg_io = ioPort2;
  wasmMod.freight_app_init(createPlatform({ repo: repo3 }));
  composeUi(wasmMod);
  const rehydrateResult = await safeAwait(rehydrateFsmStates(repo3), CACHE_OP_TIMEOUT_MS, null, "fsm-rehydrate");
  if (!rehydrateResult.ok) return _storeUnresponsive("fsm-rehydrate");
  fsm.dispatch(BootEvent.REPO_BUILT);
  stepRef.value = STEP_LICENSE_GATE;
  const app = document.getElementById("app");
  const gateResult = await runLicenseGate({ container: app });
  if (!gateResult.proceed) {
    fsm.dispatch(BootEvent.LICENSE_GATE);
    return null;
  }
  fsm.dispatch(BootEvent.LICENSE_OK);
  stepRef.value = STEP_BOOT_APP;
  bootFn(user, db);
  fsm.dispatch(BootEvent.RENDERED);
  _deferredInit(user, db, serverApi, repo3);
  return { db, poller: null, auditLog: null };
}
async function _deferredInit(user, db, serverApi, repo3) {
  const store = localStore();
  try {
    if (store) {
      const prefsResult = await safeAwait(
        store.cache_get_meta(PREFS_META_KEY2),
        CACHE_OP_TIMEOUT_MS,
        null,
        "deferred:prefs"
      );
      const locale = prefsResult.ok ? prefsResult.value?.locale || "vi" : "vi";
      if (locale !== "vi") await loadLocale(locale);
    }
    const { startDeltaTick, startOutboxDrain, startHealthPoll } = await import("./sync-schedulers-33U5YCHQ.js");
    startDeltaTick({ getRepo: () => repo3 });
    startOutboxDrain({ getRepo: () => repo3 });
    startHealthPoll();
    const { createAuditLog, createUserAuditLog, installErrorLog } = await import("./sync-trails-DBXQERUK.js");
    window.__vdg_audit_log = createAuditLog({
      getUser: () => window.__vdg_auth?.getCurrentUser?.(),
      getRole: () => currentSalesRepId()
    });
    installErrorLog({ getUser: () => window.__vdg_auth?.getCurrentUser?.(), getVersion: () => APP_VERSION });
    const { startDueSoonChecker } = await import("./sync-due-soon-J6SPOPTI.js");
    startDueSoonChecker({ getSalesId: () => currentSalesRepId() });
    const { LedgerStoreRepo } = await import("./ledger-repo-ZL3HPSXV.js");
    const ledgerRepo3 = new LedgerStoreRepo();
    window.__vdg_ledger_repo = ledgerRepo3;
    bindLedgerRepo(ledgerRepo3);
    const userAuditLog = createUserAuditLog({ getUser: () => window.__vdg_auth?.getCurrentUser?.() });
    window.__vdg_user_audit_log = userAuditLog;
    const { UserStoreRepo: UserServerRepo } = await import("./user-repo-6CO7BZ2N.js");
    window.__vdg_user_repo = new UserServerRepo(userAuditLog);
    const retryPrincipalOnReconnect = () => {
      if (currentRolesResolved()) {
        window.removeEventListener("vdg:server-health", retryPrincipalOnReconnect);
        return;
      }
      wasm2().auth_resolve_principal({ email: user.email }).catch(() => {
      });
    };
    window.addEventListener("vdg:server-health", retryPrincipalOnReconnect);
    wasm2().auth_resolve_principal({ email: user.email }).catch(() => {
    });
  } catch (err) {
    console.warn("[VDG] deferred init error:", err.message);
  }
}
function wasm2() {
  return window.__vdg_wasm;
}

// output/web/js.tmp/bootstrap/boot/repo-diag.js
var DIAG_GLOBAL = "__vdg_diag";
var DIAG_KIND_REPO_INIT_TIMEOUT = "repo-init-timeout";
var DIAG_KIND_REPO_INIT_OK = "repo-init-ok";
function pushDiag(entry) {
  try {
    if (!Array.isArray(window[DIAG_GLOBAL])) window[DIAG_GLOBAL] = [];
    window[DIAG_GLOBAL].push(entry);
  } catch (_) {
  }
}

// output/web/js.tmp/implementations/kernel/core_abstractions/util/visible-deadline.js
var TICK_MS = 1e3;
function visibleDeadline(budgetMs, makeError, tickMs = TICK_MS) {
  let visibleMs = 0;
  let last = nowMs();
  let sliceVisible = isPageVisible();
  let timer = null;
  let offFlip = null;
  const cancel = () => {
    if (timer !== null) {
      stopInterval(timer);
      timer = null;
    }
    if (offFlip) {
      offFlip();
      offFlip = null;
    }
  };
  const promise = new Promise((_resolve, reject) => {
    const settle = () => {
      const now = nowMs();
      if (sliceVisible) visibleMs += now - last;
      last = now;
      sliceVisible = isPageVisible();
      if (visibleMs >= budgetMs) {
        cancel();
        reject(makeError(Math.round(visibleMs)));
      }
    };
    timer = startInterval(settle, tickMs);
    offFlip = onVisibilityChange(settle);
  });
  return { promise, cancel };
}

// output/web/js.tmp/bootstrap/boot/repo-bootstrap.js
var REPO_INIT_TIMEOUT_MS = 3e4;
var RepoInitTimeoutError = class extends Error {
  constructor(step, elapsedMs) {
    super(`Repo init timed out after ${elapsedMs}ms at step: ${step}`);
    this.name = "RepoInitTimeoutError";
    this.step = step;
    this.elapsedMs = elapsedMs;
  }
};
var _singletons = { poller: null, flusher: null, auditLog: null, db: null };
function disposePriorSingletons() {
  try {
    _singletons.poller?.stop?.();
  } catch (e) {
    console.warn("[repo-init] poller stop failed:", e);
  }
  try {
    _singletons.flusher?.destroy?.();
  } catch (e) {
    console.warn("[repo-init] flusher destroy failed:", e);
  }
  _singletons.poller = null;
  _singletons.flusher = null;
  _singletons.auditLog = null;
}
async function runRepoInit(user, bootFn) {
  disposePriorSingletons();
  const startedAt = performance.now();
  const stepRef = { value: "init" };
  const deadline = visibleDeadline(
    REPO_INIT_TIMEOUT_MS,
    (visibleMs) => new RepoInitTimeoutError(stepRef.value, visibleMs)
  );
  const timeoutPromise = deadline.promise;
  const innerPromise = runRepoInitBounded(
    user,
    stepRef,
    bootFn,
    _singletons.db,
    (db) => {
      _singletons.db = db;
    }
  );
  try {
    const singletons = await Promise.race([innerPromise, timeoutPromise]);
    deadline.cancel();
    if (singletons) {
      _singletons.db = singletons.db;
      _singletons.poller = singletons.poller;
      _singletons.flusher = singletons.flusher;
      _singletons.auditLog = singletons.auditLog;
    }
    const elapsedMs = Math.round(performance.now() - startedAt);
    console.info(`[repo-init-ok] elapsedMs=${elapsedMs}`);
    pushDiag({
      kind: DIAG_KIND_REPO_INIT_OK,
      step: stepRef.value,
      elapsedMs,
      ts: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    deadline.cancel();
    if (err?.name === "RepoInitTimeoutError") {
      console.warn(`[repo-init-timeout] step=${err.step} elapsedMs=${err.elapsedMs}`);
      pushDiag({
        kind: DIAG_KIND_REPO_INIT_TIMEOUT,
        step: err.step,
        elapsedMs: err.elapsedMs,
        ts: (/* @__PURE__ */ new Date()).toISOString(),
        errorName: err.name
      });
    }
    throw err;
  }
}

// output/web/js.tmp/bootstrap/boot/repo-init-fallback.js
var RETRY_BTN_ID2 = "repo-init-retry-btn";
var RETRY_BTN_TESTID2 = "repo-init-retry";
function renderRepoInitTimeoutBanner(mount, onRetry) {
  if (!mount) return;
  mount.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="text-xl font-semibold text-slate-700">${t("repo_init_timeout_title")}</div>
      <div class="text-sm text-slate-500">${t("repo_init_timeout_body")}</div>
      <button id="${RETRY_BTN_ID2}" data-testid="${RETRY_BTN_TESTID2}"
              class="mt-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
        ${t("repo_init_retry")}
      </button>
    </div>`;
  mount.querySelector(`#${RETRY_BTN_ID2}`)?.addEventListener("click", () => onRetry());
}

// output/web/js.tmp/implementations/ui/bootstrap/migration-overlay.js
var SHOW_DELAY_MS = 300;
var MIGRATION_EVENT = "vdg:migration";
var _active = 0;
var _el = null;
var _showTimer = null;
function _ensureEl() {
  if (_el || typeof document === "undefined" || !document.body) return _el;
  const style = document.createElement("style");
  style.textContent = "@keyframes vdg-mig-spin{to{transform:rotate(360deg)}}";
  document.head.appendChild(style);
  _el = document.createElement("div");
  _el.id = "vdg-migration-overlay";
  _el.setAttribute("role", "status");
  _el.setAttribute("aria-live", "polite");
  _el.style.cssText = [
    "position:fixed",
    "right:16px",
    "bottom:16px",
    "z-index:9999",
    "display:none",
    "flex-direction:row",
    "align-items:center",
    "gap:10px",
    "padding:10px 14px",
    "border-radius:10px",
    "background:rgba(255,255,255,0.98)",
    "color:#334155",
    "border:1px solid #e2e8f0",
    "box-shadow:0 4px 16px rgba(15,23,42,0.15)",
    "pointer-events:none",
    "font:500 13px/1.4 system-ui,-apple-system,sans-serif"
  ].join(";");
  _el.innerHTML = '<div style="width:18px;height:18px;border:2px solid #cbd5e1;border-top-color:#3b82f6;border-radius:50%;animation:vdg-mig-spin .8s linear infinite"></div><div data-mig-label></div>';
  document.body.appendChild(_el);
  return _el;
}
function _render() {
  const el = _ensureEl();
  if (!el) return;
  if (_active > 0) {
    if (!_showTimer && el.style.display === "none") {
      _showTimer = setTimeout(() => {
        _showTimer = null;
        if (_active > 0) {
          const label = el.querySelector("[data-mig-label]");
          if (label) label.textContent = t("migration.syncing");
          el.style.display = "flex";
        }
      }, SHOW_DELAY_MS);
    }
  } else {
    if (_showTimer) {
      clearTimeout(_showTimer);
      _showTimer = null;
    }
    el.style.display = "none";
  }
}
function initMigrationOverlay() {
  if (typeof window === "undefined") return;
  window.addEventListener(MIGRATION_EVENT, (ev) => {
    _active = Math.max(0, _active + (Number(ev.detail?.delta) || 0));
    _render();
  });
  window.addEventListener("vdg:auth-needs-reconnect", () => {
    _active = 0;
    _render();
  });
}

// output/web/js.tmp/bootstrap/boot/wasm-boot-loader.js
async function loadWasmModule() {
  try {
    return await loadWasmOrThrow();
  } catch (err) {
    if (err instanceof WebAssembly.LinkError || err?.name === "LinkError" || String(err).includes("LinkError")) {
      console.warn("[VDG] WebAssembly LinkError detected (stale cache mismatch). Purging caches and reloading...");
      if (typeof window !== "undefined" && "caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if (typeof navigator !== "undefined" && navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (!sessionStorage.getItem("__wasm_link_reloaded")) {
        sessionStorage.setItem("__wasm_link_reloaded", "1");
        location.reload();
        return new Promise(() => {
        });
      }
    }
    throw err;
  }
}
function handleUnrecognizedBootError(err, mount) {
  console.error("[VDG] boot failed, unrecognized error:", err);
  if (!mount) return;
  mount.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="text-xl font-semibold text-slate-700">${t("view_mount_failed_title")}</div>
      <div class="text-sm text-slate-500">${t("view_mount_failed_network")}</div>
      <button id="boot-error-reload-btn" data-testid="boot-error-reload"
              class="mt-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
        ${t("view_mount_reload")}
      </button>
    </div>`;
  mount.querySelector("#boot-error-reload-btn")?.addEventListener("click", () => healOrReloadViaServiceWorker());
}

// output/web/js.tmp/bootstrap/app-toast.js
var TOAST_DEFAULT_MS = 4e3;
var TOAST_FADE_MS = 300;
var TOAST_MAX_VISIBLE = 4;
(function initToastRenderer() {
  const container = document.createElement("div");
  container.id = "vdg-toast-container";
  container.className = "fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none";
  document.body.appendChild(container);
  const COLORS = {
    success: "bg-green-600",
    error: "bg-red-600",
    warn: "bg-amber-500",
    info: "bg-slate-800"
  };
  function dismiss(el) {
    if (!el.isConnected) return;
    el.classList.add("opacity-0");
    setTimeout(() => el.remove(), TOAST_FADE_MS);
  }
  window.addEventListener("vdg:toast", (e) => {
    const { message, type = "info", duration = TOAST_DEFAULT_MS } = e.detail || {};
    if (!message) return;
    const el = document.createElement("div");
    el.className = `${COLORS[type] || COLORS.info} text-white px-4 py-3 rounded shadow-lg opacity-0 transition-opacity duration-300`;
    el.textContent = message;
    container.appendChild(el);
    while (container.childElementCount > TOAST_MAX_VISIBLE) dismiss(container.firstElementChild);
    requestAnimationFrame(() => el.classList.remove("opacity-0"));
    setTimeout(() => dismiss(el), duration);
  });
})();

// output/web/js.tmp/bootstrap/app.js
(function initTheme() {
  document.documentElement.classList.remove("dark");
})();
var PRINT_ROUTE_RE = /^\/document\/([^/]+)\/print$/;
var NOTE_ROUTE_RE = /^\/note\/([^/]+)\/(debit|credit)$/;
var BUDGET_ROUTE_RE = /^\/shipment\/([^/]+)\/budget$/;
var QUOTE_EDIT_RE = /^\/sales\/quote\/([^/]+)\/edit$/;
function _viewRoot() {
  return freshViewRoot();
}
async function renderView(route) {
  const roles = currentUserRoles();
  const effectiveRole = roles.length ? roles : [normalizeRole(currentUserRole())];
  if (enforceRouteGuard(route, effectiveRole)) return;
  const printMatch = PRINT_ROUTE_RE.exec(route);
  if (printMatch) {
    const root2 = _viewRoot();
    const mod2 = await loadView(() => import("./document-print-OKHWM7XH.js"), root2, route);
    if (!mod2) return;
    await mountView(() => mod2.render(root2, printMatch[1]), root2, route);
    return;
  }
  const noteMatch = NOTE_ROUTE_RE.exec(route);
  if (noteMatch) {
    const root2 = _viewRoot();
    const mod2 = await loadView(() => import("./note-print-GSG2EVRB.js"), root2, route);
    if (!mod2) return;
    await mountView(() => mod2.render(root2, noteMatch[1], noteMatch[2]), root2, route);
    return;
  }
  const budgetMatch = BUDGET_ROUTE_RE.exec(route);
  if (budgetMatch) {
    const root2 = _viewRoot();
    const mod2 = await loadView(() => import("./shipment-budget-print-DPLZVWOV.js"), root2, route);
    if (!mod2) return;
    await mountView(() => mod2.render(root2, budgetMatch[1]), root2, route);
    return;
  }
  const quoteEditMatch = QUOTE_EDIT_RE.exec(route);
  if (quoteEditMatch) {
    const root2 = _viewRoot();
    const mod2 = await loadView(() => import("./sales-quote-new-ODI237IK.js"), root2, route);
    if (!mod2) return;
    await mountView(() => mod2.render(root2, quoteEditMatch[1]), root2, route);
    return;
  }
  if (await tryParamRoute(route)) return;
  const basePath = route.split("?")[0];
  const path = VIEWS[basePath] ? basePath : homeRouteForRole(effectiveRole);
  const root = _viewRoot();
  const mod = await loadView(VIEWS[path], root, path);
  if (!mod) return;
  await mountView(() => mod.render(root), root, path);
}
window.addEventListener("vdg:navigate", (e) => renderView(e.detail.route));
window.addEventListener("vdg:sync-error", (e) => {
  const { kind, period, reason, error } = e.detail || {};
  console.warn(
    `[sync] \u0110\u1ED3ng b\u1ED9 th\u1EA5t b\u1EA1i: ${kind}${period ? `/${period}` : ""} \u2014 ${reason || "kh\xF4ng r\xF5"}`,
    error || ""
  );
});
window.addEventListener("vdg:outbox-drop", (e) => {
  const { kind, id, reason } = e.detail || {};
  console.warn(`[outbox] dropped ${kind}/${id}: ${reason}`);
  window.dispatchEvent(new CustomEvent("vdg:toast", {
    detail: { type: "info", message: t("topbar.sync.toast.schema_drift_drop") }
  }));
});
function _resolveBootFallbackMount() {
  return document.getElementById("view-loading")?.parentElement || document.getElementById("view-root") || document.getElementById("app");
}
function bootApp(user, db) {
  const app = document.getElementById("app");
  if (app && !app.querySelector("vdg-sidebar")) {
    app.innerHTML = `
      <vdg-sidebar></vdg-sidebar>
      <div class="flex-1 flex flex-col min-w-0">
        <vdg-topbar></vdg-topbar>
        <main id="view-root" class="flex-1 overflow-auto scrollbar-thin">
          <div id="view-loading" class="p-6 text-slate-500 text-sm">${t("loading")}</div>
        </main>
      </div>
      <vdg-cmd-palette></vdg-cmd-palette>`;
  }
  initBreakpointListener();
  initKeyboardShortcuts();
  checkVersionBanner(window.__vdg_store);
  initWmaListener();
  initConflictModal();
  initMergeToast();
  const defaultRoute = homeRouteForRole(currentUserRoles().length ? currentUserRoles() : [normalizeRole(currentUserRole())]);
  initRouter(defaultRoute);
  if (window.__vdg_wasm?.vdg_version) {
    console.log("[VDG] WASM version:", window.__vdg_wasm.vdg_version());
  }
  if (new URLSearchParams(location.search).get("debug") === "1") {
    const btn = document.createElement("button");
    btn.textContent = "Refresh Role";
    btn.className = "fixed bottom-4 right-4 z-50 px-3 py-1 bg-slate-700 text-white text-xs rounded";
    btn.onclick = async () => {
      const { detectRoleViaServer } = await import("./auth-gate-BT6ZDZJG.js");
      await detectRoleViaServer(user, { force: true });
      location.reload();
    };
    document.body.appendChild(btn);
  }
}
async function main() {
  const wasmReady = loadWasmModule();
  initMigrationOverlay();
  initStoreLockedScreen();
  initGoogleSignIn(null, null).catch(() => {
  });
  initAccessTokenRefresh({
    // reconnect-chip listener only (no proactive refresh)
    onReconnected: async (user) => {
      const { detectRoleViaServer } = await import("./auth-gate-BT6ZDZJG.js");
      await detectRoleViaServer(user, { force: true });
    }
  });
  try {
    await loadLocale("vi");
  } catch (err) {
    console.warn("[VDG] i18n early load failed, key-fallback:", err.message);
  }
  try {
    await composeStorage();
    const wasm3 = await wasmReady;
    wasm3.freight_app_init(createPlatform({ repo: null }));
    configureAuthPlatform({ renderLoginPage });
    composeAuth(wasm3);
    await requireAuth((user) => runRepoInit(user, bootApp));
  } catch (err) {
    if (err?.name === "RoleProbeTimeoutError") {
      const { renderLoadingBanner } = await import("./auth-fallback-views-6TEABO7S.js");
      renderLoadingBanner(document.getElementById("app"));
      return;
    }
    if (err?.name === "RepoInitTimeoutError" || err?.name === "IdbOpenFailedError") {
      const mount = _resolveBootFallbackMount();
      renderRepoInitTimeoutBanner(mount, () => {
        const user = window.__vdg_auth?.getCurrentUser?.();
        runRepoInit(user, bootApp);
      });
      return;
    }
    if (renderServerGate(_resolveBootFallbackMount(), err, {
      onReconnected: () => location.reload(),
      serverBackend: true,
      onSignIn: () => mountLoginScreen(() => location.reload())
    })) {
      console.error("[VDG] boot stopped on Server", err.status, err.message);
      return;
    }
    handleUnrecognizedBootError(err, _resolveBootFallbackMount());
  }
}
main();
export {
  bootApp,
  navigate
};
