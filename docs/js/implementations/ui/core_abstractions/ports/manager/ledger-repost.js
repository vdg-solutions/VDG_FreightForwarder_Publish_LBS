// ledger-repost — port: the manager-triggered stale-leg repost (F-29-24). Planning is read-only;
// applying and purging are the only writes, and each is an explicit manager action.

let _impl = null;

/// Root bootstrap binds { planRepost, applyRepost, purgeOrphans } once.
export function bindLedgerRepost(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/ledger-repost: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (entityRepo, ledgerRepo, year) -> { replacements, unchanged_count, flagged, orphans }
export const planRepost = (...a) => _i().planRepost(...a);
/// (ledgerRepo, plan) -> the audit record of what moved
export const applyRepost = (...a) => _i().applyRepost(...a);
/// (ledgerRepo, plan, year) -> the audit record of what was cleared
export const purgeOrphans = (...a) => _i().purgeOrphans(...a);
