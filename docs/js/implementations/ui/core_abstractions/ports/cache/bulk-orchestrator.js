// bulk-orchestrator — port: bulk repo writes for imports and batch state patches. Every row goes
// through the normal write path (rebase + outbox); what the bulk buys is ONE change event at the
// end instead of one per row. The root bootstrap binds it to the wasm freight_app export.

let _impl = null;

/// Root bootstrap binds { bulkPut } once.
export function bindBulkOrchestrator(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/bulk-orchestrator: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (repo, kind, entities) -> Promise<void>. `repo` is kept in the signature because the views pass
/// it; the write goes through the platform's repo either way.
export const bulkPut = (...a) => _i().bulkPut(...a);
