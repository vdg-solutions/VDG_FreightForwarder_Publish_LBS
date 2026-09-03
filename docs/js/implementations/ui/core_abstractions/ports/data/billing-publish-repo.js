// billing-publish-repo — port: what publish hands to Accounting (E-37, F-37-05).
//
// Publishing is not a flag. Accounting is not in the reader set of `_shared/shipments` at all, so
// `publish_state: 'published'` on the envelope shows them nothing — publish has to CREATE a record
// in a folder Accounting was granted, which is `users/{account}/billing_published`.

export const KIND_BILLING_PUBLISHED = 'billing_published';

let _impl = null;

/// Root bootstrap binds { publishBilling, readPublishedFor, currentRevision } once.
export function bindBillingPublish(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/billing-publish-repo: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (repo, shipment, { publishedBy, publishedAt }?) -> the snapshot, as a NEW revision.
/// Throws when the shipment carries no sell side — it was read without access to the revenue fork,
/// and publishing it would invoice zero.
export const publishBilling = (...a) => _i().publishBilling(...a);
/// (repo, shipment) -> every revision published for it, oldest first.
export const readPublishedFor = (...a) => _i().readPublishedFor(...a);
/// (repo, shipment) -> the revision in force, or null when it was never published.
export const currentRevision = (...a) => _i().currentRevision(...a);
