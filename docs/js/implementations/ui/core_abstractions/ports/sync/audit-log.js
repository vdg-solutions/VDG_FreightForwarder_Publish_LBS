// audit-log — port: what the manager's audit screen needs from the trail. The root bootstrap
// binds it to the wasm freight_app exports; the ui never sees wasm.

let _impl = null;

/// Root bootstrap binds { verifyAuditChain } once.
export function bindAuditLog(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/audit-log: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (rows) -> Promise<[{ actor, id, problem }]> — empty when every actor's chain still holds.
/// A failure to CHECK is not a clean trail: the caller reports "unknown", never "ok".
export const verifyAuditChain = (...a) => _i().verifyAuditChain(...a);
