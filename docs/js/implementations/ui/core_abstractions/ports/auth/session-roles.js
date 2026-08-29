// session-roles — port: what this sign-in session is allowed to do. The root bootstrap binds it to
// the wasm freight_app exports; the ui never sees wasm.
//
// Reads answer the pre-sign-in truth (no token, empty role set) until the bootstrap binds, because
// role-gated chrome mounts before sign-in resolves — it asks, gets the empty answer, and repaints
// on ROLES_RESOLVED_EVENT (F-42-05). Throwing there would take the shell down at first paint.

let _impl = null;

/// Root bootstrap binds { currentSalesRepId, currentRoles, currentRolesResolved, hasRole,
/// setResolvedRoles } once.
export function bindSessionRoles(impl) { _impl = impl; }

/// The resolved fork token for this session (fork id / sentinel — NOT an authority).
export const currentSalesRepId = () => (_impl ? _impl.currentSalesRepId() : null);

/// The roles this session holds. Empty until the ACL record resolves — callers gate on a role,
/// never on emptiness meaning "allow".
export const currentRoles = () => (_impl ? _impl.currentRoles() : []);

/// Whether `currentRoles()`'s emptiness is a DECIDED verdict (a real "no grant" answer) or the
/// probe simply never got one (network down before any verdict was ever written this session) --
/// `session_principal.rs`'s own `resolved()`. `false` before the bootstrap binds is the honest
/// answer: nothing has decided anything yet at that point either.
export const currentRolesResolved = () => (_impl ? _impl.currentRolesResolved() : false);

export const hasRole = (role) => (_impl ? _impl.hasRole(role) : false);

/// Keeps the fork token and the role set in lockstep; returns the token.
export const setResolvedRoles = (token, roles) => (_impl ? _impl.setResolvedRoles(token, roles) : token);
