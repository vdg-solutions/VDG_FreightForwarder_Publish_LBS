// output/web/js.tmp/implementations/ui/core_abstractions/ports/data/shipment-repo.js
var KIND_SHIPMENT = "shipment";
var REVENUE_SEEN = "_revenue_seen";
var _impl = null;
function bindShipmentRepo(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/shipment-repo: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var putShipment = (...a) => _i().putShipment(...a);
var putEnvelope = (...a) => _i().putEnvelope(...a);
var getEnvelope = (...a) => _i().getEnvelope(...a);
var listEnvelopes = (...a) => _i().listEnvelopes(...a);
var deleteShipment = (...a) => _i().deleteShipment(...a);
var rollbackShipmentCreate = (...a) => _i().rollbackShipmentCreate(...a);
var overwriteCommissionEntries = (...a) => _i().overwriteCommissionEntries(...a);
var getShipment = (...a) => _i().getShipment(...a);
var listShipments = (...a) => _i().listShipments(...a);

export {
  KIND_SHIPMENT,
  REVENUE_SEEN,
  bindShipmentRepo,
  putShipment,
  putEnvelope,
  getEnvelope,
  listEnvelopes,
  deleteShipment,
  rollbackShipmentCreate,
  overwriteCommissionEntries,
  getShipment,
  listShipments
};
