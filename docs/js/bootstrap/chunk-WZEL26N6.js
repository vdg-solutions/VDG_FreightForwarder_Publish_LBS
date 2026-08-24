// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/exception-composer.js
var KIND_EXCEPTION = "exception";
var SEVERITY_BADGE_CLS = {
  Critical: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-slate-100 text-slate-600"
};
var _impl = null;
function bindExceptionComposer(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/exception-composer: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var computeSortedExceptions = (...a) => _i().computeSortedExceptions(...a);
var computeTrends = (...a) => _i().computeTrends(...a);
var computeMttr = (...a) => _i().computeMttr(...a);
var computePerSalesRate = (...a) => _i().computePerSalesRate(...a);
var computeEscalated = (...a) => _i().computeEscalated(...a);

export {
  KIND_EXCEPTION,
  SEVERITY_BADGE_CLS,
  bindExceptionComposer,
  computeSortedExceptions,
  computeTrends,
  computeMttr,
  computePerSalesRate,
  computeEscalated
};
