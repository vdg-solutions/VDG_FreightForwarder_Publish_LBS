import {
  ROLE_READ_ONLY
} from "./chunk-V5JGKO5Q.js";

// output/web/js.tmp/implementations/ui/core_abstractions/ports/governance/route-guard.js
var PENDING_ROUTE = "/pending-access";
var REASON_DENIED = "nav.access.denied";
var UNKNOWN_USER_ID = "unknown";
var _impl = null;
function bindRouteGuard(impl) {
  _impl = impl;
}
function routeGuard(route, roles) {
  if (!_impl) return { redirect: PENDING_ROUTE, reason: REASON_DENIED };
  return _impl.routeGuard(route, roles);
}
function homeRouteForRole(roles) {
  return _impl ? _impl.homeRouteForRole(roles) : PENDING_ROUTE;
}
function filterSidebarItems(items, roles) {
  return _impl ? _impl.filterSidebarItems(items, roles) : [];
}
function normalizeRole(role) {
  return _impl ? _impl.normalizeRole(role) : ROLE_READ_ONLY;
}
function currentUserRoles() {
  return _impl ? _impl.currentUserRoles() : [];
}
function currentUserRole() {
  return _impl ? _impl.currentUserRole() : ROLE_READ_ONLY;
}
function currentUserId() {
  return _impl ? _impl.currentUserId() : UNKNOWN_USER_ID;
}
function currentUserEmail() {
  return _impl ? _impl.currentUserEmail() : "";
}

export {
  UNKNOWN_USER_ID,
  bindRouteGuard,
  routeGuard,
  homeRouteForRole,
  filterSidebarItems,
  normalizeRole,
  currentUserRoles,
  currentUserRole,
  currentUserId,
  currentUserEmail
};
