// ledger-reconciler — port: the weekly double-entry validator (F-23-06).

let _impl = null;

/// Root bootstrap binds { runAndRecord, maybeAutoReconcile } once.
export function bindLedgerReconciler(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/ledger-reconciler: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (ledgerRepo, year) -> the run result, already recorded in the reconciliation log. The
/// ledgerRepo argument is kept for call-site compatibility; the use-case holds its own port.
export const runAndRecord = (...a) => _i().runAndRecord(...a);
/// (ledgerRepo, year) -> fire-and-forget: runs only when a week has passed, never throws at boot
export const maybeAutoReconcile = (...a) => _i().maybeAutoReconcile(...a);
