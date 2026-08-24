// output/web/js.tmp/implementations/kernel/core_abstractions/util/shipment-phases.js
var SHIPMENT_MAIN_PATH = [
  "Created",
  "BookingConfirmed",
  "InTransit",
  "Arrived",
  "Delivered",
  "Closed"
];
var SHIPMENT_OFF_PATH = ["Cancelled"];
var SHIPMENT_STATES = [...SHIPMENT_MAIN_PATH, ...SHIPMENT_OFF_PATH];
var NEXT_ON_PATH = Object.fromEntries(
  SHIPMENT_MAIN_PATH.map((state, i) => [state, SHIPMENT_MAIN_PATH[i + 1] ? [SHIPMENT_MAIN_PATH[i + 1]] : []])
);
function phaseIndex(state) {
  return SHIPMENT_MAIN_PATH.indexOf(state);
}

export {
  SHIPMENT_MAIN_PATH,
  SHIPMENT_STATES,
  NEXT_ON_PATH,
  phaseIndex
};
