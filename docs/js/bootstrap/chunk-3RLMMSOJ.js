// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/fsm-ingest.js
var _impl = null;
function bindFsmIngest(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/fsm-ingest: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var applyShipmentEvent = (...a) => _i().applyShipmentEvent(...a);
var moveShipmentTo = (...a) => _i().moveShipmentTo(...a);

export {
  bindFsmIngest,
  applyShipmentEvent,
  moveShipmentTo
};
