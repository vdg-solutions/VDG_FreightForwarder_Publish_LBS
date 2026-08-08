// Route guard + sidebar nav filtering — client UX layer only (F-24-05).
// Real enforcement is Drive ACL (F-24-03); this stops a signed-in user from landing on a
// URL or nav item their role has no business seeing. Pattern: role-assignment-service.js
// (DI-free pure helpers + one thin side-effecting wrapper).

import { navigate } from '../../router.js';
import { t } from '../../i18n/index.js';

export const ROLE_MANAGER    = 'Manager';
export const ROLE_ACCOUNTANT = 'Accountant';
export const ROLE_SALES_REP  = 'SalesRep';
export const ROLE_READ_ONLY  = 'ReadOnly'; // AC-06: default for a user absent from admin/users.jsonl

const TOAST_EVENT       = 'vdg:toast';
const TOAST_TYPE_WARN   = 'warn';
const TOAST_DURATION_MS = 4000;

const REASON_DENIED     = 'nav.access.denied';
const REASON_REDIRECTED = 'nav.access.redirected';

// Prefix -> allowed roles + toast copy. Checked in order, first match wins.
// No match => 'allow' (any authenticated user) — matches the F-24-05 route map exactly.
const ROUTE_ROLE_MAP = [
  { prefix: '/admin',      roles: [ROLE_MANAGER],                    reason: REASON_DENIED },
  // F-57-01: 20 of the 52 routes in app-views.js live under /manager, and the prefix had no
  // entry here at all — `_matchRoute` returned null, which means 'allow' for every signed-in
  // role. Most manager views compensated with their own `if (!isManager())` bounce, but
  // /manager/manifest and /manager/air-invoice never did. One line covers all 20 and demotes
  // the per-view checks from sole defence to redundant backstop.
  { prefix: '/manager',    roles: [ROLE_MANAGER],                    reason: REASON_DENIED },
  // #15: /dashboard (manager KPI shell) had no entry -> 'allow' for every role, so ReadOnly
  // landed on it and QC read it as "everyone is a manager". Data was already blocked; the
  // shell was not.
  { prefix: '/dashboard',  roles: [ROLE_MANAGER, ROLE_ACCOUNTANT],   reason: REASON_REDIRECTED },
  { prefix: '/accounting', roles: [ROLE_ACCOUNTANT, ROLE_MANAGER],    reason: REASON_REDIRECTED },
  { prefix: '/sales',      roles: [ROLE_SALES_REP, ROLE_MANAGER],     reason: REASON_REDIRECTED },
];

// Role -> route to bounce a denied user back to. ReadOnly (and anything unknown) goes to the
// pending-access screen — NEVER '/dashboard': /dashboard is guarded now, a denied role bounced
// back to it would redirect-loop forever.
const ROLE_HOME_ROUTE = {
  [ROLE_MANAGER]:    '/dashboard',
  [ROLE_ACCOUNTANT]: '/accounting/ledger',
  [ROLE_SALES_REP]:  '/sales/me',
  [ROLE_READ_ONLY]:  '/pending-access',
};
const DEFAULT_HOME_ROUTE = '/pending-access';

function _matchRoute(route) {
  return ROUTE_ROLE_MAP.find((e) => route === e.prefix || route.startsWith(e.prefix + '/')) ?? null;
}

export function homeRouteForRole(role) {
  return ROLE_HOME_ROUTE[role] || DEFAULT_HOME_ROUTE;
}

/** Pure decision, no side effects. Returns 'allow' or { redirect, reason }. */
export function routeGuard(route, role) {
  const match = _matchRoute(route);
  if (!match) return 'allow';
  if (match.roles.includes(role)) return 'allow';
  return { redirect: homeRouteForRole(role), reason: match.reason };
}

/** Side-effecting wrapper for app.js::renderView — toast + navigate away.
 *  Returns true when navigation was blocked (caller should stop rendering the route). */
export function enforceRouteGuard(route, role) {
  const decision = routeGuard(route, role);
  if (decision === 'allow') return false;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, {
    detail: { type: TOAST_TYPE_WARN, message: t(decision.reason), duration: TOAST_DURATION_MS },
  }));
  navigate(decision.redirect);
  return true;
}

// ── sidebar nav filtering (AC-05) ────────────────────────────────────────────

/** allowRoles wins when present; managerOnly (legacy, F-23-04/05) falls back to
 *  role === Manager; items with neither are always visible. */
export function filterSidebarItems(items, role) {
  return items.filter((item) => {
    if (item.allowRoles) return item.allowRoles.includes(role);
    if (item.managerOnly) return role === ROLE_MANAGER;
    return true;
  });
}

// ── current-user role resolution (AC-06) ─────────────────────────────────────

/** userRecord is whatever UserRepo.get(email) resolved (null when not provisioned yet). */
export function resolveUserRole(userRecord) {
  return userRecord?.role || ROLE_READ_ONLY;
}

// #15: boot stamps the rep PREFIX as role until users.jsonl resolves (repo-init-steps step 6:
// `currentSalesRepId() || 'ReadOnly'`) — so for a few seconds a real rep's role is 'NV01',
// not 'SalesRep'. Guarding on the raw value would bounce that rep to the pending screen at
// every cold boot. A prefix means a provisioned users/{prefix} fork exists -> SalesRep.
// The rep-id sentinels (auth-gate.js) are NOT prefixes — they mean no fork -> ReadOnly.
const KNOWN_ROLES = [ROLE_MANAGER, ROLE_ACCOUNTANT, ROLE_SALES_REP, ROLE_READ_ONLY];
const REP_ID_SENTINELS = ['NOT_PROVISIONED', 'OTHER'];

export function normalizeRole(role) {
  if (KNOWN_ROLES.includes(role)) return role;
  if (!role || REP_ID_SENTINELS.includes(role)) return ROLE_READ_ONLY;
  return ROLE_SALES_REP;
}

/** Reads the boot-populated snapshot (boot/repo-init-steps.js). */
export function currentUserRole() {
  return window.__vdg_current_user?.role || ROLE_READ_ONLY;
}
