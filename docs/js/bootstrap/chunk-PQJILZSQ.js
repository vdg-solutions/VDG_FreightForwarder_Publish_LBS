// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/air-invoice-composer.js
var KIND_AIR_RATE = "air_rate";
var KIND_AIRLINE_CARRIER = "airline_carrier";
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
  KIND_AIR_RATE,
  KIND_AIRLINE_CARRIER,
  bindAirInvoiceComposer,
  composeAirInvoice
};
