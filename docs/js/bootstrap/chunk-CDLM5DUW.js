// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/shipment-state-aliases.js
var SHIPMENT_STATES_KIND = "shipment-states";
var SHIPMENT_STATES_SEED_MIGRATION = {
  id: "2026-07-17-shipment-states-v1",
  kind: SHIPMENT_STATES_KIND,
  url: "seed/masters/shipment-states.jsonl",
  key: (row) => row.code
};
var _impl = null;
function bindShipmentStateAliases(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/shipment-state-aliases: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var ensureShipmentStateAliases = (...a) => _i().ensureShipmentStateAliases(...a);

export {
  SHIPMENT_STATES_KIND,
  SHIPMENT_STATES_SEED_MIGRATION,
  bindShipmentStateAliases,
  ensureShipmentStateAliases
};
