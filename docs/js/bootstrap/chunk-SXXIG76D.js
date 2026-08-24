// output/web/js.tmp/implementations/ui/core_abstractions/ports/data/billing-publish-repo.js
var KIND_BILLING_PUBLISHED = "billing_published";
var _impl = null;
function bindBillingPublish(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/billing-publish-repo: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var publishBilling = (...a) => _i().publishBilling(...a);
var readPublishedFor = (...a) => _i().readPublishedFor(...a);
var currentRevision = (...a) => _i().currentRevision(...a);

export {
  KIND_BILLING_PUBLISHED,
  bindBillingPublish,
  publishBilling,
  readPublishedFor,
  currentRevision
};
