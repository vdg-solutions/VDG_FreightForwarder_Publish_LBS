// session-roles.js — what this sign-in session IS allowed to do, and the one announcement that
// it now knows. Session state with no I/O (core); auth-gate.js (operators) is the probe that fills
// it in. The role names are roles.js.
//
// The seam is real, not arithmetic: everything below is session state with no I/O — auth-gate.js
// above it is the network probe that fills that state in.


// F-42-05: role-dependent chrome (the topbar's sales-only "new quote" button, every gated sidebar
// entry) is rendered by components that mount BEFORE sign-in resolves. hasRole() answers the empty
// set at that first paint, and nothing ever told the component to look again — so the wrong shape
// stuck for the whole session (observed live: a Manager session showing the sales-only button).
// Roles change at exactly one place, setResolvedRoles, so that is where the "look again" belongs.
export const ROLES_RESOLVED_EVENT = 'vdg:roles-resolved';

// Resolved role token for the current sign-in session (fork id / sentinel — NOT an authority).
let _resolvedRole = null;
// #28: the actual authority — the role SET, from this user's grant file (or [Manager] for the
// account that OWNS the workspace root, which is the one authority no grant can issue). hasRole()
// used to answer "does the Drive probe sentinel equal __MANAGER__", i.e. it inferred authority
// from which FOLDER the user could see. Two consequences worth keeping straight: a granted Manager
// carries their own fork token and full Manager authority, and the sentinel is a token, not a
// permission — every caller asks hasRole() for the specific role it needs.
let _resolvedRoles = [];

export function currentSalesRepId() {
  return _resolvedRole;
}

/// The roles this session holds. Empty until the ACL record resolves — callers gate on a role,
/// never on emptiness meaning "allow".
export function currentRoles() {
  return [..._resolvedRoles];
}

export function hasRole(role) {
  return _resolvedRoles.includes(role);
}

function _sameRoles(a, b) {
  return a.length === b.length && a.every((r, i) => r === b[i]);
}

/**
 * Keeps the fork token and the role set in lockstep at every assignment point, so no path can set
 * one and forget the other. Roles may be supplied explicitly (from the ACL record) or derived by
 * the caller when there is no record to read.
 */
export function setResolvedRoles(token, roles) {
  const next    = roles || [];
  const changed = !_sameRoles(next, _resolvedRoles);
  _resolvedRole  = token;
  _resolvedRoles = next;
  // Published for the route guard: sign-in resolves the role set long before repo-init builds
  // window.__vdg_current_user, and gating on the later snapshot bounced a real manager to
  // /pending-access on every cold boot (#28 regression, caught on the pilot). Unconditional —
  // enforceRouteGuard reads this snapshot directly, so a repeat resolve must not leave it stale.
  if (typeof window !== 'undefined') {
    window.__vdg_session_roles = [..._resolvedRoles];
    // Only on a real change: the resolver runs on every probe, and a re-render per probe would
    // make the chrome flicker for a role set that never moved.
    if (changed) {
      window.dispatchEvent(new CustomEvent(ROLES_RESOLVED_EVENT, { detail: { roles: [..._resolvedRoles] } }));
    }
  }
  return token;
}
