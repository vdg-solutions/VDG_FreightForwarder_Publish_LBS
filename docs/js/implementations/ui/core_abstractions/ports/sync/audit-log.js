// audit-log — port: what the manager's audit screen needs from the trail. The root bootstrap
// binds it to the wasm freight_app exports; the ui never sees wasm.

/// The trails a screen can ask about, as boundary values. NOT collection names — the collection is
/// `audit_stores.rs`'s to know, and the ui has never been allowed to name one.
export const AUDIT_TRAIL = Object.freeze({ SHARED: 'shared', REVENUE: 'revenue' });

let _impl = null;

/// Root bootstrap binds { verifyAuditChain } once.
export function bindAuditLog(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/audit-log: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (store) -> Promise<[{ actor, id, problem }]> — empty when every actor's chain still holds.
/// Throws when the trail could not be read: a failure to CHECK is not a clean trail, and the
/// caller reports "unknown", never "ok".
///
/// Takes the store NAME, never rows. The rows are wasm's to read; a chain verified over a copy JS
/// was holding is a verdict about the copy.
export const verifyAuditChain = (...a) => _i().verifyAuditChain(...a);
