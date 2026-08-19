// Route guard + sidebar nav filtering — client UX layer only (F-24-05).
// Real enforcement is Drive ACL (F-24-03); this stops a signed-in user from landing on a
// URL or nav item their role has no business seeing. Pattern: role-assignment-service.js
// (DI-free pure helpers + one thin side-effecting wrapper).

import { ROLE_MANAGER, ROLE_SALES_MANAGER, ROLE_SALES_REP, ROLE_CUSTOMER_SERVICE, ROLE_ACCOUNTANT, ROLE_AUDITOR, ROLE_PRICING, ROLE_READ_ONLY } from '../../core_abstractions/roles.js';

const REASON_DENIED     = 'nav.access.denied';
const REASON_REDIRECTED = 'nav.access.redirected';

// #28: the route -> roles TABLE moved to Rust (boundary/access_policy.rs). What stays here is the
// toast copy per guarded area, which is presentation. Keep the prefixes in step with the Rust
// table — the drift guard in f-28-access-policy.test.mjs fails if they diverge.
const ROUTE_TOAST_MAP = [
  { prefix: '/admin', reason: REASON_DENIED },
  // F-57-01: 20 of the 52 routes in app-views.js live under /manager, and the prefix had no
  // entry here at all — `_matchRoute` returned null, which means 'allow' for every signed-in
  // role. Most manager views compensated with their own `if (!hasRole(ROLE_MANAGER))` bounce, but
  // /manager/manifest and /manager/air-invoice never did. One line covers all 20 and demotes
  // the per-view checks from sole defence to redundant backstop.
  { prefix: '/manager', reason: REASON_DENIED },
  // #15: /dashboard (manager KPI shell) had no entry -> 'allow' for every role, so ReadOnly
  // landed on it and QC read it as "everyone is a manager". Data was already blocked; the
  // shell was not.
  { prefix: '/dashboard', reason: REASON_REDIRECTED },
  { prefix: '/accounting', reason: REASON_REDIRECTED },
  { prefix: '/sales', reason: REASON_REDIRECTED },
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
const PENDING_ROUTE      = DEFAULT_HOME_ROUTE;

function _matchRoute(route) {
  return ROUTE_TOAST_MAP.find((e) => route === e.prefix || route.startsWith(e.prefix + '/')) ?? null;
}

/** Landing route for a role set — resolved by Rust, DEFAULT_HOME_ROUTE only if wasm is absent. */
export function homeRouteForRole(roles) {
  const { homeRoute } = _access();
  return typeof homeRoute === 'function' ? homeRoute(_rolesCsv(roles)) : DEFAULT_HOME_ROUTE;
}

// The wasm access-policy bridge. globalizeBridgeExports puts these on window; __vdg_wasm is the
// same module object. Absent = wasm not up yet, and boot blocks on that (boot-fsm), so reaching
// here without it means something is very wrong — deny rather than guess.
function _access() {
  const w = typeof window !== 'undefined' ? window : {};
  return {
    canRoute:    w.access_can_route    ?? w.__vdg_wasm?.access_can_route,
    homeRoute:   w.access_home_route   ?? w.__vdg_wasm?.access_home_route,
    redirectFor: w.access_redirect_for ?? w.__vdg_wasm?.access_redirect_for,
  };
}

function _rolesCsv(roles) {
  return (Array.isArray(roles) ? roles : [roles]).filter(Boolean).join(',');
}

/** Decision comes from Rust; this only shapes it for the caller.
 *  `roles` is the user's role SET (a bare string still works — one-element set). */
export function routeGuard(route, roles) {
  // The bounce target is always reachable. Denying it means enforceRouteGuard navigates to a route
  // that is itself denied, and navigate() dispatches synchronously when the hash already matches —
  // guard → navigate → dispatch → guard … until the tab dies with Out Of Memory (QC 2026-08-09,
  // seen while the wasm policy bridge was briefly unavailable and every route was being denied).
  if (route === PENDING_ROUTE || route.startsWith(`${PENDING_ROUTE}/`)) return 'allow';

  const { canRoute, redirectFor } = _access();
  const csv = _rolesCsv(roles);
  if (typeof canRoute !== 'function') {
    return { redirect: PENDING_ROUTE, reason: REASON_DENIED }; // no policy engine → no access
  }
  if (canRoute(route, csv)) return 'allow';
  const match = _matchRoute(route);
  return {
    redirect: typeof redirectFor === 'function' ? redirectFor(route, csv) : PENDING_ROUTE,
    reason:   match?.reason ?? REASON_DENIED,
  };
}

// ── sidebar nav filtering (AC-05) ────────────────────────────────────────────

/** allowRoles wins when present; managerOnly (legacy, F-23-04/05) falls back to
 *  role === Manager; items with neither are always visible. */
export function filterSidebarItems(items, roles) {
  const held = Array.isArray(roles) ? roles : [roles].filter(Boolean);
  return items.filter((item) => {
    if (item.allowRoles) return item.allowRoles.some((r) => held.includes(r));
    if (item.managerOnly) return held.includes(ROLE_MANAGER);
    return true;
  });
}

// ── current-user role resolution (AC-06) ─────────────────────────────────────

/** userRecord is whatever UserRepo.get(email) resolved (null when not provisioned yet). */
export function resolveUserRole(userRecord) {
  return resolveUserRoles(userRecord)[0] || ROLE_READ_ONLY;
}

/** The record's role SET. Parsed by Rust so the shape rule lives in one place; falls back to the
 *  record's own fields only when wasm is absent (boot blocks before that in practice). */
export function resolveUserRoles(userRecord) {
  if (!userRecord) return [];
  const fn = typeof window !== 'undefined'
    ? (window.access_roles_from_record ?? window.__vdg_wasm?.access_roles_from_record)
    : undefined;
  if (typeof fn === 'function') {
    return fn(JSON.stringify(userRecord)).split(',').filter(Boolean);
  }
  return (Array.isArray(userRecord.roles) ? userRecord.roles : [userRecord.role]).filter(Boolean);
}

/** Reads the boot-populated snapshot (boot/repo-init-steps.js). */
export function currentUserRoles() {
  const fromBoot = window.__vdg_current_user?.roles;
  if (fromBoot?.length) return fromBoot;
  // Sign-in resolved these from admin/users.jsonl before repo-init existed — same source, earlier.
  return window.__vdg_session_roles || [];
}

// #15: boot stamps the rep PREFIX as role until users.jsonl resolves (repo-init-steps step 6:
// `currentSalesRepId() || 'ReadOnly'`) — so for a few seconds a real rep's role is 'NV01',
// not 'SalesRep'. Guarding on the raw value would bounce that rep to the pending screen at
// every cold boot. A prefix means a provisioned users/{prefix} fork exists -> SalesRep.
// The rep-id sentinels (auth-gate.js) are NOT prefixes — they mean no fork -> ReadOnly.
// E-37: this list must hold EVERY assignable role. A role missing from it is not merely unguarded —
// it falls through to the `return ROLE_SALES_REP` below, so a CustomerService user was silently
// normalized into a sales rep and given a rep's nav. Pinned to boundary/role.rs::ALL by
// tests/unit/role-catalog-parity.test.mjs.
const KNOWN_ROLES = [
  ROLE_MANAGER, ROLE_SALES_MANAGER, ROLE_ACCOUNTANT, ROLE_SALES_REP,
  ROLE_CUSTOMER_SERVICE, ROLE_AUDITOR, ROLE_PRICING, ROLE_READ_ONLY,
];
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

/// Stamped on anything that has to answer "who did this" — the workspace user prefix
/// (`users/{prefix}`), the same token the ledger uses. A ROLE is not an identity: two sales
/// reps share one, so a role-stamped record cannot name either of them.
export const UNKNOWN_USER_ID = 'unknown';

export function currentUserId() {
  return window.__vdg_current_user?.user_prefix || UNKNOWN_USER_ID;
}
