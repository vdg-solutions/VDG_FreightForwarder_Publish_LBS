// route-guard — port: what the shell needs to know about the signed-in person and where they may
// go. The decision lives in Rust (freight_app operators/governance/route_access.rs); the root
// bootstrap binds it, and the ui never sees wasm.
//
// Every fallback here is DENY. Boot blocks on wasm (boot-fsm), so reaching a delegate before the
// binding means something is very wrong — guessing generously would hand out access.

/// AC-06: what a user absent from the staff table holds. Not a role — the absence of one.
import { ROLE_READ_ONLY } from '../../roles.js';

export { ROLE_READ_ONLY };
/// Never the dashboard: that route is guarded, and a denied role bounced back to it loops forever.
export const PENDING_ROUTE = '/pending-access';
const REASON_DENIED = 'nav.access.denied';

/// Stamped on anything that has to answer "who did this" — the workspace user prefix, the same
/// token the ledger uses. A ROLE is not an identity: two sales reps share one, so a role-stamped
/// record cannot name either of them.
export const UNKNOWN_USER_ID = 'unknown';

let _impl = null;

/// Root bootstrap binds { routeGuard, homeRouteForRole, filterSidebarItems, resolveUserRoles,
/// normalizeRole, currentUserRoles, currentUserRole, currentUserId } once.
export function bindRouteGuard(impl) { _impl = impl; }

/// (route, roles) -> 'allow' or { redirect, reason }
export function routeGuard(route, roles) {
  if (!_impl) return { redirect: PENDING_ROUTE, reason: REASON_DENIED };
  return _impl.routeGuard(route, roles);
}

/// (roles) -> the landing route for a role set
export function homeRouteForRole(roles) {
  return _impl ? _impl.homeRouteForRole(roles) : PENDING_ROUTE;
}

/// (items, roles) -> the items this role set may see
export function filterSidebarItems(items, roles) {
  return _impl ? _impl.filterSidebarItems(items, roles) : [];
}

/// (userRecord) -> the record's role SET (empty when nobody is provisioned)
export function resolveUserRoles(userRecord) {
  return _impl ? _impl.resolveUserRoles(userRecord) : [];
}

/// (userRecord) -> the record's primary role
export function resolveUserRole(userRecord) {
  return resolveUserRoles(userRecord)[0] || ROLE_READ_ONLY;
}

/// (role) -> a role name the guard recognises
export function normalizeRole(role) {
  return _impl ? _impl.normalizeRole(role) : ROLE_READ_ONLY;
}

/// The boot-populated session snapshot.
export function currentUserRoles() {
  return _impl ? _impl.currentUserRoles() : [];
}

export function currentUserRole() {
  return _impl ? _impl.currentUserRole() : ROLE_READ_ONLY;
}

export function currentUserId() {
  return _impl ? _impl.currentUserId() : UNKNOWN_USER_ID;
}
