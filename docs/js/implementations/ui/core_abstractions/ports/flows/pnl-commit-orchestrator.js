// pnl-commit-orchestrator — port: persisting a parsed P&L workbook, and the rep's commission on a
// shipment. No commission arithmetic and no id scheme lives on this side.

let _impl = null;

/// Root bootstrap binds { commitPnlReport, computeAndPersistSalesCommission, slugify } once.
export function bindPnlCommit(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/pnl-commit-orchestrator: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (report, repo) -> { created_shipments, created_lines, new_customers, new_carriers }
export const commitPnlReport = (...a) => _i().commitPnlReport(...a);
/// (shipment, pnlLines, repo) -> persists SalesShare + CompanyRetained when anything is owed
export const computeAndPersistSalesCommission = (...a) => _i().computeAndPersistSalesCommission(...a);
/// (text) -> the master-id slug
export const slugify = (...a) => _i().slugify(...a);
