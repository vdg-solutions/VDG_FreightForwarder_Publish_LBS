// action-guard — port: may the signed-in person DO this thing. The decision lives in Rust
// (freight_app operators/governance/action_access.rs, backed by action_policy.rs); the root
// bootstrap binds it, and the ui never sees wasm.
//
// Every fallback here is DENY. Boot blocks on wasm (boot-fsm), so reaching a delegate before the
// binding means something is very wrong — guessing generously would hand out access.

let _impl = null;

/// Root bootstrap binds { can, allowedActions } once.
export function bindActionGuard(impl) { _impl = impl; }

/// (action) -> boolean. Fallback when unbound is FALSE — boot blocks on wasm, so an unbound
/// delegate means something is very wrong and guessing generously hands out access.
export function can(action) {
  return _impl ? _impl.can(action) : false;
}

/// () -> string[] of every action the signed-in person may perform
export function allowedActions() {
  return _impl ? _impl.allowedActions() : [];
}
