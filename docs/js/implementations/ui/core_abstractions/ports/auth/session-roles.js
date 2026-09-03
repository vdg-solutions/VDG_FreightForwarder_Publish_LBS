// session-roles — port: what this sign-in session is allowed to do. The root bootstrap binds it to
// the wasm freight_app exports; the ui never sees wasm.
//
// Reads answer the pre-sign-in truth (no token, empty role set) until the bootstrap binds, because
// role-gated chrome mounts before sign-in resolves — it asks, gets the empty answer, and repaints
// on ROLES_RESOLVED_EVENT (F-42-05). Throwing there would take the shell down at first paint.

let _impl = null;

/// Root bootstrap binds { currentAccount, currentRoleToken, currentRoles, currentRolesResolved,
/// hasRole, setResolvedRoles } once.
export function bindSessionRoles(impl) { _impl = impl; }

/// WHO is signed in: the account (lowercased email). This is what a record is stamped with and
/// matched against — the same namespace a rep picker writes into `sales_rep_id`.
///
/// It was `currentSalesRepId()` and returned `currentRoleToken()` below, which for the workspace
/// owner is `__MANAGER__`. Every screen that asked "which of these are mine" compared that against
/// an account and got nothing back.
export const currentAccount = () => (_impl ? _impl.currentAccount() : null);

/// WHERE this session's authority came from: an account, or a sentinel (`__MANAGER__`,
/// `NOT_PROVISIONED`). Not an identity — see `currentAccount` — and not a role either. Nothing in
/// the ui reads it; it is exposed so the two can stay told apart rather than collapse back into
/// one accessor that means whichever the caller assumed.
export const currentRoleToken = () => (_impl ? _impl.currentRoleToken() : null);

/// The roles this session holds. Empty until the ACL record resolves — callers gate on a role,
/// never on emptiness meaning "allow".
export const currentRoles = () => (_impl ? _impl.currentRoles() : []);

/// Whether `currentRoles()`'s emptiness is a DECIDED verdict (a real "no grant" answer) or the
/// probe simply never got one (network down before any verdict was ever written this session) --
/// `session_principal.rs`'s own `resolved()`. `false` before the bootstrap binds is the honest
/// answer: nothing has decided anything yet at that point either.
export const currentRolesResolved = () => (_impl ? _impl.currentRolesResolved() : false);

export const hasRole = (role) => (_impl ? _impl.hasRole(role) : false);

/// Keeps the role token and the role set in lockstep; returns the token.
export const setResolvedRoles = (token, roles) => (_impl ? _impl.setResolvedRoles(token, roles) : token);
