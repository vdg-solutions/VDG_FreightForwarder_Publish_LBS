// output/web/js.tmp/implementations/kernel/core_abstractions/ports/shipment-mode.js
var _impl = null;
function bindShipmentMode(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("kernel/shipment-mode: no adapter bound (the kernel bootstrap binds it)");
  return _impl;
}
var MODE_STATUS_UNSET = "unset";
var MODE_STATUS_KNOWN = "known";
var MODE_STATUS_UNREAD = "unrecognised";
var MODE_SEA = "sea";
var MODE_AIR = "air";
var resolveMode = (...a) => _i().resolveMode(...a);
var modeCodes = (...a) => _i().modeCodes(...a);
function modeFieldCode(res) {
  return res.status === MODE_STATUS_KNOWN ? res.code : "";
}
function modeLabelKey(res, prefix) {
  return `${prefix}${res.status === MODE_STATUS_KNOWN ? res.code : "unread"}`;
}

export {
  bindShipmentMode,
  MODE_STATUS_UNSET,
  MODE_STATUS_UNREAD,
  MODE_SEA,
  MODE_AIR,
  resolveMode,
  modeCodes,
  modeFieldCode,
  modeLabelKey
};
