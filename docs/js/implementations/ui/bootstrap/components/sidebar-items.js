// Nav item + group data — pure data, no Lit/DOM. Split out of sidebar.js (350-line cap) at the
// same seam sidebar-collapse-state.js already cut: declarations here, rendering/interaction there.
import { ROLE_MANAGER, ROLE_ACCOUNTANT, ROLE_SALES_REP, ROLE_SALES_MANAGER, ROLE_CUSTOMER_SERVICE, ROLE_AUDITOR } from '../../../ui/core_abstractions/roles.js';

// Active nav menu — labelKey resolved via t() at render time; role-filtered per viewer.
export const V1_ITEMS = [
  // #15: matches the /dashboard route-guard entry (nav-gates KEEP-CONSISTENT-WITH-route-guard)
  { group: 'workspace', route: '/dashboard',           labelKey: 'nav.workspace.dashboard',    icon: 'grid',   allowRoles: [ROLE_MANAGER, ROLE_ACCOUNTANT] },
  // #57: matches the /shipments route-guard entry (nav-gates KEEP-CONSISTENT-WITH-route-guard).
  // Was unrestricted here — Accountant/Auditor/ReadOnly all saw a menu item that access_policy.rs
  // now denies them, the exact "visible item that always fails" shape F-57-01 already fixed once.
  { group: 'workspace', route: '/shipments',           labelKey: 'nav.workspace.shipments',    icon: 'ship',
    allowRoles: [ROLE_CUSTOMER_SERVICE, ROLE_AUDITOR, ROLE_SALES_REP, ROLE_SALES_MANAGER, ROLE_MANAGER, ROLE_AUDITOR] },
  // F-14-09 (owner 2026-08-28, international-standard derivation): exception-driven ops is a
  // daily screen in CargoWise/Magaya — past-ETD/missing-doc/overdue-milestone triage, the
  // highest-value of the eight deferred Manager screens. Ordered above "create shipment" — a
  // continuous triage view gets more daily touches than a per-job one-off action. No narrower
  // rule exists for "/manager/exceptions" in access_policy.rs, so it falls to the broad "/manager"
  // rule; allowRoles matches that exactly.
  { group: 'workspace', route: '/manager/exceptions',  labelKey: 'nav.manager.exceptions',     icon: 'alert', allowRoles: [ROLE_MANAGER] },
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
  { group: 'sales',     route: '/sales/quote',         labelKey: 'nav.sales.quotes',                 icon: 'quote',  allowRoles: [ROLE_SALES_REP, ROLE_SALES_MANAGER, ROLE_AUDITOR] },
  // F-14-03 (owner 2026-08-28: "duyệt giá" must reach the UI) — price-override queue existed since
  // E-14 (FSM + quote.rs OVERRIDE_THRESHOLD_PCT), URL-only. allowRoles = access_policy.rs's rule.
  { group: 'sales',     route: '/manager/approvals',   labelKey: 'nav.manager.approvals',            icon: 'alert',  allowRoles: [ROLE_SALES_MANAGER] },
  // F-41 (owner 2026-08-28) — team leaderboard restricted to SalesManager+Accountant; never had a nav entry.
  { group: 'sales',     route: '/sales/analytics',     labelKey: 'nav.sales.analytics',              icon: 'dollar', allowRoles: [ROLE_SALES_MANAGER, ROLE_ACCOUNTANT] },
  // F-57-01: was ungated, so filterSidebarItems showed "P&L Report" to every role including
  // ReadOnly — the view's own manager-only check then bounced them to /dashboard with no
  // explanation. A visible menu item that always fails. Now matches the /manager route-guard
  // prefix (nav-gates KEEP-CONSISTENT-WITH-route-guard).
  { group: 'reports',   route: '/manager/reports/pnl', labelKey: 'nav.reports.pnl_report',     icon: 'dollar', managerOnly: true, allowRoles: [ROLE_MANAGER] },
  // F-23-04: accountant ledger browse — reuses the reports group (R-5 minimal change).
  // F-24-05: allowRoles opens this to Accountant too; managerOnly kept for the F-23-04
  // CDP button-count fixture (27-sidebar-v1-trim.js), superseded by allowRoles below.
  { group: 'reports',   route: '/accounting/ledger',   labelKey: 'nav.reports.ledger',    icon: 'doc', managerOnly: true, allowRoles: [ROLE_MANAGER, ROLE_ACCOUNTANT, ROLE_AUDITOR] },
  // F-23-05: financial reports (TB/P&L/BS) — same reports group; F-24-05 opens to Accountant
  { group: 'reports',   route: '/accounting/reports',  labelKey: 'nav.reports.financial', icon: 'doc', managerOnly: true, allowRoles: [ROLE_MANAGER, ROLE_ACCOUNTANT, ROLE_AUDITOR] },
  // F-14-05 / F1 (owner 2026-08-28) — AR/AP + FX revaluation summary had no nav entry; Manager only,
  // matching the /manager route-guard prefix (Accountant gap flagged, out of scope tonight).
  { group: 'reports',   route: '/manager/finance/cash-flow', labelKey: 'nav.manager.cash_flow', icon: 'dollar', allowRoles: [ROLE_MANAGER] },
  // F-14-08 (owner 2026-08-28, international-standard derivation): commission accrues per
  // shipment, then a monthly payout run settles it — standard practice. Ordered before period
  // close: settlement runs, then the books lock. Owner doctrine (2026-08-29): settling posts to
  // the ledger, so access_policy.rs's "/manager/finance/commissions" rule now also admits
  // Accountant; allowRoles matches that exactly.
  { group: 'reports',   route: '/manager/finance/commissions', labelKey: 'nav.manager.commissions', icon: 'check', allowRoles: [ROLE_MANAGER, ROLE_ACCOUNTANT] },
  // F-14-11 (owner 2026-08-28, international-standard derivation): period close is a mandatory
  // accounting function, and the F1 period-end FX revaluation hooks into exactly this operation —
  // a feature with no way to reach it is not shipped. Ordered last in the monthly close workflow,
  // after commission settlement. No narrower rule for "/manager/finance/close-period" — falls to
  // the broad "/manager" rule; allowRoles matches that exactly.
  { group: 'reports',   route: '/manager/finance/close-period', labelKey: 'nav.manager.close_period', icon: 'lock', allowRoles: [ROLE_MANAGER] },
  // authorization-model.md §4: LBS's detective control — self-approval is never blocked, only
  // recorded and surfaced. allowRoles matches access_policy.rs's own narrower rule for this route
  // exactly (Manager + Auditor, the outside reader a real audit substitutes for a second signer).
  { group: 'reports',   route: '/manager/finance/self-approved-review', labelKey: 'nav.manager.self_approved_review', icon: 'doc', allowRoles: [ROLE_MANAGER, ROLE_AUDITOR] },
  // #31: finance policy the ACCOUNTANT owns (default P&L currency). Not under /manager — that
  // prefix is Manager-only in access_policy.rs, which would lock out the very role that sets it.
  { group: 'reports',   route: '/accounting/settings', labelKey: 'nav.accounting.settings', icon: 'db', managerOnly: true, allowRoles: [ROLE_MANAGER, ROLE_ACCOUNTANT] },
  // Owner 2026-08-28: "masters" grouped these by CODE MODULE, not who uses them together — a rep
  // checks a rate WHILE quoting, not "goes to do masters". Moved beside that workflow, collapsed
  // by default (a lookup, not hourly); SalesRep stays read-only (writes still gated in-page).
  { group: 'sales_reference', route: '/masters/customers',   labelKey: 'nav.masters.customers', icon: 'db',  allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
  { group: 'sales_reference', route: '/masters/local-charges',    labelKey: 'nav.masters.local_charges', icon: 'db', allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
  // E-26 F-26-04: ocean-carrier master, looked up when quoting like local-charges/units
  { group: 'sales_reference', route: '/masters/ocean-carriers',   labelKey: 'nav.masters.ocean_carriers', icon: 'db', allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
  // F-28-15: ocean-tariff priced kind, carrier-joined view — writers mirror ocean-carriers
  { group: 'sales_reference', route: '/masters/ocean-tariff',     labelKey: 'nav.masters.ocean_tariff',   icon: 'db', allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
  { group: 'sales_reference', route: '/masters/units-of-measure', labelKey: 'nav.masters.units',         icon: 'db', allowRoles: [ROLE_SALES_REP, ROLE_MANAGER] },
  // Manager-only config, touched rarely — administering the workspace (role.rs) is a different
  // job from running or pricing the sales team above.
  { group: 'admin',     route: '/manager/commission-rules', labelKey: 'nav.reports.comm_rules', icon: 'check', managerOnly: true, allowRoles: [ROLE_MANAGER] },
  // F-24-04: manager-only user CRUD
  { group: 'admin',     route: '/admin/users',         labelKey: 'nav.admin.users',       icon: 'db',  managerOnly: true },
  // F-29-10: FX admin was route-only (no sidebar entry) — Manager-only config, not a sales lookup.
  { group: 'admin',     route: '/manager/fx-rates',         labelKey: 'nav.masters.fx_rates',       icon: 'db', managerOnly: true, allowRoles: [ROLE_MANAGER] },
  // F-18-11: alias-editor only (writers manager-only, Q3) — no browse value for SalesRep.
  { group: 'admin',     route: '/masters/shipment-states',  labelKey: 'nav.masters.shipment_states', icon: 'db', managerOnly: true, allowRoles: [ROLE_MANAGER] },
  // F-14-12 (owner 2026-08-28, international-standard derivation): standard compliance
  // requirement, but low frequency — belongs behind the collapsed Administration group rather
  // than competing with daily work, so it sits last. No narrower rule for "/manager/audit" in
  // access_policy.rs — falls to the broad "/manager" rule; allowRoles matches that exactly.
  { group: 'admin',     route: '/manager/audit',           labelKey: 'nav.manager.audit',          icon: 'doc', allowRoles: [ROLE_MANAGER] },
];

// Most-used-first: daily ops, sales desk + its lookups, accounting, rare Manager config.
export const V1_GROUPS = [
  { key: 'workspace',       headingKey: 'nav.group.workspace'       },
  { key: 'sales',           headingKey: 'nav.group.sales'           },
  { key: 'sales_reference', headingKey: 'nav.group.sales_reference' },
  { key: 'reports',         headingKey: 'nav.group.reports'         },
  { key: 'admin',           headingKey: 'nav.group.admin'           },
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
//   (analytics promoted to V1_ITEMS 2026-08-28 — no longer hidden)
// ];

// F-15-46 v2-restore: original MANAGER block (minus P&L Report, promoted to v1)
// const HIDDEN_MANAGER_V2 = [
//   { route: '/manager/dashboard',            label: 'Dashboard',          icon: 'grid'   },
//   { route: '/manager/pipeline',             label: 'Pipeline',           icon: 'ship',   sub: true },
//   (approvals promoted to V1_ITEMS 2026-08-28 — no longer hidden)
//   (cash-flow promoted to V1_ITEMS 2026-08-28 — no longer hidden)
//   { route: '/manager/sales',                label: 'Sales & Commission', icon: 'dollar', sub: true },
//   (commissions promoted to V1_ITEMS 2026-08-28 — no longer hidden)
//   (exceptions promoted to V1_ITEMS 2026-08-28 — no longer hidden)
//   { route: '/manager/masters/customers',    label: 'Masters',            icon: 'grid',   sub: true },
//   (close-period promoted to V1_ITEMS 2026-08-28 — no longer hidden)
//   (audit promoted to V1_ITEMS 2026-08-28 — no longer hidden)
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
