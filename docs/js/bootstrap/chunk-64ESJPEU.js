// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/ar-composer.js
var AR_CURRENT_DAYS = 30;
var AR_BUCKET_31_60 = 60;
var AR_BUCKET_61_90 = 90;
var CREDIT_UTILIZATION_WARN_PCT = 80;
var CREDIT_UTILIZATION_EXCEEDED_PCT = 100;
var _impl = null;
function bindArComposer(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/ar-composer: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var composeAR = (...a) => _i().composeAR(...a);
var composeAP = (...a) => _i().composeAP(...a);
var composeTimeline = (...a) => _i().composeTimeline(...a);

export {
  AR_CURRENT_DAYS,
  AR_BUCKET_31_60,
  AR_BUCKET_61_90,
  CREDIT_UTILIZATION_WARN_PCT,
  CREDIT_UTILIZATION_EXCEEDED_PCT,
  bindArComposer,
  composeAR,
  composeAP,
  composeTimeline
};
