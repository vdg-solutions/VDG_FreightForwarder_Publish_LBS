// master-merge — port: what differs between two rows of a master table, what the survivor looks
// like, and repointing the back-references before the loser goes. The modal that asks the manager
// to confirm is DOM and lives in the ui.

let _impl = null;

/// Root bootstrap binds { diffFields, mergeRecords, repointRefs } once.
export function bindMasterMerge(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/master-merge: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (target, source) -> [{ field, targetVal, sourceVal }]
export const diffFields = (...a) => _i().diffFields(...a);
/// (target, source) -> the survivor, with the source filling only its holes
export const mergeRecords = (...a) => _i().mergeRecords(...a);
/// (repo, masterKind, sourceId, targetId) -> count of repointed records
export const repointRefs = (...a) => _i().repointRefs(...a);
