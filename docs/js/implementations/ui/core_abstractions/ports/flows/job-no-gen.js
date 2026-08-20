// job-no-gen — port: the Job No. REP_CODE(4) + LOCAL_SEQ(6), ten digits, minted locally.

/// The shape every Job No has — the form validates against it without a bridge call.
export const JOB_NO_REGEX = /^\d{4}\d{6}$/;

let _impl = null;

/// Root bootstrap binds { assignJobNo, formatJobNo, nextLocalSeq, repoMaxSeq } once.
export function bindJobNoGen(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/job-no-gen: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (repo, repCode) -> job no (lease first, counted max+1 only when no lease can be had)
export const assignJobNo = (...a) => _i().assignJobNo(...a);
/// (repCode, localSeq) -> '0007000042'
export const formatJobNo = (...a) => _i().formatJobNo(...a);
/// (repo, repCode) -> the next counted sequence for this rep code
export const nextLocalSeq = (...a) => _i().nextLocalSeq(...a);
/// (repo, repCode) -> the highest sequence this rep code has already used
export const repoMaxSeq = (...a) => _i().repoMaxSeq(...a);
