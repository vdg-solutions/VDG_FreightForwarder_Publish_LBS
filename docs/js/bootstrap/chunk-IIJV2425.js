// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/air-invoice-composer.js
var _impl = null;
function bindAirInvoiceComposer(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/air-invoice-composer: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var composeAirInvoice = (...a) => _i().composeAirInvoice(...a);

export {
  bindAirInvoiceComposer,
  composeAirInvoice
};
