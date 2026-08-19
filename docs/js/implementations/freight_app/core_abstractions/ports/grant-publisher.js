// grant-publisher.js — port: the grant publisher use-case as its collaborators call it; the freight_app bootstrap binds
// the operator (operators/manager/grant-publisher.js) behind it. Constants and error shapes are contract and live here.

export const GRANTS_DIR = 'grants';

export const DRIVE_ROLE_READER = 'reader';

export const DRIVE_OP_GRANT_ROLE_FILE = 'grant_role_file';

let _impl = null;

/// The operator registers { grantFileOp, publishGrant, unpublishGrant, backfillGrants } once, from the freight_app bootstrap.
export function bindGrantPublisher(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('freight_app/grant-publisher: no operator bound (the freight_app bootstrap binds it)');
  return _impl;
}

export const grantFileOp = (...a) => _i().grantFileOp(...a);
export const publishGrant = (...a) => _i().publishGrant(...a);
export const unpublishGrant = (...a) => _i().unpublishGrant(...a);
export const backfillGrants = (...a) => _i().backfillGrants(...a);

/// Test seam.
export function _resetGrantPublisher() { _impl = null; }
