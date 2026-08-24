// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/shipment-state-migrator.js
var _impl = null;
function bindShipmentStateMigrator(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/shipment-state-migrator: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var migrateLegacyShipmentState = (...a) => _i().migrateLegacyShipmentState(...a);

export {
  bindShipmentStateMigrator,
  migrateLegacyShipmentState
};
